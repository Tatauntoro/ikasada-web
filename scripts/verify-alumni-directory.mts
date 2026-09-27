#!/usr/bin/env tsx
/**
 * Verifikasi direktori alumni yang sadar session (BE Task 7).
 *
 * Menguji lewat HTTP sungguhan: bentuk response anonymous (tanpa kontak, tanpa
 * keterbukaan, ada `openStatusLocked`), bentuk response akun ACTIVE (keterbukaan
 * + `connectionStatus` per kartu), pengecualian HIDDEN/terhapus, dan filter
 * serta pagination yang harus tetap utuh.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run alumni:directory:verify
 *
 * Data ujinya dibuat langsung lewat Prisma (bukan endpoint register/approve
 * yang sudah diuji di task lain) supaya status koneksi bisa disiapkan presisi,
 * lalu dihapus lagi di blok `finally`.
 */

import { existsSync } from "node:fs";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;

if (!ADMIN_EMAIL) {
  console.error("SEED_ADMIN_EMAIL tidak ditemukan. Jalankan dari root project (ada .env).");
  process.exit(1);
}

const prisma = new PrismaClient();

type ItemDirektori = {
  id?: string;
  namaLengkap?: string;
  gelar?: string | null;
  fotoUrl?: string | null;
  angkatan?: number;
  programStudi?: string;
  profesi?: string;
  instansi?: string | null;
  sektorIndustri?: { id?: string; namaSektor?: string } | null;
  openStatusLocked?: boolean;
  openToCollaboration?: boolean;
  openToOpportunity?: boolean;
  connectionStatus?: string;
};

type BodyJson = {
  success?: boolean;
  data?: unknown;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
  error?: { code?: string; message?: string };
};

type Hasil = { status: number; body: BodyJson; setCookie: string[] };

const hasil: { nama: string; lulus: boolean; detail: string }[] = [];
const cek = (nama: string, lulus: boolean, detail: string) =>
  hasil.push({ nama, lulus, detail });

async function panggil(
  method: string,
  path: string,
  opsi: { body?: unknown; cookie?: string } = {}
): Promise<Hasil> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(opsi.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(opsi.cookie ? { Cookie: opsi.cookie } : {}),
    },
    body: opsi.body === undefined ? undefined : JSON.stringify(opsi.body),
    redirect: "manual",
  });

  let parsed: BodyJson = {};
  try {
    parsed = (await res.json()) as BodyJson;
  } catch {
    parsed = {};
  }

  return { status: res.status, body: parsed, setCookie: res.headers.getSetCookie() };
}

function cookieDari(setCookie: string[], nama: string): string | null {
  const mentah = setCookie.find((c) => c.startsWith(`${nama}=`));
  if (!mentah) return null;
  const nilai = mentah.slice(nama.length + 1).split(";")[0];
  return nilai ? `${nama}=${decodeURIComponent(nilai)}` : null;
}

const itemDari = (body: BodyJson): ItemDirektori[] =>
  Array.isArray(body.data) ? (body.data as ItemDirektori[]) : [];

const cariItem = (body: BodyJson, id?: string) =>
  itemDari(body).find((item) => item.id === id);

const FIELD_KONTAK = ["email", "noWhatsapp", "linkInstagram", "linkSosmedLain"];

const adaFieldKontak = (body: BodyJson): boolean =>
  itemDari(body).some((item) =>
    Object.keys(item).some((kunci) => FIELD_KONTAK.includes(kunci))
  );

const stamp = Date.now();
const password = "KataSandiUji123!";
const idAkun: string[] = [];
const idAlumni: string[] = [];
const mulai = new Date();

type Siap = {
  alumni: { a: string; b: string; c: string; hidden: string; terhapus: string };
  akun: { a: string; b: string; c: string; pending: string };
  cookie: { a: string; b: string; pending: string };
  sektorId: string;
};

async function siapkanData(): Promise<Siap> {
  const admin = await prisma.adminUser.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  const sektor = await prisma.sektorIndustri.findFirst({
    where: { deletedAt: null },
    select: { id: true, namaSektor: true },
  });
  if (!admin || !sektor) {
    throw new Error("Butuh satu admin dan satu sektor industri di database");
  }

  const passwordHash = await hash(password, 10);

  const buatAlumni = async (
    label: string,
    data: { status?: "PUBLISHED" | "HIDDEN"; deletedAt?: Date; angkatan?: number }
  ) => {
    const alumni = await prisma.alumni.create({
      data: {
        namaLengkap: `Uji Direktori ${label} ${stamp}`,
        gelar: null,
        angkatan: data.angkatan ?? 2015,
        programStudi: "JAWA",
        profesi: `Profesi ${label}`,
        instansi: null,
        sektorIndustriId: sektor.id,
        status: data.status ?? "PUBLISHED",
        deletedAt: data.deletedAt ?? null,
        createdById: admin.id,
      },
      select: { id: true },
    });
    idAlumni.push(alumni.id);
    return alumni.id;
  };

  const alumniA = await buatAlumni("A", { angkatan: 2010 });
  const alumniB = await buatAlumni("B", { angkatan: 2015 });
  const alumniC = await buatAlumni("C", { angkatan: 2020 });
  const alumniHidden = await buatAlumni("HIDDEN", { status: "HIDDEN" });
  const alumniTerhapus = await buatAlumni("TERHAPUS", {
    deletedAt: new Date(),
  });

  const buatAkun = async (
    label: string,
    alumniId: string | null,
    data: {
      status?: "PENDING" | "ACTIVE" | "SUSPENDED";
      openToCollaboration?: boolean;
      openToOpportunity?: boolean;
    } = {}
  ) => {
    const akun = await prisma.alumniAccount.create({
      data: {
        email: `direktori-${label}-${stamp}@contoh.invalid`,
        passwordHash,
        status: data.status ?? "ACTIVE",
        alumniId,
        namaLengkapSaatDaftar: `Uji Direktori ${label}`,
        angkatanSaatDaftar: 2015,
        programStudiSaatDaftar: "JAWA",
        consentDataAt: new Date(),
        approvedAt: data.status === "PENDING" ? null : new Date(),
        openToCollaboration: data.openToCollaboration ?? false,
        openToOpportunity: data.openToOpportunity ?? false,
      },
      select: { id: true },
    });
    idAkun.push(akun.id);
    return akun.id;
  };

  const akunA = await buatAkun("a", alumniA, { openToCollaboration: true });
  const akunB = await buatAkun("b", alumniB, { openToOpportunity: true });
  const akunC = await buatAkun("c", alumniC, {
    openToCollaboration: true,
    openToOpportunity: true,
  });
  // Akun terhubung ke `Alumni` C tapi di-suspend: keterbukaannya harus disembunyikan.
  await prisma.alumniAccount.update({
    where: { id: akunC },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });
  const akunPending = await buatAkun("pending", null, { status: "PENDING" });

  const pairKey = (x: string, y: string) =>
    [x, y].sort().join(":");

  await prisma.connection.createMany({
    data: [
      {
        requesterAccountId: akunA,
        recipientAccountId: akunB,
        pairKey: pairKey(akunA, akunB),
        status: "PENDING",
      },
      {
        requesterAccountId: akunA,
        recipientAccountId: akunC,
        pairKey: pairKey(akunA, akunC),
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
      {
        requesterAccountId: akunC,
        recipientAccountId: akunB,
        pairKey: pairKey(akunC, akunB),
        status: "CANCELED",
        respondedAt: new Date(),
      },
    ],
  });

  const login = async (label: string) => {
    const res = await panggil("POST", "/api/auth/alumni/login", {
      body: { email: `direktori-${label}-${stamp}@contoh.invalid`, password },
    });
    return cookieDari(res.setCookie, "ikasada_alumni_session") ?? "";
  };

  return {
    alumni: {
      a: alumniA,
      b: alumniB,
      c: alumniC,
      hidden: alumniHidden,
      terhapus: alumniTerhapus,
    },
    akun: { a: akunA, b: akunB, c: akunC, pending: akunPending },
    cookie: {
      a: await login("a"),
      b: await login("b"),
      pending: await login("pending"),
    },
    sektorId: sektor.id,
  };
}

try {
  const data = await siapkanData();
  cek(
    "data uji siap (3 alumni terlihat, 1 HIDDEN, 1 terhapus, akun A/B/C/pending)",
    Boolean(data.cookie.a && data.cookie.b && data.cookie.pending),
    `alumni=${idAlumni.length} akun=${idAkun.length}`
  );

  /* ---------- 1. Bentuk anonymous ---------- */
  const anon = await panggil("GET", "/api/public/alumni?limit=100");
  const itemAnon = cariItem(anon.body, data.alumni.a);
  const kunciAnon = Object.keys(itemAnon ?? {});

  cek(
    "anonymous menerima field kartu yang lama (kompatibel)",
    anon.status === 200 &&
      itemAnon?.namaLengkap !== undefined &&
      itemAnon?.profesi !== undefined &&
      itemAnon?.angkatan !== undefined &&
      "fotoUrl" in (itemAnon ?? {}) &&
      "gelar" in (itemAnon ?? {}) &&
      "instansi" in (itemAnon ?? {}) &&
      itemAnon?.sektorIndustri?.id === data.sektorId,
    `keys=${JSON.stringify(kunciAnon)}`
  );
  cek(
    "anonymous menerima openStatusLocked dan bukan nilai keterbukaan",
    itemAnon?.openStatusLocked === true &&
      itemAnon?.openToCollaboration === undefined &&
      itemAnon?.openToOpportunity === undefined &&
      itemAnon?.connectionStatus === undefined,
    `locked=${String(itemAnon?.openStatusLocked)} collaboration=${String(itemAnon?.openToCollaboration)}`
  );
  cek(
    "anonymous tidak menerima field kontak sama sekali",
    !adaFieldKontak(anon.body),
    `key yang ada=${JSON.stringify(kunciAnon)}`
  );

  /* ---------- 2. HIDDEN dan terhapus ---------- */
  cek(
    "alumni HIDDEN tidak muncul di direktori",
    !cariItem(anon.body, data.alumni.hidden),
    `id=${data.alumni.hidden}`
  );
  cek(
    "alumni terhapus (deletedAt) tidak muncul di direktori",
    !cariItem(anon.body, data.alumni.terhapus),
    `id=${data.alumni.terhapus}`
  );
  cek(
    "ketiga alumni uji yang PUBLISHED justru muncul",
    [data.alumni.a, data.alumni.b, data.alumni.c].every((id) =>
      Boolean(cariItem(anon.body, id))
    ),
    `total=${anon.body.meta?.total}`
  );

  /* ---------- 3. Filter dan pagination tetap utuh ---------- */
  const perHalaman = await panggil("GET", "/api/public/alumni?limit=2&page=1");
  cek(
    "pagination dipatuhi (limit, meta.total, meta.totalPages)",
    perHalaman.status === 200 &&
      itemDari(perHalaman.body).length === 2 &&
      Number(perHalaman.body.meta?.limit) === 2 &&
      Number(perHalaman.body.meta?.total ?? 0) > 2 &&
      Number(perHalaman.body.meta?.totalPages ?? 0) > 1,
    `items=${itemDari(perHalaman.body).length} total=${perHalaman.body.meta?.total} totalPages=${perHalaman.body.meta?.totalPages}`
  );

  const namaDicari = cariItem(anon.body, data.alumni.b)?.namaLengkap ?? "";
  const denganPencarian = await panggil(
    "GET",
    `/api/public/alumni?limit=100&search=${encodeURIComponent(namaDicari)}`
  );
  cek(
    "filter search masih menyaring berdasarkan nama",
    itemDari(denganPencarian.body).length === 1 &&
      itemDari(denganPencarian.body)[0]?.id === data.alumni.b,
    `hasil=${itemDari(denganPencarian.body).length}`
  );

  const denganAngkatan = await panggil(
    "GET",
    "/api/public/alumni?limit=100&angkatanDari=2014&angkatanSampai=2021"
  );
  cek(
    "filter rentang angkatan masih menyaring benar",
    itemDari(denganAngkatan.body).length > 0 &&
      itemDari(denganAngkatan.body).every(
        (item) => (item.angkatan ?? 0) >= 2014 && (item.angkatan ?? 0) <= 2021
      ) &&
      itemDari(denganAngkatan.body).some((item) => item.id === data.alumni.b),
    `hasil=${itemDari(denganAngkatan.body).length}`
  );

  const denganSektor = await panggil(
    "GET",
    `/api/public/alumni?limit=100&sektorIndustriId=${data.sektorId}`
  );
  cek(
    "filter sektor industri masih menyaring benar",
    itemDari(denganSektor.body).length > 0 &&
      itemDari(denganSektor.body).every(
        (item) => item.sektorIndustri?.id === data.sektorId
      ),
    `hasil=${itemDari(denganSektor.body).length}`
  );

  const denganProdi = await panggil(
    "GET",
    "/api/public/alumni?limit=100&programStudi=JAWA"
  );
  cek(
    "filter program studi masih menyaring benar",
    itemDari(denganProdi.body).length > 0 &&
      itemDari(denganProdi.body).every((item) => item.programStudi === "JAWA"),
    `hasil=${itemDari(denganProdi.body).length}`
  );

  const urut = await panggil(
    "GET",
    "/api/public/alumni?limit=100&sort=angkatan:desc"
  );
  const angkatanUrut = itemDari(urut.body).map((item) => item.angkatan ?? 0);
  cek(
    "sort masih dihormati (angkatan:desc)",
    angkatanUrut.length > 1 &&
      angkatanUrut.every((nilai, index) => index === 0 || angkatanUrut[index - 1] >= nilai),
    `tiga teratas=${JSON.stringify(angkatanUrut.slice(0, 3))}`
  );

  /* ---------- 4. Bentuk akun ACTIVE ---------- */
  const sebagaiA = await panggil("GET", "/api/public/alumni?limit=100", {
    cookie: data.cookie.a,
  });
  const itemA = cariItem(sebagaiA.body, data.alumni.a);
  const itemB = cariItem(sebagaiA.body, data.alumni.b);
  const itemC = cariItem(sebagaiA.body, data.alumni.c);

  cek(
    "akun ACTIVE menerima nilai keterbukaan dan connectionStatus",
    sebagaiA.status === 200 &&
      typeof itemB?.openToCollaboration === "boolean" &&
      typeof itemB?.openToOpportunity === "boolean" &&
      typeof itemB?.connectionStatus === "string" &&
      itemA?.openStatusLocked === undefined,
    `B=${JSON.stringify({ c: itemB?.openToCollaboration, o: itemB?.openToOpportunity, s: itemB?.connectionStatus })}`
  );
  const alumniLain = itemDari(sebagaiA.body).find(
    (item) =>
      ![data.alumni.a, data.alumni.b, data.alumni.c].includes(item.id ?? "")
  );
  cek(
    "PENDING_SENT untuk requester, ACCEPTED untuk yang sudah terhubung, NONE untuk sisanya",
    itemB?.connectionStatus === "PENDING_SENT" &&
      itemC?.connectionStatus === "ACCEPTED" &&
      alumniLain?.connectionStatus === "NONE",
    `B=${itemB?.connectionStatus} C=${itemC?.connectionStatus} lain=${alumniLain?.connectionStatus}`
  );
  cek(
    "kartu milik sendiri -> SELF",
    itemA?.connectionStatus === "SELF",
    `A=${itemA?.connectionStatus}`
  );
  cek(
    "akun ACTIVE tetap tidak menerima field kontak",
    !adaFieldKontak(sebagaiA.body),
    "tidak ada email/noWhatsapp/linkInstagram/linkSosmedLain"
  );

  const sebagaiB = await panggil("GET", "/api/public/alumni?limit=100", {
    cookie: data.cookie.b,
  });
  cek(
    "sisi penerima melihat PENDING_RECEIVED",
    cariItem(sebagaiB.body, data.alumni.a)?.connectionStatus === "PENDING_RECEIVED",
    `A=${cariItem(sebagaiB.body, data.alumni.a)?.connectionStatus}`
  );
  cek(
    "koneksi CANCELED dianggap belum terhubung (NONE)",
    cariItem(sebagaiB.body, data.alumni.c)?.connectionStatus === "NONE",
    `C=${cariItem(sebagaiB.body, data.alumni.c)?.connectionStatus}`
  );
  cek(
    "setiap kartu pada satu halaman punya connectionStatus (bukan hanya sebagian)",
    itemDari(sebagaiB.body).length > 3 &&
      itemDari(sebagaiB.body).every((item) => typeof item.connectionStatus === "string"),
    `kartu=${itemDari(sebagaiB.body).length}`
  );

  /* ---------- 5. Keterbukaan hanya untuk akun ACTIVE ---------- */
  cek(
    "nilai keterbukaan mengikuti database (B terbuka kesempatan)",
    itemB?.openToOpportunity === true && itemB?.openToCollaboration === false,
    `B=${JSON.stringify({ c: itemB?.openToCollaboration, o: itemB?.openToOpportunity })}`
  );
  cek(
    "akun SUSPENDED tidak mengiklankan keterbukaannya",
    itemC?.openToCollaboration === false && itemC?.openToOpportunity === false,
    `C=${JSON.stringify({ c: itemC?.openToCollaboration, o: itemC?.openToOpportunity })} (DB true/true)`
  );

  /* ---------- 6. Session PENDING diperlakukan anonymous ---------- */
  const sebagaiPending = await panggil("GET", "/api/public/alumni?limit=100", {
    cookie: data.cookie.pending,
  });
  cek(
    "session PENDING diperlakukan seperti anonymous",
    cariItem(sebagaiPending.body, data.alumni.b)?.openStatusLocked === true &&
      cariItem(sebagaiPending.body, data.alumni.b)?.connectionStatus === undefined,
    `B=${JSON.stringify(cariItem(sebagaiPending.body, data.alumni.b))}`
  );
} catch (error) {
  cek("uji berjalan tanpa error tak terduga", false, String(error));
} finally {
  if (idAkun.length > 0) {
    await prisma.connection.deleteMany({
      where: {
        OR: [
          { requesterAccountId: { in: idAkun } },
          { recipientAccountId: { in: idAkun } },
        ],
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { alumniAccountId: { in: idAkun } },
          { entitas: "AlumniAccount", entitasId: { in: idAkun } },
        ],
      },
    });
    await prisma.alumniAccount.deleteMany({ where: { id: { in: idAkun } } });
  }
  if (idAlumni.length > 0) {
    // Baris alumni dibuat sendiri oleh skrip ini, jadi dihapus permanen.
    await prisma.alumni.deleteMany({ where: { id: { in: idAlumni } } });
  }
  await prisma.authRateLimit.deleteMany({ where: { updatedAt: { gte: mulai } } });
  await prisma.$disconnect();
}

console.log("\n===== VERIFIKASI DIREKTORI ALUMNI =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
