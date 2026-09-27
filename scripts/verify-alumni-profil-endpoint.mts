#!/usr/bin/env tsx
/**
 * Verifikasi endpoint profil & preferensi alumni (BE Task 6).
 *
 * Menguji lewat HTTP sungguhan: GET profil, PATCH preferensi parsial, penolakan
 * field asing, isolasi antar akun (tidak ada cara menyentuh data akun lain),
 * efek suspend, dan pencatatan audit.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run alumni:profil-endpoint:verify
 *
 * Setup memakai endpoint yang sudah ada: register (Task 4) lalu approve oleh
 * admin seed (Task 5). Data uji memakai domain `.invalid` dan dihapus di blok
 * `finally`.
 */

import { existsSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { AksiAudit } from "../src/generated/prisma/enums";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD tidak ditemukan. Jalankan dari root project (ada .env)."
  );
  process.exit(1);
}

const prisma = new PrismaClient();

type DataAkun = {
  id?: string;
  email?: string;
  status?: string;
  message?: string;
  openToCollaboration?: boolean;
  openToOpportunity?: boolean;
  showEmailToConnections?: boolean;
  showWhatsappToConnections?: boolean;
  showSocialLinksToConnections?: boolean;
  alumni?: { id?: string } | null;
};

type BodyJson = {
  success?: boolean;
  data?: unknown;
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

const objekDari = (body: BodyJson): DataAkun | undefined =>
  body.data && !Array.isArray(body.data) ? (body.data as DataAkun) : undefined;

const stamp = Date.now();
const password = "KataSandiUji123!";
const idAkun: string[] = [];
const mulai = new Date();
const akunUji = (label: string) => `profil-${label}-${stamp}@contoh.invalid`;

/** Register + login (pending) + approve oleh admin + login ulang (ACTIVE). */
async function siapkanAkunAktif(
  label: string,
  alumniId: string | undefined,
  cookieAdmin: string
): Promise<{ id?: string; cookie?: string }> {
  const daftar = await panggil("POST", "/api/auth/alumni/register", {
    body: {
      namaLengkap: `Alumni Profil ${label.toUpperCase()}`,
      email: akunUji(label),
      angkatan: 2014,
      programStudi: "NUSANTARA",
      password,
      consentData: true,
    },
  });
  const id = objekDari(daftar.body)?.id;
  if (id) idAkun.push(id);

  const approve = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${id}/approve`,
    { cookie: cookieAdmin, body: { alumniId } }
  );
  if (approve.status !== 200) {
    throw new Error(
      `Approve akun uji gagal: ${approve.status} ${approve.body.error?.message ?? ""}`
    );
  }

  const login = await panggil("POST", "/api/auth/alumni/login", {
    body: { email: akunUji(label), password },
  });

  return {
    id,
    cookie: cookieDari(login.setCookie, "ikasada_alumni_session") ?? undefined,
  };
}

try {
  /* ---------- 0. Prasyarat ---------- */
  const admin = await prisma.adminUser.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  const loginAdmin = await panggil("POST", "/api/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const cookieAdmin = cookieDari(loginAdmin.setCookie, "ikasada_session");
  cek(
    "login admin seed berhasil (prasyarat)",
    loginAdmin.status === 200 && Boolean(cookieAdmin) && Boolean(admin),
    `status=${loginAdmin.status}`
  );
  if (!cookieAdmin) throw new Error("Tidak bisa lanjut tanpa session admin");

  const alumniBebas = await prisma.alumni.findMany({
    where: { account: null, deletedAt: null, status: "PUBLISHED" },
    select: { id: true },
    take: 2,
  });
  cek(
    "tersedia 2 record Alumni PUBLISHED bebas",
    alumniBebas.length === 2,
    `jumlah=${alumniBebas.length}`
  );

  /* ---------- 1. Otorisasi ---------- */
  cek(
    "GET profil tanpa session -> 401",
    (await panggil("GET", "/api/alumni/me/profile")).status === 401,
    "status=401"
  );
  cek(
    "PATCH preferensi tanpa session -> 401",
    (
      await panggil("PATCH", "/api/alumni/me/profile", {
        body: { openToCollaboration: true },
      })
    ).status === 401,
    "status=401"
  );

  /* ---------- 2. Akun PENDING tidak boleh menyentuh preferensi ---------- */
  const daftarPending = await panggil("POST", "/api/auth/alumni/register", {
    body: {
      namaLengkap: "Alumni Profil Pending",
      email: akunUji("pending"),
      angkatan: 2014,
      programStudi: "NUSANTARA",
      password,
      consentData: true,
    },
  });
  const idPending = objekDari(daftarPending.body)?.id;
  if (idPending) idAkun.push(idPending);

  const loginPending = await panggil("POST", "/api/auth/alumni/login", {
    body: { email: akunUji("pending"), password },
  });
  const cookiePending = cookieDari(loginPending.setCookie, "ikasada_alumni_session");
  cek(
    "session PENDING tetap aktif untuk melihat status",
    loginPending.status === 200 && Boolean(cookiePending),
    `status=${loginPending.status}`
  );
  const patchPending = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: cookiePending ?? undefined,
    body: { openToCollaboration: true },
  });
  cek(
    "PATCH preferensi dengan session PENDING -> 401",
    patchPending.status === 401,
    `status=${patchPending.status} message="${patchPending.body.error?.message}"`
  );
  cek(
    "GET profil dengan session PENDING -> 401 (endpoint privat)",
    (
      await panggil("GET", "/api/alumni/me/profile", {
        cookie: cookiePending ?? undefined,
      })
    ).status === 401,
    "status=401"
  );

  /* ---------- 3. Dua akun ACTIVE untuk uji isolasi ---------- */
  const akunA = await siapkanAkunAktif("a", alumniBebas[0]?.id, cookieAdmin);
  const akunB = await siapkanAkunAktif("b", alumniBebas[1]?.id, cookieAdmin);
  const statusSiap = await prisma.alumniAccount.findMany({
    where: { id: { in: [akunA.id ?? "", akunB.id ?? ""] } },
    select: { status: true },
  });
  cek(
    "dua akun ACTIVE siap dengan session masing-masing",
    Boolean(akunA.cookie && akunB.cookie) &&
      statusSiap.length === 2 &&
      statusSiap.every((a) => a.status === "ACTIVE"),
    `a=${akunA.id} b=${akunB.id} status=${statusSiap.map((a) => a.status).join(",")}`
  );

  const profilA = await panggil("GET", "/api/alumni/me/profile", {
    cookie: akunA.cookie,
  });
  const dataA = objekDari(profilA.body);
  cek(
    "GET profil ACTIVE -> 200 dengan lima preferensi default false",
    profilA.status === 200 &&
      dataA?.status === "ACTIVE" &&
      dataA?.openToCollaboration === false &&
      dataA?.openToOpportunity === false &&
      dataA?.showEmailToConnections === false &&
      dataA?.showWhatsappToConnections === false &&
      dataA?.showSocialLinksToConnections === false,
    `status=${profilA.status} collaboration=${dataA?.openToCollaboration} whatsapp=${dataA?.showWhatsappToConnections}`
  );
  cek(
    "GET profil tidak memuat passwordHash",
    !JSON.stringify(profilA.body).includes("passwordHash"),
    "tidak ada passwordHash"
  );

  /* ---------- 4. PATCH parsial ---------- */
  const patchSatu = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: akunA.cookie,
    body: { openToCollaboration: true },
  });
  const setelahPatchSatu = objekDari(patchSatu.body);
  cek(
    "PATCH satu field -> 200 dan hanya field itu yang berubah",
    patchSatu.status === 200 &&
      setelahPatchSatu?.openToCollaboration === true &&
      setelahPatchSatu?.openToOpportunity === false &&
      setelahPatchSatu?.showEmailToConnections === false,
    `status=${patchSatu.status} collaboration=${setelahPatchSatu?.openToCollaboration} opportunity=${setelahPatchSatu?.openToOpportunity}`
  );

  const patchVisibilitas = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: akunA.cookie,
    body: {
      showEmailToConnections: true,
      showWhatsappToConnections: true,
      showSocialLinksToConnections: true,
    },
  });
  const setelahVisibilitas = objekDari(patchVisibilitas.body);
  cek(
    "PATCH visibilitas kontak -> 200 dan nilai lama tetap",
    patchVisibilitas.status === 200 &&
      setelahVisibilitas?.showEmailToConnections === true &&
      setelahVisibilitas?.showWhatsappToConnections === true &&
      setelahVisibilitas?.showSocialLinksToConnections === true &&
      setelahVisibilitas?.openToCollaboration === true,
    `status=${patchVisibilitas.status} email=${setelahVisibilitas?.showEmailToConnections}`
  );

  const barisA = await prisma.alumniAccount.findUnique({
    where: { id: akunA.id },
    select: {
      openToCollaboration: true,
      openToOpportunity: true,
      showEmailToConnections: true,
      showWhatsappToConnections: true,
      showSocialLinksToConnections: true,
    },
  });
  cek(
    "database menyimpan hasil PATCH (server source of truth)",
    barisA?.openToCollaboration === true &&
      barisA?.showEmailToConnections === true &&
      barisA?.openToOpportunity === false,
    JSON.stringify(barisA)
  );

  /* ---------- 5. Field asing dan tipe salah ---------- */
  for (const [label, body] of [
    ["alumniId", { alumniId: "00000000-0000-0000-0000-000000000000" }],
    ["email", { email: "lain@contoh.invalid" }],
    ["status", { status: "ACTIVE" }],
    ["passwordHash", { passwordHash: "x" }],
    ["nilai non-boolean", { openToCollaboration: "true" }],
    ["body kosong", {}],
  ] as const) {
    const uji = await panggil("PATCH", "/api/alumni/me/profile", {
      cookie: akunA.cookie,
      body,
    });
    cek(
      `PATCH dengan ${label} -> 400`,
      uji.status === 400 && uji.body.error?.code === "VALIDATION_ERROR",
      `status=${uji.status} fields=${JSON.stringify(uji.body.error?.fields)}`
    );
  }

  const barisSetelahTolak = await prisma.alumniAccount.findUnique({
    where: { id: akunA.id },
    select: { email: true, status: true, openToCollaboration: true },
  });
  cek(
    "field asing tidak mengubah data di database",
    barisSetelahTolak?.email === akunUji("a") &&
      barisSetelahTolak?.status === "ACTIVE" &&
      barisSetelahTolak?.openToCollaboration === true,
    JSON.stringify(barisSetelahTolak)
  );

  /* ---------- 6. Isolasi antar akun ---------- */
  const patchB = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: akunB.cookie,
    body: { openToCollaboration: false, showWhatsappToConnections: true },
  });
  const profilASetelahB = objekDari(
    (
      await panggil("GET", "/api/alumni/me/profile", { cookie: akunA.cookie })
    ).body
  );
  const profilB = objekDari(patchB.body);
  cek(
    "PATCH akun B tidak menyentuh data akun A",
    patchB.status === 200 &&
      profilB?.openToCollaboration === false &&
      profilASetelahB?.openToCollaboration === true &&
      profilASetelahB?.showEmailToConnections === true &&
      profilB?.showEmailToConnections === false,
    `A.collaboration=${profilASetelahB?.openToCollaboration} B.collaboration=${profilB?.openToCollaboration}`
  );

  /* ---------- 7. Audit ---------- */
  const auditKeterbukaan = await prisma.auditLog.findFirst({
    where: {
      entitas: "AlumniAccount",
      entitasId: akunA.id,
      aksi: AksiAudit.ALUMNI_UPDATE_AVAILABILITY,
    },
  });
  const auditVisibilitas = await prisma.auditLog.findFirst({
    where: {
      entitas: "AlumniAccount",
      entitasId: akunA.id,
      aksi: AksiAudit.UPDATE,
    },
  });
  cek(
    "audit keterbukaan memakai actor alumni tanpa memalsukan admin",
    Boolean(auditKeterbukaan) &&
      auditKeterbukaan?.adminId === null &&
      auditKeterbukaan?.alumniAccountId === akunA.id,
    `aksi=${auditKeterbukaan?.aksi} adminId=${String(auditKeterbukaan?.adminId)}`
  );
  cek(
    "audit mencatat nilai dari -> ke",
    JSON.stringify(auditKeterbukaan?.detailPerubahan ?? {}).includes("false") &&
      JSON.stringify(auditKeterbukaan?.detailPerubahan ?? {}).includes("true"),
    `detail=${JSON.stringify(auditKeterbukaan?.detailPerubahan)}`
  );
  cek(
    "perubahan visibilitas tercatat sebagai UPDATE",
    Boolean(auditVisibilitas),
    `aksi=${auditVisibilitas?.aksi} detail=${JSON.stringify(auditVisibilitas?.detailPerubahan)}`
  );

  const auditSebelumNoop = await prisma.auditLog.count({
    where: { entitas: "AlumniAccount", entitasId: akunA.id },
  });
  await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: akunA.cookie,
    body: { openToCollaboration: true },
  });
  const auditSetelahNoop = await prisma.auditLog.count({
    where: { entitas: "AlumniAccount", entitasId: akunA.id },
  });
  cek(
    "PATCH tanpa perubahan nilai tidak menulis audit baru",
    auditSebelumNoop === auditSetelahNoop,
    `sebelum=${auditSebelumNoop} sesudah=${auditSetelahNoop}`
  );

  /* ---------- 8. Suspend memblokir mutation ---------- */
  await panggil("POST", `/api/admin/alumni-accounts/${akunA.id}/suspend`, {
    cookie: cookieAdmin,
  });
  const patchSetelahSuspend = await panggil("PATCH", "/api/alumni/me/profile", {
    cookie: akunA.cookie,
    body: { openToCollaboration: false },
  });
  cek(
    "setelah suspend, PATCH preferensi -> 401",
    patchSetelahSuspend.status === 401,
    `status=${patchSetelahSuspend.status} message="${patchSetelahSuspend.body.error?.message}"`
  );
  cek(
    "setelah suspend, nilai preferensi tidak berubah",
    (
      await prisma.alumniAccount.findUnique({
        where: { id: akunA.id },
        select: { openToCollaboration: true },
      })
    )?.openToCollaboration === true,
    "openToCollaboration tetap true"
  );
} catch (error) {
  cek("uji berjalan tanpa error tak terduga", false, String(error));
} finally {
  if (idAkun.length > 0) {
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
  await prisma.alumniAccount.deleteMany({
    where: { email: { contains: `-${stamp}@contoh.invalid` } },
  });
  await prisma.authRateLimit.deleteMany({ where: { updatedAt: { gte: mulai } } });
  await prisma.$disconnect();
}

console.log("\n===== VERIFIKASI PROFIL & PREFERENSI ALUMNI =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
