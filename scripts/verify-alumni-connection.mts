#!/usr/bin/env tsx
/**
 * Verifikasi endpoint koneksi antar alumni (BE Task 8).
 *
 * Yang diuji lewat HTTP sungguhan, sesuai kriteria "Selesai jika": race,
 * IDOR, duplicate (arah sama dan arah balik), serta transisi status
 * (accept/decline/cancel, hidupkan ulang setelah CANCELED/DECLINED), plus
 * gating kontak untuk koneksi ACCEPTED dan rate limit create.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run alumni:connection:verify
 *
 * Data uji dibuat lewat Prisma supaya kombinasi status dan consent bisa
 * disiapkan presisi, lalu dihapus di blok `finally`.
 */

import { existsSync } from "node:fs";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { AksiAudit } from "../src/generated/prisma/enums";

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

type ItemKoneksi = {
  id?: string;
  status?: string;
  message?: string | null;
  respondedAt?: string | null;
  counterpart?: {
    alumniId?: string | null;
    namaLengkap?: string | null;
    email?: string;
    noWhatsapp?: string;
    linkInstagram?: string;
  };
};

type BodyJson = {
  success?: boolean;
  data?: unknown;
  meta?: { total?: number; totalPages?: number; limit?: number };
  error?: { code?: string; message?: string; fields?: Record<string, string> };
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

const itemDari = (body: BodyJson): ItemKoneksi | undefined =>
  body.data && !Array.isArray(body.data) ? (body.data as ItemKoneksi) : undefined;

const daftarDari = (body: BodyJson): ItemKoneksi[] =>
  Array.isArray(body.data) ? (body.data as ItemKoneksi[]) : [];

const FIELD_KONTAK = ["email", "noWhatsapp", "linkInstagram", "linkSosmedLain"];

const kontakDari = (item?: ItemKoneksi): string[] =>
  Object.keys(item?.counterpart ?? {}).filter((kunci) =>
    FIELD_KONTAK.includes(kunci)
  );

const stamp = Date.now();
const password = "KataSandiUji123!";
const idAkun: string[] = [];
const idAlumni: string[] = [];
const mulai = new Date();

type Konteks = {
  alumni: {
    a: string;
    b: string;
    c: string;
    r: string;
    hidden: string;
    terhapus: string;
  };
  akun: { a: string; b: string; c: string; r: string };
  cookie: { a: string; b: string; c: string; r: string };
};

async function siapkanData(): Promise<Konteks> {
  const admin = await prisma.adminUser.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  const sektor = await prisma.sektorIndustri.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });
  if (!admin || !sektor) {
    throw new Error("Butuh satu admin dan satu sektor industri di database");
  }

  const passwordHash = await hash(password, 10);

  const buatAlumni = async (
    label: string,
    data: {
      status?: "PUBLISHED" | "HIDDEN";
      deletedAt?: Date;
      email?: string;
      noWhatsapp?: string;
      linkInstagram?: string;
    } = {}
  ) => {
    const alumni = await prisma.alumni.create({
      data: {
        namaLengkap: `Uji Koneksi ${label} ${stamp}`,
        angkatan: 2016,
        programStudi: "SUNDA",
        profesi: `Profesi ${label}`,
        sektorIndustriId: sektor.id,
        status: data.status ?? "PUBLISHED",
        deletedAt: data.deletedAt ?? null,
        email: data.email ?? null,
        noWhatsapp: data.noWhatsapp ?? null,
        linkInstagram: data.linkInstagram ?? null,
        createdById: admin.id,
      },
      select: { id: true },
    });
    idAlumni.push(alumni.id);
    return alumni.id;
  };

  const buatAkun = async (
    label: string,
    alumniId: string,
    data: {
      status?: "ACTIVE" | "SUSPENDED";
      showEmailToConnections?: boolean;
      showWhatsappToConnections?: boolean;
      showSocialLinksToConnections?: boolean;
    } = {}
  ) => {
    const akun = await prisma.alumniAccount.create({
      data: {
        email: `koneksi-${label}-${stamp}@contoh.invalid`,
        passwordHash,
        status: data.status ?? "ACTIVE",
        alumniId,
        namaLengkapSaatDaftar: `Uji Koneksi ${label}`,
        angkatanSaatDaftar: 2016,
        programStudiSaatDaftar: "SUNDA",
        consentDataAt: new Date(),
        approvedAt: new Date(),
        showEmailToConnections: data.showEmailToConnections ?? false,
        showWhatsappToConnections: data.showWhatsappToConnections ?? false,
        showSocialLinksToConnections: data.showSocialLinksToConnections ?? false,
      },
      select: { id: true },
    });
    idAkun.push(akun.id);
    return akun.id;
  };

  const alumniA = await buatAlumni("A", {
    email: `kontak-a-${stamp}@contoh.invalid`,
    noWhatsapp: "628111111111",
    linkInstagram: `https://instagram.com/uji-a-${stamp}`,
  });
  const alumniB = await buatAlumni("B", {
    email: `kontak-b-${stamp}@contoh.invalid`,
    noWhatsapp: "628222222222",
    linkInstagram: `https://instagram.com/uji-b-${stamp}`,
  });
  const alumniC = await buatAlumni("C");
  const alumniR = await buatAlumni("R");
  const alumniHidden = await buatAlumni("HIDDEN", { status: "HIDDEN" });
  const alumniTerhapus = await buatAlumni("TERHAPUS", { deletedAt: new Date() });

  // A hanya membuka email; B membuka WhatsApp dan sosial. Tiga flag jadi teruji
  // berbeda: A melihat noWhatsapp + linkInstagram, B hanya melihat email.
  const akunA = await buatAkun("a", alumniA, {
    showEmailToConnections: true,
  });
  const akunB = await buatAkun("b", alumniB, {
    showWhatsappToConnections: true,
    showSocialLinksToConnections: true,
  });
  const akunC = await buatAkun("c", alumniC);
  const akunR = await buatAkun("r", alumniR);

  // Akun aktif yang tertaut ke alumni HIDDEN/terhapus (drift data) — endpoint
  // create tetap harus menolaknya.
  await buatAkun("hidden", alumniHidden);
  await buatAkun("terhapus", alumniTerhapus);

  cek(
    "data uji siap (4 akun aktif, 1 HIDDEN, 1 terhapus)",
    [akunA, akunB, akunC, akunR].every(Boolean) && idAkun.length === 6,
    `akun=${idAkun.length} alumni=${idAlumni.length}`
  );

  const login = async (label: string) => {
    const res = await panggil("POST", "/api/auth/alumni/login", {
      body: { email: `koneksi-${label}-${stamp}@contoh.invalid`, password },
    });
    return cookieDari(res.setCookie, "ikasada_alumni_session") ?? "";
  };

  return {
    alumni: {
      a: alumniA,
      b: alumniB,
      c: alumniC,
      r: alumniR,
      hidden: alumniHidden,
      terhapus: alumniTerhapus,
    },
    akun: { a: akunA, b: akunB, c: akunC, r: akunR },
    cookie: {
      a: await login("a"),
      b: await login("b"),
      c: await login("c"),
      r: await login("r"),
    },
  };
}

try {
  const ctx = await siapkanData();
  cek(
    "keempat akun bisa login",
    Boolean(ctx.cookie.a && ctx.cookie.b && ctx.cookie.c && ctx.cookie.r),
    "semua cookie ada"
  );

  /* ---------- 1. Otorisasi ---------- */
  cek(
    "POST create tanpa session -> 401",
    (
      await panggil("POST", "/api/alumni/connections", {
        body: { recipientAlumniId: ctx.alumni.b },
      })
    ).status === 401,
    "status=401"
  );
  cek(
    "GET daftar tanpa session -> 401",
    (await panggil("GET", "/api/alumni/connections")).status === 401,
    "status=401"
  );

  /* ---------- 2. Validasi input ---------- */
  for (const [label, body] of [
    ["body kosong", {}],
    ["recipientAlumniId tidak dikenal", { recipientAlumniId: "tidak-ada" }],
    [
      "pesan lebih dari 300 karakter",
      { recipientAlumniId: ctx.alumni.b, message: "x".repeat(301) },
    ],
    [
      "identitas dari body (requesterAccountId)",
      { recipientAlumniId: ctx.alumni.b, requesterAccountId: ctx.akun.c },
    ],
  ] as const) {
    const uji = await panggil("POST", "/api/alumni/connections", {
      cookie: ctx.cookie.a,
      body,
    });
    cek(
      `POST create dengan ${label} -> 400`,
      uji.status === 400 && uji.body.error?.code === "VALIDATION_ERROR",
      `status=${uji.status} fields=${JSON.stringify(uji.body.error?.fields)}`
    );
  }

  /* ---------- 3. Penerima tidak sah ---------- */
  cek(
    "menghubungi diri sendiri -> 400",
    (
      await panggil("POST", "/api/alumni/connections", {
        cookie: ctx.cookie.a,
        body: { recipientAlumniId: ctx.alumni.a },
      })
    ).status === 400,
    "status=400"
  );
  cek(
    "penerima alumni HIDDEN -> 400",
    (
      await panggil("POST", "/api/alumni/connections", {
        cookie: ctx.cookie.a,
        body: { recipientAlumniId: ctx.alumni.hidden },
      })
    ).status === 400,
    "status=400"
  );
  cek(
    "penerima alumni terhapus -> 400",
    (
      await panggil("POST", "/api/alumni/connections", {
        cookie: ctx.cookie.a,
        body: { recipientAlumniId: ctx.alumni.terhapus },
      })
    ).status === 400,
    "status=400"
  );

  /* ---------- 4. Create valid + duplicate ---------- */
  const buatAB = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.a,
    body: { recipientAlumniId: ctx.alumni.b, message: "Salam dari A" },
  });
  const koneksiAB = itemDari(buatAB.body);
  cek(
    "create valid -> 201 PENDING dengan pesan dan lawan bicara benar",
    buatAB.status === 201 &&
      koneksiAB?.status === "PENDING" &&
      koneksiAB?.message === "Salam dari A" &&
      koneksiAB?.counterpart?.alumniId === ctx.alumni.b,
    `status=${buatAB.status} data.status=${koneksiAB?.status} lawan=${koneksiAB?.counterpart?.alumniId}`
  );
  cek(
    "permintaan PENDING tidak membuka kontak walau consent menyala",
    kontakDari(koneksiAB).length === 0,
    `kontak=${JSON.stringify(kontakDari(koneksiAB))}`
  );

  const duplikatSama = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.a,
    body: { recipientAlumniId: ctx.alumni.b },
  });
  cek(
    "duplicate arah sama -> 409 + state PENDING_SENT",
    duplikatSama.status === 409 &&
      duplikatSama.body.error?.fields?.connectionStatus === "PENDING_SENT",
    `status=${duplikatSama.status} state=${duplikatSama.body.error?.fields?.connectionStatus} message="${duplikatSama.body.error?.message}"`
  );

  const duplikatBalik = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.b,
    body: { recipientAlumniId: ctx.alumni.a },
  });
  cek(
    "duplicate arah balik -> 409 + state PENDING_RECEIVED (bukan baris kedua)",
    duplikatBalik.status === 409 &&
      duplikatBalik.body.error?.fields?.connectionStatus === "PENDING_RECEIVED",
    `status=${duplikatBalik.status} state=${duplikatBalik.body.error?.fields?.connectionStatus}`
  );
  cek(
    "unique pairKey menahan baris kedua untuk pasangan yang sama",
    (await prisma.connection.count({
      where: {
        OR: [
          { requesterAccountId: ctx.akun.a, recipientAccountId: ctx.akun.b },
          { requesterAccountId: ctx.akun.b, recipientAccountId: ctx.akun.a },
        ],
      },
    })) === 1,
    "jumlah baris pasangan A-B = 1"
  );

  /* ---------- 5. Race: dua create bersamaan ---------- */
  const alumniBaru = await prisma.alumni.findFirst({
    where: {
      account: null,
      deletedAt: null,
      status: "PUBLISHED",
      id: { notIn: idAlumni },
    },
    select: { id: true },
  });
  const akunBaru = alumniBaru
    ? await prisma.alumniAccount.create({
        data: {
          email: `koneksi-race-${stamp}@contoh.invalid`,
          passwordHash: await hash(password, 10),
          status: "ACTIVE",
          alumniId: alumniBaru.id,
          namaLengkapSaatDaftar: "Uji Koneksi Race",
          angkatanSaatDaftar: 2016,
          programStudiSaatDaftar: "SUNDA",
          consentDataAt: new Date(),
          approvedAt: new Date(),
        },
        select: { id: true },
      })
    : null;
  if (akunBaru) idAkun.push(akunBaru.id);

  if (alumniBaru) {
    const bersamaan = await Promise.all([
      panggil("POST", "/api/alumni/connections", {
        cookie: ctx.cookie.c,
        body: { recipientAlumniId: alumniBaru.id },
      }),
      panggil("POST", "/api/alumni/connections", {
        cookie: ctx.cookie.c,
        body: { recipientAlumniId: alumniBaru.id },
      }),
    ]);
    const status = bersamaan.map((r) => r.status).sort((a, b) => a - b);
    cek(
      "dua create bersamaan: tepat satu 201 dan satu 409 (tanpa 500)",
      status.length === 2 && status[0] === 201 && status[1] === 409,
      `status=${JSON.stringify(bersamaan.map((r) => r.status))} pesan=${JSON.stringify(bersamaan.map((r) => r.body.error?.message ?? "ok"))}`
    );
    cek(
      "race tidak meninggalkan baris ganda",
      (await prisma.connection.count({
        where: {
          OR: [
            { requesterAccountId: ctx.akun.c, recipientAccountId: akunBaru?.id },
            { recipientAccountId: ctx.akun.c, requesterAccountId: akunBaru?.id },
          ],
        },
      })) === 1,
      "jumlah baris pasangan C-baru = 1"
    );
  }

  /* ---------- 6. Daftar per tab ---------- */
  const keluarA = await panggil(
    "GET",
    "/api/alumni/connections?tab=outgoing&limit=100",
    { cookie: ctx.cookie.a }
  );
  const masukB = await panggil(
    "GET",
    "/api/alumni/connections?tab=incoming&limit=100",
    { cookie: ctx.cookie.b }
  );
  const masukA = await panggil(
    "GET",
    "/api/alumni/connections?tab=incoming&limit=100",
    { cookie: ctx.cookie.a }
  );
  cek(
    "tab outgoing (A) dan incoming (B) memuat permintaan yang sama",
    daftarDari(keluarA.body).some((item) => item.id === koneksiAB?.id) &&
      daftarDari(masukB.body).some((item) => item.id === koneksiAB?.id),
    `outgoing=${daftarDari(keluarA.body).length} incoming B=${daftarDari(masukB.body).length}`
  );
  cek(
    "tab incoming (A) tidak memuat permintaan yang ia kirim",
    !daftarDari(masukA.body).some((item) => item.id === koneksiAB?.id),
    `incoming A=${daftarDari(masukA.body).length}`
  );
  cek(
    "tab tidak dikenal jatuh ke incoming (tetap 200)",
    (
      await panggil("GET", "/api/alumni/connections?tab=ngaco", {
        cookie: ctx.cookie.a,
      })
    ).status === 200,
    "status=200"
  );

  /* ---------- 7. IDOR: aksi oleh pihak yang bukan haknya ---------- */
  const idAB = koneksiAB?.id ?? "";
  for (const [label, path, cookie] of [
    ["requester mencoba accept", "accept", ctx.cookie.a],
    ["requester mencoba decline", "decline", ctx.cookie.a],
    ["pihak ketiga mencoba accept", "accept", ctx.cookie.c],
    ["pihak ketiga mencoba cancel", "cancel", ctx.cookie.c],
  ] as const) {
    const uji = await panggil("PATCH", `/api/alumni/connections/${idAB}/${path}`, {
      cookie,
    });
    cek(
      `IDOR: ${label} -> 404`,
      uji.status === 404,
      `status=${uji.status} message="${uji.body.error?.message}"`
    );
  }
  cek(
    "setelah percobaan IDOR, status koneksi tidak berubah",
    (
      await prisma.connection.findUnique({
        where: { id: idAB },
        select: { status: true },
      })
    )?.status === "PENDING",
    "status tetap PENDING"
  );

  /* ---------- 8. Accept + kontak hanya untuk ACCEPTED ---------- */
  const accept = await panggil(
    "PATCH",
    `/api/alumni/connections/${idAB}/accept`,
    { cookie: ctx.cookie.b }
  );
  cek(
    "recipient accept -> 200 ACCEPTED dengan respondedAt",
    accept.status === 200 &&
      itemDari(accept.body)?.status === "ACCEPTED" &&
      Boolean(itemDari(accept.body)?.respondedAt),
    `status=${accept.status} data.status=${itemDari(accept.body)?.status}`
  );

  const acceptLagi = await panggil(
    "PATCH",
    `/api/alumni/connections/${idAB}/accept`,
    { cookie: ctx.cookie.b }
  );
  cek(
    "accept ulang koneksi ACCEPTED -> 409 (tidak kembali PENDING)",
    acceptLagi.status === 409 &&
      acceptLagi.body.error?.fields?.connectionStatus === "ACCEPTED",
    `status=${acceptLagi.status} state=${acceptLagi.body.error?.fields?.connectionStatus}`
  );
  cek(
    "cancel pada koneksi ACCEPTED -> 409",
    (
      await panggil("PATCH", `/api/alumni/connections/${idAB}/cancel`, {
        cookie: ctx.cookie.a,
      })
    ).status === 409,
    "status=409"
  );

  const acceptedA = await panggil(
    "GET",
    "/api/alumni/connections?tab=accepted&limit=100",
    { cookie: ctx.cookie.a }
  );
  const acceptedB = await panggil(
    "GET",
    "/api/alumni/connections?tab=accepted&limit=100",
    { cookie: ctx.cookie.b }
  );
  const itemAlihatB = daftarDari(acceptedA.body).find((item) => item.id === idAB);
  const itemBlihatA = daftarDari(acceptedB.body).find((item) => item.id === idAB);

  cek(
    "tab accepted memuat koneksi untuk kedua pihak",
    Boolean(itemAlihatB) && Boolean(itemBlihatA),
    `A=${Boolean(itemAlihatB)} B=${Boolean(itemBlihatA)}`
  );
  cek(
    "kontak ACCEPTED hanya field yang diizinkan pemiliknya (A melihat B)",
    itemAlihatB?.counterpart?.noWhatsapp === "628222222222" &&
      Boolean(itemAlihatB?.counterpart?.linkInstagram) &&
      itemAlihatB?.counterpart?.email === undefined,
    `kontak=${JSON.stringify(kontakDari(itemAlihatB))}`
  );
  cek(
    "kontak ACCEPTED hanya field yang diizinkan pemiliknya (B melihat A)",
    itemBlihatA?.counterpart?.email === `kontak-a-${stamp}@contoh.invalid` &&
      itemBlihatA?.counterpart?.noWhatsapp === undefined &&
      itemBlihatA?.counterpart?.linkInstagram === undefined,
    `kontak=${JSON.stringify(kontakDari(itemBlihatA))}`
  );

  /* ---------- 9. Decline ---------- */
  const buatCB = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.c,
    body: { recipientAlumniId: ctx.alumni.b },
  });
  const idCB = itemDari(buatCB.body)?.id ?? "";
  const decline = await panggil(`PATCH`, `/api/alumni/connections/${idCB}/decline`, {
    cookie: ctx.cookie.b,
  });
  cek(
    "recipient decline -> 200 DECLINED dengan respondedAt",
    decline.status === 200 &&
      itemDari(decline.body)?.status === "DECLINED" &&
      Boolean(itemDari(decline.body)?.respondedAt),
    `status=${decline.status} data.status=${itemDari(decline.body)?.status}`
  );
  cek(
    "accept pada koneksi DECLINED -> 409",
    (
      await panggil("PATCH", `/api/alumni/connections/${idCB}/accept`, {
        cookie: ctx.cookie.b,
      })
    ).status === 409,
    "status=409"
  );

  const ulangSetelahDecline = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.b,
    body: { recipientAlumniId: ctx.alumni.c, message: "Coba lagi" },
  });
  cek(
    "setelah DECLINED, permintaan baru menghidupkan baris lama dengan arah dibalik",
    ulangSetelahDecline.status === 201 &&
      itemDari(ulangSetelahDecline.body)?.id === idCB &&
      itemDari(ulangSetelahDecline.body)?.status === "PENDING" &&
      itemDari(ulangSetelahDecline.body)?.counterpart?.alumniId === ctx.alumni.c,
    `status=${ulangSetelahDecline.status} id sama=${itemDari(ulangSetelahDecline.body)?.id === idCB}`
  );

  /* ---------- 10. Cancel ---------- */
  const buatAC = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.a,
    body: { recipientAlumniId: ctx.alumni.c },
  });
  const idAC = itemDari(buatAC.body)?.id ?? "";
  const cancel = await panggil("PATCH", `/api/alumni/connections/${idAC}/cancel`, {
    cookie: ctx.cookie.a,
  });
  cek(
    "requester cancel -> 200 CANCELED dengan respondedAt",
    cancel.status === 200 &&
      itemDari(cancel.body)?.status === "CANCELED" &&
      Boolean(itemDari(cancel.body)?.respondedAt),
    `status=${cancel.status} data.status=${itemDari(cancel.body)?.status}`
  );

  const ulangSetelahCancel = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.c,
    body: { recipientAlumniId: ctx.alumni.a },
  });
  cek(
    "setelah CANCELED, pihak lain bisa mengirim ulang lewat baris yang sama",
    ulangSetelahCancel.status === 201 &&
      itemDari(ulangSetelahCancel.body)?.id === idAC &&
      itemDari(ulangSetelahCancel.body)?.counterpart?.alumniId === ctx.alumni.a,
    `status=${ulangSetelahCancel.status} id sama=${itemDari(ulangSetelahCancel.body)?.id === idAC}`
  );
  cek(
    "pasangan tetap satu baris walau sudah bolak-balik",
    (await prisma.connection.count({
      where: { pairKey: [ctx.akun.a, ctx.akun.c].sort().join(":") },
    })) === 1,
    "jumlah baris pasangan A-C = 1"
  );

  /* ---------- 11. Suspend memblokir endpoint koneksi ---------- */
  await prisma.alumniAccount.update({
    where: { id: ctx.akun.a },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });
  const setelahSuspendCreate = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.a,
    body: { recipientAlumniId: ctx.alumni.b },
  });
  cek(
    "setelah suspend, create -> 401",
    setelahSuspendCreate.status === 401,
    `status=${setelahSuspendCreate.status} message="${setelahSuspendCreate.body.error?.message}"`
  );
  const setelahSuspendList = await panggil("GET", "/api/alumni/connections", {
    cookie: ctx.cookie.a,
  });
  cek(
    "setelah suspend, daftar koneksi -> 401",
    setelahSuspendList.status === 401,
    `status=${setelahSuspendList.status} message="${setelahSuspendList.body.error?.message}"`
  );
  await prisma.alumniAccount.update({
    where: { id: ctx.akun.a },
    data: { status: "ACTIVE", suspendedAt: null },
  });

  /* ---------- 12. Audit ---------- */
  const audit = (aksi: AksiAudit) =>
    prisma.auditLog.findFirst({
      where: { entitas: "Connection", aksi, alumniAccountId: { in: idAkun } },
    });
  const auditCreate = await audit(AksiAudit.CONNECTION_CREATE);
  const auditAccept = await audit(AksiAudit.CONNECTION_ACCEPT);
  const auditDecline = await audit(AksiAudit.CONNECTION_DECLINE);
  const auditCancel = await audit(AksiAudit.CONNECTION_CANCEL);

  cek(
    "keempat aksi koneksi tercatat dengan actor alumni, bukan admin",
    [auditCreate, auditAccept, auditDecline, auditCancel].every(
      (baris) => baris && baris.adminId === null && Boolean(baris.alumniAccountId)
    ),
    `create=${Boolean(auditCreate)} accept=${Boolean(auditAccept)} decline=${Boolean(auditDecline)} cancel=${Boolean(auditCancel)}`
  );
  cek(
    "audit accept mencatat PENDING -> ACCEPTED",
    JSON.stringify(auditAccept?.detailPerubahan ?? {}).includes("ACCEPTED") &&
      JSON.stringify(auditAccept?.detailPerubahan ?? {}).includes("PENDING"),
    `detail=${JSON.stringify(auditAccept?.detailPerubahan)}`
  );

  /* ---------- 13. Putuskan koneksi (REVOKE, Task 20) ---------- */
  /*
   * Memutus koneksi tidak menghapus baris (aturan soft delete), melainkan
   * mengubah status menjadi `REVOKED`. Yang diuji di sini: siapa yang boleh,
   * status apa yang sah, efeknya ke privasi/daftar/direktori, dan bahwa
   * pasangan itu masih bisa terhubung kembali.
   */
  const pairKey = (x: string, y: string) => [x, y].sort().join(":");

  // Pastikan ada satu koneksi ACCEPTED antara akun `a` (pengirim) dan `c`.
  await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.a,
    body: { recipientAlumniId: ctx.alumni.c, message: "Persiapan uji putus." },
  });
  const barisAc = await prisma.connection.findUnique({
    where: { pairKey: pairKey(ctx.akun.a, ctx.akun.c) },
    select: { id: true },
  });
  const idAc = barisAc?.id ?? "";
  if (idAc) {
    await prisma.connection.update({
      where: { id: idAc },
      data: { status: "ACCEPTED", requesterAccountId: ctx.akun.a, respondedAt: new Date() },
    });
  }

  const putusPihakKetiga = await panggil("DELETE", `/api/alumni/connections/${idAc}`, {
    cookie: ctx.cookie.b,
  });
  const statusSetelahPihakKetiga = await prisma.connection.findUnique({
    where: { id: idAc },
    select: { status: true },
  });
  cek(
    "pihak ketiga tidak bisa memutuskan koneksi (404) dan statusnya tidak berubah",
    putusPihakKetiga.status === 404 && statusSetelahPihakKetiga?.status === "ACCEPTED",
    `status=${putusPihakKetiga.status} koneksi=${statusSetelahPihakKetiga?.status}`
  );

  // Permintaan yang masih PENDING diputus lewat cancel, bukan DELETE.
  await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.b,
    body: { recipientAlumniId: ctx.alumni.c },
  });
  const barisBc = await prisma.connection.findUnique({
    where: { pairKey: pairKey(ctx.akun.b, ctx.akun.c) },
    select: { id: true },
  });
  const idBc = barisBc?.id ?? "";
  if (idBc) {
    await prisma.connection.update({
      where: { id: idBc },
      data: { status: "PENDING", respondedAt: null },
    });
  }
  const putusPending = await panggil("DELETE", `/api/alumni/connections/${idBc}`, {
    cookie: ctx.cookie.c,
  });
  cek(
    "DELETE hanya untuk ACCEPTED: permintaan PENDING dijawab 409",
    putusPending.status === 409 &&
      Boolean(putusPending.body.error?.fields?.connectionStatus),
    `status=${putusPending.status} fields=${JSON.stringify(putusPending.body.error?.fields)}`
  );

  const putus = await panggil("DELETE", `/api/alumni/connections/${idAc}`, {
    cookie: ctx.cookie.a,
  });
  const setelahPutus = await prisma.connection.findUnique({
    where: { id: idAc },
    select: { status: true, respondedAt: true },
  });
  cek(
    "peserta bisa memutuskan koneksi ACCEPTED (200 -> REVOKED, baris tetap ada)",
    putus.status === 200 &&
      setelahPutus?.status === "REVOKED" &&
      Boolean(setelahPutus.respondedAt),
    `status=${putus.status} koneksi=${setelahPutus?.status}`
  );

  const terhubungA = await panggil("GET", "/api/alumni/connections?tab=accepted&limit=50", {
    cookie: ctx.cookie.a,
  });
  const itemTerhubungA = (terhubungA.body.data ?? []) as { id?: string }[];
  const masihTerhubung = itemTerhubungA.some((item) => item.id === idAc);
  cek(
    "setelah diputus, koneksinya hilang dari daftar Terhubung",
    !masihTerhubung,
    `item=${itemTerhubungA.length}`
  );

  const direktoriA = await panggil("GET", "/api/public/alumni?limit=100", {
    cookie: ctx.cookie.a,
  });
  const kartuC = (
    (direktoriA.body.data ?? []) as { id?: string; connectionStatus?: string }[]
  ).find((kartu) => kartu.id === ctx.alumni.c);
  cek(
    "kartu direktori kembali menawarkan Hubungkan (connectionStatus NONE)",
    kartuC?.connectionStatus === "NONE",
    `connectionStatus=${kartuC?.connectionStatus}`
  );

  const auditRevoke = await prisma.auditLog.findFirst({
    where: { entitas: "Connection", aksi: "CONNECTION_REVOKE", alumniAccountId: ctx.akun.a },
  });
  cek(
    "audit CONNECTION_REVOKE mencatat ACCEPTED -> REVOKED dengan actor alumni",
    Boolean(auditRevoke) &&
      JSON.stringify(auditRevoke?.detailPerubahan ?? {}).includes("REVOKED") &&
      auditRevoke?.adminId === null,
    `detail=${JSON.stringify(auditRevoke?.detailPerubahan)}`
  );

  const hubungLagi = await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.a,
    body: { recipientAlumniId: ctx.alumni.c, message: "Terhubung lagi setelah diputus." },
  });
  const barisLagi = await prisma.connection.count({
    where: { pairKey: pairKey(ctx.akun.a, ctx.akun.c) },
  });
  cek(
    "setelah diputus, pasangan bisa mengirim permintaan baru (satu baris, hidup ulang)",
    hubungLagi.status === 201 && barisLagi === 1,
    `status=${hubungLagi.status} baris=${barisLagi}`
  );

  const putusDuaKali = await panggil("DELETE", `/api/alumni/connections/${idAc}`, {
    cookie: ctx.cookie.a,
  });
  cek(
    "memutus koneksi yang tidak ACCEPTED dijawab 409",
    putusDuaKali.status === 409,
    `status=${putusDuaKali.status}`
  );

  /* ---------- 14. Penanda belum dibaca (Task 21) ---------- */
  /*
   * `readAt` diisi hanya oleh `POST /api/alumni/connections/read`, bukan oleh
   * `GET`. Yang diuji: angka `meta.unread`, efek tandai-dibaca, idempotensinya,
   * dan bahwa penanda itu milik penerima (pengirim tidak bisa menandainya).
   */
  const pairKeyBaca = (x: string, y: string) => [x, y].sort().join(":");

  // Siapkan satu permintaan masuk baru untuk akun `b` dari akun `a`.
  const koneksiLama = await prisma.connection.findUnique({
    where: { pairKey: pairKeyBaca(ctx.akun.a, ctx.akun.b) },
    select: { id: true },
  });
  if (koneksiLama) {
    await prisma.connection.delete({ where: { id: koneksiLama.id } });
  }
  await panggil("POST", "/api/alumni/connections", {
    cookie: ctx.cookie.a,
    body: { recipientAlumniId: ctx.alumni.b, message: "Bahan uji belum dibaca." },
  });

  const unreadMasuk = await panggil("GET", "/api/alumni/connections?tab=incoming&limit=50", {
    cookie: ctx.cookie.b,
  });
  const unreadMeta = (unreadMasuk.body as { meta?: { total?: number; unread?: number } }).meta;
  cek(
    "permintaan baru dihitung belum dibaca pada meta.unread",
    unreadMeta?.total === 1 && unreadMeta?.unread === 1,
    `total=${unreadMeta?.total} unread=${unreadMeta?.unread}`
  );

  const dibacaA = await panggil("POST", "/api/alumni/connections/read", {
    cookie: ctx.cookie.a,
  });
  const masihBelumDibaca = await prisma.connection.count({
    where: { recipientAccountId: ctx.akun.b, status: "PENDING", readAt: null },
  });
  cek(
    "pengirim tidak bisa menandai permintaan orang lain sebagai dibaca",
    (dibacaA.body as { data?: { read?: number } }).data?.read === 0 &&
      masihBelumDibaca === 1,
    `read=${(dibacaA.body as { data?: { read?: number } }).data?.read} belumDibaca=${masihBelumDibaca}`
  );

  const dibacaB = await panggil("POST", "/api/alumni/connections/read", {
    cookie: ctx.cookie.b,
  });
  const unreadMasuk2 = await panggil("GET", "/api/alumni/connections?tab=incoming&limit=50", {
    cookie: ctx.cookie.b,
  });
  const unreadMeta2 = (unreadMasuk2.body as { meta?: { total?: number; unread?: number } }).meta;
  cek(
    "tandai-dibaca mengosongkan unread tapi daftarnya tetap ada",
    (dibacaB.body as { data?: { read?: number } }).data?.read === 1 &&
      unreadMeta2?.unread === 0 &&
      unreadMeta2?.total === 1,
    `read=${(dibacaB.body as { data?: { read?: number } }).data?.read} total=${unreadMeta2?.total} unread=${unreadMeta2?.unread}`
  );

  const dibacaLagi = await panggil("POST", "/api/alumni/connections/read", {
    cookie: ctx.cookie.b,
  });
  cek(
    "tandai-dibaca idempoten (panggilan kedua: 0)",
    (dibacaLagi.body as { data?: { read?: number } }).data?.read === 0,
    `read=${(dibacaLagi.body as { data?: { read?: number } }).data?.read}`
  );

  /* ---------- 15. Rate limit create ---------- */
  const batas = [];
  for (let i = 0; i < 21; i++) {
    const uji = await panggil("POST", "/api/alumni/connections", {
      cookie: ctx.cookie.r,
      body: { recipientAlumniId: ctx.alumni.b },
    });
    batas.push(uji.status);
  }
  cek(
    "rate limit create: percobaan ke-21 -> 429",
    batas[0] === 201 &&
      batas.slice(0, 20).every((status) => status === 201 || status === 409) &&
      batas[20] === 429,
    `urut=${JSON.stringify([batas[0], batas[1], batas[19], batas[20]])}`
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
          { entitas: "Connection", alumniAccountId: { in: idAkun } },
        ],
      },
    });
    await prisma.alumniAccount.deleteMany({ where: { id: { in: idAkun } } });
  }
  if (idAlumni.length > 0) {
    await prisma.alumni.deleteMany({ where: { id: { in: idAlumni } } });
  }
  await prisma.authRateLimit.deleteMany({ where: { updatedAt: { gte: mulai } } });
  await prisma.$disconnect();
}

console.log("\n===== VERIFIKASI KONEKSI ALUMNI =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
