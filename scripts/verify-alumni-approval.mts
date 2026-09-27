#!/usr/bin/env tsx
/**
 * Verifikasi endpoint approval akun alumni (BE Task 5).
 *
 * Menguji lewat HTTP sungguhan sebagai admin (login memakai kredensial seed):
 * daftar akun, approve dengan pencocokan `Alumni`, reject, suspend, reset
 * password, plus pemeriksaan audit dan efeknya ke endpoint alumni.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run alumni:approval:verify
 *
 * Butuh `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD` di `.env` (akun seed yang
 * sudah ada di database). Data uji memakai domain `.invalid` dan dihapus lagi di
 * blok `finally`; record `Alumni` yang dipinjam hanya ditautkan sementara.
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
  approvedAt?: string | null;
  rejectedAt?: string | null;
  suspendedAt?: string | null;
  alumni?: { id?: string; namaLengkap?: string } | null;
};

type BodyJson = {
  success?: boolean;
  data?: unknown;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
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

const daftarDari = (body: BodyJson): DataAkun[] =>
  Array.isArray(body.data) ? (body.data as DataAkun[]) : [];

const stamp = Date.now();
const passwordLama = "KataSandiUji123!";
const passwordBaru = "KataSandiBaru456!";
const idAkun: string[] = [];
const mulai = new Date();
/**
 * Record `Alumni` asli yang dipakai uji. Approve kini menyelaraskan
 * `Alumni.email` dengan email akun (auto-isi saat kosong), jadi nilai aslinya
 * harus disimpan untuk dipulihkan di `finally` — kalau tidak, data seed
 * tercemar email uji `@contoh.invalid`.
 */
let alumniTerpakai: {
  id: string;
  namaLengkap: string;
  email: string | null;
} | null = null;

async function daftarAkunUji(label: string): Promise<string | undefined> {
  const res = await panggil("POST", "/api/auth/alumni/register", {
    body: {
      namaLengkap: `Alumni Uji ${label.toUpperCase()}`,
      email: `approval-${label}-${stamp}@contoh.invalid`,
      angkatan: 2013,
      programStudi: "SUNDA",
      password: passwordLama,
      consentData: true,
    },
  });
  const id = objekDari(res.body)?.id;
  if (id) idAkun.push(id);
  return id;
}

try {
  /* ---------- 0. Login admin ---------- */
  const admin = await prisma.adminUser.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  const loginAdmin = await panggil("POST", "/api/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const cookieAdmin = cookieDari(loginAdmin.setCookie, "ikasada_session") ?? undefined;
  cek(
    "login admin seed berhasil (prasyarat)",
    loginAdmin.status === 200 && Boolean(cookieAdmin) && Boolean(admin),
    `status=${loginAdmin.status} cookie=${cookieAdmin ? "ada" : "tidak ada"} adminId=${admin?.id}`
  );

  if (!cookieAdmin || !admin) {
    throw new Error("Tidak bisa lanjut tanpa session admin");
  }

  /* ---------- 1. Otorisasi ---------- */
  const listAnon = await panggil("GET", "/api/admin/alumni-accounts");
  cek(
    "GET daftar akun tanpa session admin -> 401",
    listAnon.status === 401,
    `status=${listAnon.status}`
  );

  /* ---------- 2. Data uji ---------- */
  const alumniTerpakaiDitemukan = await prisma.alumni.findFirst({
    where: { account: null, deletedAt: null, status: "PUBLISHED" },
    select: { id: true, namaLengkap: true, email: true },
  });
  alumniTerpakai = alumniTerpakaiDitemukan;
  const alumniTersembunyi = await prisma.alumni.findFirst({
    where: { account: null, deletedAt: null, status: "HIDDEN" },
    select: { id: true },
  });

  cek(
    "tersedia record Alumni PUBLISHED bebas untuk ditautkan",
    Boolean(alumniTerpakai),
    `alumni=${alumniTerpakai?.id ?? "-"}`
  );

  const idA = await daftarAkunUji("a");
  const idC = await daftarAkunUji("c");
  const statusAwal = await prisma.alumniAccount.findMany({
    where: { id: { in: [idA ?? "", idC ?? ""] } },
    select: { status: true },
  });
  cek(
    "dua akun uji terdaftar berstatus PENDING",
    Boolean(idA && idC) &&
      statusAwal.length === 2 &&
      statusAwal.every((a) => a.status === "PENDING"),
    `a=${idA} c=${idC} status=${statusAwal.map((a) => a.status).join(",")}`
  );

  /* ---------- 3. Daftar akun ---------- */
  const list = await panggil(
    "GET",
    "/api/admin/alumni-accounts?status=PENDING&limit=100",
    { cookie: cookieAdmin }
  );
  cek(
    "GET daftar akun PENDING -> 200 berisi akun baru + meta",
    list.status === 200 &&
      daftarDari(list.body).some((a) => a.id === idA) &&
      Number(list.body.meta?.total ?? 0) >= 2,
    `status=${list.status} total=${list.body.meta?.total} limit=${list.body.meta?.limit}`
  );
  cek(
    "daftar akun tidak pernah memuat passwordHash",
    !JSON.stringify(list.body).includes("passwordHash"),
    "tidak ada passwordHash di response"
  );
  cek(
    "filter status tidak valid diabaikan (tetap 200)",
    (
      await panggil("GET", "/api/admin/alumni-accounts?status=NGACO", {
        cookie: cookieAdmin,
      })
    ).status === 200,
    "status=200"
  );

  /* ---------- 4. Approve ---------- */
  const approve404 = await panggil(
    "POST",
    "/api/admin/alumni-accounts/tidak-ada/approve",
    { cookie: cookieAdmin, body: { alumniId: alumniTerpakai?.id } }
  );
  cek(
    "approve akun tidak dikenal -> 404",
    approve404.status === 404,
    `status=${approve404.status}`
  );

  const approveTanpaAlumniId = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idA}/approve`,
    { cookie: cookieAdmin, body: {} }
  );
  cek(
    "approve tanpa alumniId -> 400 pada field alumniId",
    approveTanpaAlumniId.status === 400 &&
      typeof approveTanpaAlumniId.body.error?.fields?.alumniId === "string",
    `status=${approveTanpaAlumniId.status} fields=${JSON.stringify(approveTanpaAlumniId.body.error?.fields)}`
  );

  const approveAlumniHilang = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idA}/approve`,
    {
      cookie: cookieAdmin,
      body: { alumniId: "00000000-0000-0000-0000-000000000000" },
    }
  );
  cek(
    "approve dengan alumniId tidak dikenal -> 400",
    approveAlumniHilang.status === 400 &&
      typeof approveAlumniHilang.body.error?.fields?.alumniId === "string",
    `status=${approveAlumniHilang.status}`
  );

  if (alumniTersembunyi) {
    const approveAlumniHidden = await panggil(
      "POST",
      `/api/admin/alumni-accounts/${idA}/approve`,
      { cookie: cookieAdmin, body: { alumniId: alumniTersembunyi.id } }
    );
    cek(
      "approve dengan Alumni HIDDEN -> 400 (harus PUBLISHED)",
      approveAlumniHidden.status === 400 &&
        typeof approveAlumniHidden.body.error?.fields?.alumniId === "string",
      `status=${approveAlumniHidden.status} message="${approveAlumniHidden.body.error?.message}"`
    );
  } else {
    cek(
      "tersedia record Alumni HIDDEN untuk uji validasi",
      false,
      "tidak ada Alumni HIDDEN tanpa akun di database"
    );
  }

  const approveA = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idA}/approve`,
    { cookie: cookieAdmin, body: { alumniId: alumniTerpakai?.id } }
  );
  const akunA = objekDari(approveA.body);
  cek(
    "approve valid -> 200 ACTIVE dengan alumni tertaut dan approvedAt",
    approveA.status === 200 &&
      akunA?.status === "ACTIVE" &&
      akunA?.alumni?.id === alumniTerpakai?.id &&
      Boolean(akunA?.approvedAt),
    `status=${approveA.status} data.status=${akunA?.status} alumni=${akunA?.alumni?.id}`
  );

  cek(
    "approve akun yang sudah ACTIVE -> 409",
    (
      await panggil("POST", `/api/admin/alumni-accounts/${idA}/approve`, {
        cookie: cookieAdmin,
        body: { alumniId: alumniTerpakai?.id },
      })
    ).status === 409,
    "status=409"
  );

  const approveDuplikat = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idC}/approve`,
    { cookie: cookieAdmin, body: { alumniId: alumniTerpakai?.id } }
  );
  cek(
    "approve Alumni yang sudah tertaut akun lain -> 409",
    approveDuplikat.status === 409,
    `status=${approveDuplikat.status} message="${approveDuplikat.body.error?.message}"`
  );

  /* ---------- 5. Akun hasil approve benar-benar bisa dipakai ---------- */
  const emailA = `approval-a-${stamp}@contoh.invalid`;
  const loginA = await panggil("POST", "/api/auth/alumni/login", {
    body: { email: emailA, password: passwordLama },
  });
  const cookieA = cookieDari(loginA.setCookie, "ikasada_alumni_session");
  cek(
    "setelah approve, alumni bisa login ACTIVE",
    loginA.status === 200 && objekDari(loginA.body)?.status === "ACTIVE",
    `status=${loginA.status} data.status=${objekDari(loginA.body)?.status}`
  );
  const meA = await panggil("GET", "/api/auth/alumni/me", {
    cookie: cookieA ?? undefined,
  });
  cek(
    "setelah approve, /me memuat preferensi keterbukaan",
    meA.status === 200 && JSON.stringify(meA.body).includes("openToCollaboration"),
    `status=${meA.status}`
  );

  /* ---------- 6. Suspend ---------- */
  cek(
    "suspend akun PENDING -> 409",
    (
      await panggil("POST", `/api/admin/alumni-accounts/${idC}/suspend`, {
        cookie: cookieAdmin,
      })
    ).status === 409,
    "status=409"
  );

  const suspendA = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idA}/suspend`,
    { cookie: cookieAdmin }
  );
  const akunASuspend = objekDari(suspendA.body);
  cek(
    "suspend akun ACTIVE -> 200 SUSPENDED dengan suspendedAt",
    suspendA.status === 200 &&
      akunASuspend?.status === "SUSPENDED" &&
      Boolean(akunASuspend?.suspendedAt),
    `status=${suspendA.status} data.status=${akunASuspend?.status}`
  );
  cek(
    "setelah suspend, login alumni ditolak 401",
    (
      await panggil("POST", "/api/auth/alumni/login", {
        body: { email: emailA, password: passwordLama },
      })
    ).status === 401,
    "status=401"
  );
  const meASuspend = await panggil("GET", "/api/auth/alumni/me", {
    cookie: cookieA ?? undefined,
  });
  cek(
    "setelah suspend, session lama langsung ditolak di /me",
    meASuspend.status === 401,
    `status=${meASuspend.status} message="${meASuspend.body.error?.message}"`
  );

  const approvePemulihan = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idA}/approve`,
    { cookie: cookieAdmin, body: { alumniId: alumniTerpakai?.id } }
  );
  cek(
    "approve ulang akun SUSPENDED -> 200 ACTIVE (suspend tidak satu arah)",
    approvePemulihan.status === 200 &&
      objekDari(approvePemulihan.body)?.status === "ACTIVE",
    `status=${approvePemulihan.status} data.status=${objekDari(approvePemulihan.body)?.status}`
  );

  /* ---------- 7. Reject ---------- */
  cek(
    "reject akun ACTIVE -> 409 (memakai suspend)",
    (
      await panggil("POST", `/api/admin/alumni-accounts/${idA}/reject`, {
        cookie: cookieAdmin,
      })
    ).status === 409,
    "status=409"
  );

  const rejectC = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idC}/reject`,
    { cookie: cookieAdmin }
  );
  const akunCReject = objekDari(rejectC.body);
  cek(
    "reject akun PENDING -> 200 REJECTED dengan rejectedAt",
    rejectC.status === 200 &&
      akunCReject?.status === "REJECTED" &&
      Boolean(akunCReject?.rejectedAt),
    `status=${rejectC.status} data.status=${akunCReject?.status}`
  );
  cek(
    "akun REJECTED tidak dihapus dan tidak bisa login",
    (await prisma.alumniAccount.count({ where: { id: idC } })) === 1 &&
      (
        await panggil("POST", "/api/auth/alumni/login", {
          body: {
            email: `approval-c-${stamp}@contoh.invalid`,
            password: passwordLama,
          },
        })
      ).status === 401,
    "row tetap ada, login=401"
  );
  cek(
    "reject ulang akun REJECTED -> 409",
    (
      await panggil("POST", `/api/admin/alumni-accounts/${idC}/reject`, {
        cookie: cookieAdmin,
      })
    ).status === 409,
    "status=409"
  );

  /* ---------- 8. Reset password ---------- */
  const resetLemah = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idA}/reset-password`,
    { cookie: cookieAdmin, body: { password: "pendek12" } }
  );
  cek(
    "reset password < 12 karakter -> 400 pada field password",
    resetLemah.status === 400 &&
      typeof resetLemah.body.error?.fields?.password === "string",
    `status=${resetLemah.status} fields=${JSON.stringify(resetLemah.body.error?.fields)}`
  );

  cek(
    "reset password akun tidak dikenal -> 404",
    (
      await panggil("POST", "/api/admin/alumni-accounts/tidak-ada/reset-password", {
        cookie: cookieAdmin,
        body: { password: passwordBaru },
      })
    ).status === 404,
    "status=404"
  );

  const reset = await panggil(
    "POST",
    `/api/admin/alumni-accounts/${idA}/reset-password`,
    { cookie: cookieAdmin, body: { password: passwordBaru } }
  );
  cek(
    "reset password valid -> 200",
    reset.status === 200,
    `status=${reset.status} message="${objekDari(reset.body)?.message}"`
  );
  cek(
    "reset password tidak mengembalikan kata sandi ke response",
    !JSON.stringify(reset.body).includes(passwordBaru) &&
      !JSON.stringify(reset.body).includes("passwordHash"),
    `panjang body=${JSON.stringify(reset.body).length}`
  );
  cek(
    "setelah reset, kata sandi lama tidak berlaku",
    (
      await panggil("POST", "/api/auth/alumni/login", {
        body: { email: emailA, password: passwordLama },
      })
    ).status === 401,
    "status=401"
  );
  cek(
    "setelah reset, kata sandi baru berlaku",
    (
      await panggil("POST", "/api/auth/alumni/login", {
        body: { email: emailA, password: passwordBaru },
      })
    ).status === 200,
    "status=200"
  );

  /* ---------- 9. Audit ---------- */
  const audit = (entitasId: string | undefined, aksi: AksiAudit) =>
    prisma.auditLog.findFirst({ where: { entitas: "AlumniAccount", entitasId, aksi } });

  const auditApprove = await audit(idA, AksiAudit.ALUMNI_APPROVE);
  const auditSuspend = await audit(idA, AksiAudit.ALUMNI_SUSPEND);
  const auditReject = await audit(idC, AksiAudit.ALUMNI_REJECT);
  const auditReset = await audit(idA, AksiAudit.UPDATE);

  cek(
    "audit approve/suspend/reject memakai actor admin, bukan alumni",
    auditApprove?.adminId === admin.id &&
      auditApprove?.alumniAccountId === null &&
      auditSuspend?.adminId === admin.id &&
      auditSuspend?.alumniAccountId === null &&
      auditReject?.adminId === admin.id &&
      auditReject?.alumniAccountId === null,
    `approve=${auditApprove?.adminId} suspend=${auditSuspend?.adminId} reject=${auditReject?.adminId}`
  );
  cek(
    "audit approve mencatat perubahan status ke ACTIVE",
    JSON.stringify(auditApprove?.detailPerubahan ?? {}).includes("ACTIVE"),
    `detail=${JSON.stringify(auditApprove?.detailPerubahan)}`
  );
  cek(
    "audit reset password tidak menyimpan kata sandi atau hash",
    Boolean(auditReset) &&
      !JSON.stringify(auditReset?.detailPerubahan ?? {}).includes(passwordBaru) &&
      !JSON.stringify(auditReset?.detailPerubahan ?? {}).includes("$2"),
    `detail=${JSON.stringify(auditReset?.detailPerubahan)}`
  );
} catch (error) {
  cek("uji berjalan tanpa error tak terduga", false, String(error));
} finally {
  /*
   * Pembersihan: audit dan akun uji dihapus, rate limit yang tercatat selama
   * pengujian dibuang, dan penautan ke `Alumni` lepas sendiri saat akunnya
   * hilang karena `alumniId` ada di tabel akun.
   */
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

  /*
   * Pulihkan record `Alumni` asli. Approve menyelaraskan `Alumni.email` dengan
   * email akun (auto-isi saat kosong) dan menulis audit `UPDATE` pada entitas
   * `Alumni`; keduanya dikembalikan supaya data seed tidak tercemar email uji.
   */
  if (alumniTerpakai) {
    await prisma.auditLog.deleteMany({
      where: {
        entitas: "Alumni",
        entitasId: alumniTerpakai.id,
        createdAt: { gte: mulai },
      },
    });
    await prisma.alumni.update({
      where: { id: alumniTerpakai.id },
      data: { email: alumniTerpakai.email },
    });
  }

  await prisma.authRateLimit.deleteMany({ where: { updatedAt: { gte: mulai } } });
  await prisma.$disconnect();
}

console.log("\n===== VERIFIKASI APPROVAL AKUN ALUMNI =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
