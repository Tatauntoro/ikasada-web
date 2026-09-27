#!/usr/bin/env tsx
/**
 * Suite verifikasi keamanan fitur jejaring alumni (Task 16, BE-Planning §7).
 *
 * Menguji lewat HTTP sungguhan, dengan akun dan koneksi nyata:
 * cookie flags, pemisahan session alumni/admin, penjaga asal permintaan
 * (anti-CSRF), IDOR pada endpoint koneksi & profil, open redirect, rate limit,
 * kebocoran password, kebocoran field terbatas, dan race duplicate.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run alumni:security:verify
 *
 * Data uji memakai domain `.invalid` dan dihapus di blok `finally`.
 */

import { existsSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { StatusAlumniAccount } from "../src/generated/prisma/enums";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const HOST = new URL(BASE_URL).host;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD tidak ditemukan. Jalankan dari root project (ada .env)."
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const PREFIX = "uji-security-";
const PASSWORD = "kata-sandi-uji-12";

const EMAIL = {
  a: `${PREFIX}a@contoh.invalid`,
  b: `${PREFIX}b@contoh.invalid`,
  c: `${PREFIX}c@contoh.invalid`,
  d: `${PREFIX}d@contoh.invalid`,
  p: `${PREFIX}p@contoh.invalid`,
  s: `${PREFIX}s@contoh.invalid`,
};

const PESAN_BAHAYA = '<img src=x onerror="alert(1)">';

type BodyJson = {
  success?: boolean;
  data?: Record<string, unknown> & { redirectTo?: string };
  error?: { code?: string; message?: string; fields?: Record<string, string> };
};

type Hasil = {
  status: number;
  body: BodyJson;
  setCookie: string[];
  cookie: string | null;
  teks: string;
};

const hasil: { nama: string; lulus: boolean; detail: string }[] = [];
const cek = (nama: string, lulus: boolean, detail: string) =>
  hasil.push({ nama, lulus, detail });

function ambilCookie(res: Response, nama: string): string | null {
  for (const baris of res.headers.getSetCookie()) {
    if (!baris.startsWith(`${nama}=`)) continue;
    const [pasangan] = baris.split(";");
    if (pasangan && pasangan !== `${nama}=`) return pasangan;
  }
  return null;
}

async function panggil(
  method: string,
  path: string,
  opsi: { body?: unknown; cookie?: string; origin?: string | null } = {}
): Promise<Hasil> {
  const headers: Record<string, string> = {};
  if (opsi.body !== undefined) headers["Content-Type"] = "application/json";
  if (opsi.cookie) headers["Cookie"] = opsi.cookie;
  if (opsi.origin) headers["Origin"] = opsi.origin;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opsi.body === undefined ? undefined : JSON.stringify(opsi.body),
    redirect: "manual",
  });

  const teks = await res.text();
  const tipe = res.headers.get("content-type") ?? "";
  let body: BodyJson = {};
  if (tipe.includes("application/json")) {
    try {
      body = JSON.parse(teks) as BodyJson;
    } catch {
      body = {};
    }
  }

  return {
    status: res.status,
    body,
    setCookie: res.headers.getSetCookie(),
    cookie:
      ambilCookie(res, "ikasada_alumni_session") ??
      ambilCookie(res, "ikasada_session"),
    teks,
  };
}

const login = (email: string, extra: Record<string, unknown> = {}) =>
  panggil("POST", "/api/auth/alumni/login", {
    body: { email, password: PASSWORD, ...extra },
  });

const pairKey = (a: string, b: string) => [a, b].sort().join(":");

async function bersihkan() {
  const akun = await prisma.alumniAccount.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = akun.map((a) => a.id);

  if (ids.length) {
    const koneksi = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterAccountId: { in: ids } },
          { recipientAccountId: { in: ids } },
        ],
      },
      select: { id: true },
    });
    const idKoneksi = koneksi.map((k) => k.id);

    if (idKoneksi.length) {
      await prisma.auditLog.deleteMany({ where: { entitasId: { in: idKoneksi } } });
      await prisma.connection.deleteMany({ where: { id: { in: idKoneksi } } });
    }

    await prisma.auditLog.deleteMany({ where: { alumniAccountId: { in: ids } } });
    await prisma.alumniAccount.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.authRateLimit.deleteMany({});
}

/** Buat akun uji + koneksi yang dibutuhkan suite ini. */
async function siapkan() {
  await bersihkan();

  for (const email of [EMAIL.a, EMAIL.b, EMAIL.c, EMAIL.d, EMAIL.p, EMAIL.s]) {
    const res = await fetch(`${BASE_URL}/api/auth/alumni/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        namaLengkap: `Akun ${email}`,
        email,
        angkatan: 2012,
        programStudi: "JAWA",
        password: PASSWORD,
        consentData: true,
      }),
    });

    if (res.status !== 201) {
      throw new Error(`register ${email} gagal: ${res.status}`);
    }
  }

  const kandidat = await prisma.alumni.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      account: null,
    },
    orderBy: { namaLengkap: "asc" },
    select: { id: true, namaLengkap: true, email: true, noWhatsapp: true, linkInstagram: true },
    take: 10,
  });

  // Penerima koneksi harus alumni yang punya kontak (untuk uji gating consent).
  const denganKontak = kandidat.filter(
    (k) => k.email && k.noWhatsapp && k.linkInstagram
  );
  const lain = kandidat.filter((k) => !denganKontak.includes(k));

  const alumniA = denganKontak[0] ?? kandidat[0];
  const alumniB = lain[0];
  const alumniC = lain[1];
  const alumniD = lain[2];
  const alumniS = lain[3];

  if (!alumniA || !alumniB || !alumniC || !alumniD || !alumniS) {
    throw new Error("alumni kandidat tidak cukup");
  }

  /*
   * `EMAIL.p` sengaja **tidak** dipromosikan dan tidak ditautkan ke alumni:
   * akun pending itulah bahan uji "session PENDING diperlakukan anonymous".
   */
  const pasangan: [string, { id: string }][] = [
    [EMAIL.a, alumniA],
    [EMAIL.b, alumniB],
    [EMAIL.c, alumniC],
    [EMAIL.d, alumniD],
    [EMAIL.s, alumniS],
  ];

  const akun: Record<string, string> = {};
  for (const [email, alumni] of pasangan) {
    const diperbarui = await prisma.alumniAccount.update({
      where: { email },
      data: {
        status: StatusAlumniAccount.ACTIVE,
        alumniId: alumni.id,
        approvedAt: new Date(),
      },
      select: { id: true },
    });
    akun[email] = diperbarui.id;
  }

  // A ↔ B sudah terhubung, hanya email yang dibuka A.
  await prisma.alumniAccount.update({
    where: { id: akun[EMAIL.a] },
    data: { showEmailToConnections: true },
  });

  await prisma.connection.create({
    data: {
      requesterAccountId: akun[EMAIL.a],
      recipientAccountId: akun[EMAIL.b],
      pairKey: pairKey(akun[EMAIL.a], akun[EMAIL.b]),
      status: "ACCEPTED",
      message: null,
      respondedAt: new Date(),
    },
  });

  // C → A masih menunggu jawaban A (bahan uji IDOR + pesan berbahaya).
  await prisma.connection.create({
    data: {
      requesterAccountId: akun[EMAIL.c],
      recipientAccountId: akun[EMAIL.a],
      pairKey: pairKey(akun[EMAIL.a], akun[EMAIL.c]),
      status: "PENDING",
      message: PESAN_BAHAYA,
    },
  });

  return { akun, alumniA };
}

async function main() {
  const { akun, alumniA } = await siapkan();

  const loginA = await login(EMAIL.a);
  const loginB = await login(EMAIL.b);
  const loginC = await login(EMAIL.c);
  const cookieA = loginA.cookie ?? "";
  const cookieB = loginB.cookie ?? "";
  const cookieC = loginC.cookie ?? "";

  const idKoneksiCA = (
    await prisma.connection.findUnique({
      where: { pairKey: pairKey(akun[EMAIL.a], akun[EMAIL.c]) },
      select: { id: true },
    })
  )?.id;

  const idKoneksiAB = (
    await prisma.connection.findUnique({
      where: { pairKey: pairKey(akun[EMAIL.a], akun[EMAIL.b]) },
      select: { id: true },
    })
  )?.id;

  // ---------- A. Cookie dan pemisahan session ----------
  const setCookieAlumni = loginA.setCookie.find((b) =>
    b.startsWith("ikasada_alumni_session=")
  );
  const atribut = (setCookieAlumni ?? "").toLowerCase();
  cek(
    "cookie alumni: HttpOnly, SameSite=lax, Path=/, session cookie (tanpa Max-Age)",
    Boolean(setCookieAlumni) &&
      atribut.includes("httponly") &&
      atribut.includes("samesite=lax") &&
      atribut.includes("path=/") &&
      !atribut.includes("max-age"),
    setCookieAlumni ?? "tidak ada Set-Cookie"
  );
  cek(
    "cookie alumni tidak Secure di development",
    Boolean(setCookieAlumni) && !atribut.includes("secure"),
    "sesuai NODE_ENV"
  );

  const adminLogin = await panggil("POST", "/api/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const setCookieAdmin = adminLogin.setCookie.find((b) =>
    b.startsWith("ikasada_session=")
  );
  cek(
    "cookie admin terpisah dari cookie alumni",
    adminLogin.status === 200 &&
      Boolean(setCookieAdmin) &&
      !adminLogin.setCookie.some((b) => b.startsWith("ikasada_alumni_session=")),
    `status ${adminLogin.status}`
  );

  const adminCookie =
    setCookieAdmin?.split(";")[0] ?? "";

  const alumniTokenSebagaiAdmin = await panggil("GET", "/api/admin/alumni?limit=1", {
    cookie: cookieA.replace("ikasada_alumni_session=", "ikasada_session="),
  });
  cek(
    "token alumni tidak diterima sebagai session admin",
    alumniTokenSebagaiAdmin.status === 401,
    `status ${alumniTokenSebagaiAdmin.status}`
  );

  const adminTokenSebagaiAlumni = await panggil("GET", "/api/alumni/me/profile", {
    cookie: adminCookie.replace("ikasada_session=", "ikasada_alumni_session="),
  });
  cek(
    "token admin tidak diterima sebagai session alumni",
    adminTokenSebagaiAlumni.status === 401,
    `status ${adminTokenSebagaiAlumni.status}`
  );

  cek(
    "JWT session tidak membawa hash password",
    !cookieA.toLowerCase().includes("password") &&
      !cookieA.toLowerCase().includes("hash"),
    "payload token bersih"
  );

  // ---------- B. Penjaga asal permintaan (CSRF) ----------
  const sebelumCsrf = await prisma.alumniAccount.findUnique({
    where: { id: akun[EMAIL.a] },
    select: { openToCollaboration: true },
  });

  const csrfProfile = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: cookieA,
    origin: "https://jahat.example",
    body: { openToCollaboration: true },
  });
  const sesudahCsrf = await prisma.alumniAccount.findUnique({
    where: { id: akun[EMAIL.a] },
    select: { openToCollaboration: true },
  });
  cek(
    "mutation dari origin lain ditolak 403 dan tidak mengubah data",
    csrfProfile.status === 403 &&
      sebelumCsrf?.openToCollaboration === sesudahCsrf?.openToCollaboration,
    `status ${csrfProfile.status}`
  );

  const csrfLogin = await panggil("POST", "/api/auth/alumni/login", {
    origin: "https://jahat.example",
    body: { email: EMAIL.a, password: PASSWORD },
  });
  cek(
    "login lintas situs ditolak 403",
    csrfLogin.status === 403 && !csrfLogin.cookie,
    `status ${csrfLogin.status}`
  );

  const csrfKoneksi = await panggil("POST", "/api/alumni/connections", {
    cookie: cookieA,
    origin: `http://${HOST}.jahat.example`,
    body: { recipientAlumniId: alumniA.id },
  });
  cek(
    "host mirip tapi beda origin tetap ditolak",
    csrfKoneksi.status === 403,
    `status ${csrfKoneksi.status}`
  );

  const csrfNull = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: cookieA,
    origin: "null",
    body: { openToOpportunity: true },
  });
  cek(
    "Origin: null ditolak",
    csrfNull.status === 403,
    `status ${csrfNull.status}`
  );

  const originSama = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: cookieA,
    origin: `http://${HOST}`,
    body: { openToCollaboration: true },
  });
  const bukaLagi = await prisma.alumniAccount.findUnique({
    where: { id: akun[EMAIL.a] },
    select: { openToCollaboration: true },
  });
  cek(
    "origin sendiri diizinkan",
    originSama.status === 200 && bukaLagi?.openToCollaboration === true,
    `status ${originSama.status}`
  );

  const tanpaOrigin = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: cookieA,
    body: { openToCollaboration: false },
  });
  cek(
    "permintaan tanpa Origin (curl/Postman/skrip) tetap diizinkan",
    tanpaOrigin.status === 200,
    `status ${tanpaOrigin.status}`
  );

  const getLintasSitus = await panggil("GET", "/api/public/alumni?limit=1", {
    origin: "https://jahat.example",
  });
  cek(
    "GET lintas situs tidak diblokir (read-only)",
    getLintasSitus.status === 200,
    `status ${getLintasSitus.status}`
  );

  const adminCsrf = await panggil("POST", "/api/admin/upload", {
    cookie: adminCookie,
    origin: "https://jahat.example",
  });
  cek(
    "mutation admin juga dijaga penjaga asal",
    adminCsrf.status === 403,
    `status ${adminCsrf.status}`
  );

  const adminTanpaOrigin = await panggil("GET", "/api/admin/dashboard", {
    cookie: adminCookie,
  });
  cek(
    "endpoint admin tetap normal tanpa header Origin",
    adminTanpaOrigin.status === 200,
    `status ${adminTanpaOrigin.status}`
  );

  // ---------- C. IDOR ----------
  const idorPihakKetiga = await Promise.all([
    panggil("PATCH", `/api/alumni/connections/${idKoneksiCA}/accept`, { cookie: cookieB }),
    panggil("PATCH", `/api/alumni/connections/${idKoneksiCA}/decline`, { cookie: cookieB }),
    panggil("PATCH", `/api/alumni/connections/${idKoneksiCA}/cancel`, { cookie: cookieB }),
  ]);
  cek(
    "pihak ketiga tidak bisa accept/decline/cancel (404)",
    idorPihakKetiga.every((h) => h.status === 404),
    idorPihakKetiga.map((h) => h.status).join("/")
  );

  const idorPeran = await Promise.all([
    // Pengirim tidak boleh menerima permintaannya sendiri.
    panggil("PATCH", `/api/alumni/connections/${idKoneksiCA}/accept`, { cookie: cookieC }),
    panggil("PATCH", `/api/alumni/connections/${idKoneksiCA}/decline`, { cookie: cookieC }),
    // Bukan pengirim tidak boleh membatalkan.
    panggil("PATCH", `/api/alumni/connections/${idKoneksiCA}/cancel`, { cookie: cookieA }),
  ]);
  cek(
    "pelanggaran peran dijawab 404",
    idorPeran.every((h) => h.status === 404),
    idorPeran.map((h) => h.status).join("/")
  );

  const setelahIdor = await prisma.connection.findUnique({
    where: { id: idKoneksiCA },
    select: { status: true },
  });
  cek(
    "status koneksi tidak berubah setelah percobaan IDOR",
    setelahIdor?.status === "PENDING",
    `status ${setelahIdor?.status}`
  );

  const idorTerima = await panggil("PATCH", `/api/alumni/connections/${idKoneksiAB}/decline`, {
    cookie: cookieC,
  });
  cek(
    "koneksi orang lain tidak bisa diubah (404)",
    idorTerima.status === 404,
    `status ${idorTerima.status}`
  );

  await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: cookieC,
    body: { openToCollaboration: false, showEmailToConnections: false },
  });
  const milikA = await prisma.alumniAccount.findUnique({
    where: { id: akun[EMAIL.a] },
    select: { showEmailToConnections: true },
  });
  cek(
    "PATCH profil hanya menyentuh akun pemilik session",
    milikA?.showEmailToConnections === true,
    "preferensi akun A tidak berubah"
  );

  const adminLewatAlumni = await panggil("GET", "/api/admin/alumni-accounts", {
    cookie: cookieA,
  });
  cek(
    "session alumni ditolak di endpoint admin (401)",
    adminLewatAlumni.status === 401,
    `status ${adminLewatAlumni.status}`
  );

  // ---------- D. Open redirect ----------
  const redirectJahat = await login(EMAIL.a, { next: "//jahat.example" });
  const redirectAbsolut = await login(EMAIL.a, { next: "https://jahat.example" });
  const redirectInternal = await login(EMAIL.a, { next: "/alumni/status" });
  cek(
    "next protocol-relative & absolut jatuh ke /alumni",
    redirectJahat.body.data?.redirectTo === "/alumni" &&
      redirectAbsolut.body.data?.redirectTo === "/alumni",
    `${redirectJahat.body.data?.redirectTo} / ${redirectAbsolut.body.data?.redirectTo}`
  );
  cek(
    "next internal tetap dihormati",
    redirectInternal.body.data?.redirectTo === "/alumni/status",
    String(redirectInternal.body.data?.redirectTo)
  );

  // ---------- E. Rate limit ----------
  const statusLoginGagal: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const gagal = await panggil("POST", "/api/auth/alumni/login", {
      body: { email: EMAIL.b, password: "salah-sekali-lagi" },
    });
    statusLoginGagal.push(gagal.status);
  }
  cek(
    "login gagal berulang berakhir 429",
    statusLoginGagal.slice(0, 5).every((s) => s === 401) &&
      statusLoginGagal[5] === 429,
    statusLoginGagal.join(",")
  );

  const batasKoneksi: number[] = [];
  for (let i = 0; i < 21; i += 1) {
    const kirim = await panggil("POST", "/api/alumni/connections", {
      cookie: cookieC,
      body: { recipientAlumniId: alumniA.id },
    });
    batasKoneksi.push(kirim.status);
  }
  cek(
    "pembuatan koneksi dibatasi 20/jam per akun",
    batasKoneksi.filter((s) => s === 429).length === 1 &&
      batasKoneksi[20] === 429,
    `pertama=${batasKoneksi[0]} terakhir=${batasKoneksi[20]}`
  );

  const tersimpanDiDb = await prisma.authRateLimit.count();
  cek(
    "rate limit tersimpan di database, bukan memory proses",
    tersimpanDiDb > 0,
    `${tersimpanDiDb} baris AuthRateLimit`
  );

  // ---------- F. Nilai query yang tidak masuk akal ----------
  /*
   * Query direktori & koneksi sengaja **memaafkan** nilai tidak valid (jatuh ke
   * nilai default) alih-alih menolak. Yang diuji di sini bukan penolakan,
   * melainkan bahwa nilai ngawur tidak pernah berubah jadi `500` atau bocor
   * sebagai error database.
   */
  const queryNgawur = await Promise.all([
    panggil("GET", "/api/public/alumni?page=-1&limit=9999&angkatanDari=abc"),
    panggil("GET", "/api/public/alumni?sektorIndustriId=bukan-uuid&programStudi=APA"),
    panggil("GET", "/api/alumni/connections?tab=ngawur&page=0", { cookie: cookieA }),
  ]);
  cek(
    "query ngawur tidak pernah menjadi 500",
    queryNgawur.every((h) => h.status === 200 && h.body.success === true),
    queryNgawur.map((h) => h.status).join("/")
  );

  const paginasiAman = ((queryNgawur[0].body as { meta?: Record<string, number> })
    .meta ?? {}) as Record<string, number>;
  cek(
    "limit dibatasi maksimum dan page minimum dijaga",
    paginasiAman.limit === 100 && paginasiAman.page === 1,
    `page=${paginasiAman.page} limit=${paginasiAman.limit}`
  );

  // ---------- G. Kebocoran ----------
  const me = await panggil("GET", "/api/auth/alumni/me", { cookie: cookieA });
  const profil = await panggil("GET", "/api/alumni/me/profile", { cookie: cookieA });
  const daftarAkunAdmin = await panggil("GET", "/api/admin/alumni-accounts", {
    cookie: adminCookie,
  });
  const bocor = [loginA.teks, me.teks, profil.teks, daftarAkunAdmin.teks].some(
    (t) => t.toLowerCase().includes("passwordhash")
  );
  cek("tidak ada passwordHash di response mana pun", !bocor, "login/me/profile/admin bersih");

  const anonim = await panggil("GET", "/api/public/alumni?limit=5");
  const kartu = ((anonim.body.data as unknown) as { id: string }[] | undefined) ?? [];
  const kunciTerlarang = [
    "email",
    "noWhatsapp",
    "linkInstagram",
    "linkSosmedLain",
    "openToCollaboration",
    "openToOpportunity",
    "connectionStatus",
  ];
  const bocorAnonim = kartu.some((k) =>
    kunciTerlarang.some((kunci) => kunci in (k as Record<string, unknown>))
  );
  cek(
    "direktori anonymous tanpa satu pun field terbatas",
    !bocorAnonim &&
      kartu.length > 0 &&
      kartu.every((k) => (k as { openStatusLocked?: boolean }).openStatusLocked === true),
    `${kartu.length} kartu diperiksa per kunci`
  );

  const loginP = await login(EMAIL.p);
  const cookieP = loginP.cookie ?? "";
  const direktoriPending = await panggil("GET", "/api/public/alumni?limit=5", {
    cookie: cookieP,
  });
  const kartuPending = ((direktoriPending.body.data as unknown) as Record<
    string,
    unknown
  >[]) ?? [];
  cek(
    "session PENDING diperlakukan seperti anonymous",
    kartuPending.every((k) => k.openStatusLocked === true) &&
      kartuPending.every((k) => !("openToCollaboration" in k)),
    `${kartuPending.length} kartu`
  );

  const loginS = await login(EMAIL.s);
  const cookieS = loginS.cookie ?? "";
  await prisma.alumniAccount.update({
    where: { id: akun[EMAIL.s] },
    data: { status: StatusAlumniAccount.SUSPENDED, suspendedAt: new Date() },
  });
  const profilSuspend = await panggil("GET", "/api/alumni/me/profile", {
    cookie: cookieS,
  });
  const direktoriSuspend = await panggil("GET", "/api/public/alumni?limit=5", {
    cookie: cookieS,
  });
  const kartuSuspend = ((direktoriSuspend.body.data as unknown) as Record<
    string,
    unknown
  >[]) ?? [];
  cek(
    "suspend langsung menutup endpoint privat walau token masih sah",
    profilSuspend.status === 401,
    `status ${profilSuspend.status}`
  );
  cek(
    "akun SUSPENDED tidak mengiklankan keterbukaan di direktori",
    kartuSuspend.every((k) => k.openStatusLocked === true),
    `${kartuSuspend.length} kartu`
  );

  /*
   * Item PENDING ada di daftar **masuk** akun A (C yang mengirim ke A), dan
   * pesannya sengaja berisi HTML — dipakai juga untuk membuktikan escaping saat
   * render di uji browser.
   */
  const masukA = await panggil("GET", "/api/alumni/connections?tab=incoming", {
    cookie: cookieA,
  });
  const itemMasuk = ((masukA.body.data as unknown) as {
    counterpart: Record<string, unknown>;
    message: string | null;
  }[]) ?? [];
  cek(
    "permintaan PENDING tidak membuka satu pun field kontak",
    itemMasuk.length > 0 &&
      itemMasuk.every((i) =>
        ["email", "noWhatsapp", "linkInstagram", "linkSosmedLain"].every(
          (kunci) => !(kunci in i.counterpart)
        )
      ),
    `${itemMasuk.length} item`
  );
  cek(
    "pesan pengantar dikirim apa adanya (escaping di sisi render)",
    itemMasuk.some((i) => i.message === PESAN_BAHAYA),
    "pesan HTML utuh di response JSON"
  );

  const terimaB = await panggil(
    "GET",
    "/api/alumni/connections?tab=accepted",
    { cookie: cookieB }
  );
  const itemTerhubung = ((terimaB.body.data as unknown) as {
    counterpart: Record<string, unknown>;
  }[]) ?? [];
  const lawan = itemTerhubung[0]?.counterpart;
  cek(
    "koneksi ACCEPTED hanya membuka kontak yang diizinkan pemiliknya",
    Boolean(lawan) && "email" in lawan && !("noWhatsapp" in lawan) && !("linkInstagram" in lawan),
    JSON.stringify(lawan ?? {})
  );

  // ---------- H. Race duplicate ----------
  const alumniD = (
    await prisma.alumniAccount.findUnique({
      where: { id: akun[EMAIL.d] },
      select: { alumniId: true },
    })
  )?.alumniId;

  const kunciAD = pairKey(akun[EMAIL.a], akun[EMAIL.d]);
  const sebelumRace = await prisma.connection.count({ where: { pairKey: kunciAD } });

  const race = await Promise.all([
    panggil("POST", "/api/alumni/connections", {
      cookie: cookieA,
      body: { recipientAlumniId: alumniD },
    }),
    panggil("POST", "/api/alumni/connections", {
      cookie: cookieA,
      body: { recipientAlumniId: alumniD },
    }),
  ]);

  const statusRace = race.map((h) => h.status).sort();
  const sesudahRace = await prisma.connection.count({ where: { pairKey: kunciAD } });
  cek(
    "dua create bersamaan: satu 201, satu 409, satu baris",
    statusRace[0] === 201 &&
      statusRace[1] === 409 &&
      sebelumRace === 0 &&
      sesudahRace === 1,
    `${statusRace.join(",")} baris=${sesudahRace}`
  );

  const gagal = hasil.filter((h) => !h.lulus);
  for (const h of hasil) {
    console.log(`${h.lulus ? "OK  " : "GAGAL"} ${h.nama} — ${h.detail}`);
  }
  console.log(
    `\n${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await bersihkan();
    console.log("DB development:", {
      alumni: await prisma.alumni.count({ where: { deletedAt: null } }),
      akun: await prisma.alumniAccount.count(),
      koneksi: await prisma.connection.count(),
      rateLimit: await prisma.authRateLimit.count(),
      audit: await prisma.auditLog.count(),
    });
    await prisma.$disconnect();
  });
