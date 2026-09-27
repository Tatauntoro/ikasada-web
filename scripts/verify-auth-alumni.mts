#!/usr/bin/env tsx
/**
 * Verifikasi library session alumni (`src/lib/auth-alumni.ts`).
 *
 * Menguji empat hal yang diminta Task 3 sekaligus satu risiko yang ditemukan
 * saat mengerjakannya:
 *
 * 1. Session alumni valid bisa ditandatangani dan diverifikasi.
 * 2. Token expired, tanda tangan diubah, dan secret berbeda ditolak.
 * 3. Token tidak bisa lintas pakai: token admin ditolak verifikasi alumni, dan
 *    token alumni ditolak verifikasi admin. Yang terakhir ini penting karena
 *    kedua token memakai JWT_SECRET yang sama — sebelumnya token alumni yang
 *    dipasang di cookie `ikasada_session` diterima sebagai session admin di
 *    `/api/admin/*`.
 * 4. Nama cookie dan opsi keamanannya berbeda dari cookie admin.
 *
 * Pakai: npm run auth:verify
 *
 * Catatan: di sini yang diperiksa kontrak library dan opsi cookie, tanpa HTTP.
 * Penulisan/penghapusan cookie lewat endpoint diuji di
 * `scripts/verify-alumni-auth-endpoints.mts` (`npm run auth:endpoints:verify`).
 */

import { existsSync } from "node:fs";
import { SignJWT } from "jose";
import {
  ALUMNI_SESSION_COOKIE_NAME,
  ALUMNI_TOKEN_TYPE,
  alumniCookieOptions,
  signAlumniToken,
  verifyAlumniToken,
  type AlumniSessionPayload,
} from "../src/lib/auth-alumni";
import { SESSION_COOKIE_NAME, signToken, verifyToken } from "../src/lib/auth";

/*
 * Memuat `.env` lewat API bawaan Node, bukan `dotenv`: dotenv hanya ada di
 * project ini sebagai dependency transitif Prisma, jadi jangan diandalkan.
 */
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET tidak ditemukan. Jalankan dari root project (ada .env).");
  process.exit(1);
}

const hasil: { nama: string; lulus: boolean; detail: string }[] = [];
const catat = (nama: string, lulus: boolean, detail: string) =>
  hasil.push({ nama, lulus, detail });

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const sesi: AlumniSessionPayload = {
  sub: "akun-uji-123",
  alumniId: "alumni-uji-456",
  type: ALUMNI_TOKEN_TYPE,
  status: "ACTIVE",
};

/* ---------- 1. Session alumni valid ---------- */
const token = await signAlumniToken(sesi);
const terverifikasi = await verifyAlumniToken(token);
catat(
  "session alumni valid bisa ditandatangani dan diverifikasi",
  terverifikasi?.sub === sesi.sub &&
    terverifikasi?.alumniId === sesi.alumniId &&
    terverifikasi?.type === "alumni" &&
    terverifikasi?.status === "ACTIVE",
  `hasil=${JSON.stringify(terverifikasi)}`
);

/* ---------- 1b. Bentuk token per status (dibuka di Task 4) ---------- */
/*
 * Master planning §6 mengizinkan akun PENDING login untuk melihat status
 * verifikasinya, jadi token PENDING yang sah memang ada. Invariantnya:
 * `alumniId` wajib ada tepat saat ACTIVE, dan wajib kosong saat PENDING.
 */
const sesiPending = await signAlumniToken({
  sub: "akun-uji-123",
  alumniId: null,
  type: ALUMNI_TOKEN_TYPE,
  status: "PENDING",
});
const pendingTerbaca = await verifyAlumniToken(sesiPending);
catat(
  "token akun PENDING (alumniId kosong) diterima",
  pendingTerbaca?.status === "PENDING" && pendingTerbaca?.alumniId === null,
  `hasil=${JSON.stringify(pendingTerbaca)}`
);

async function tokenDenganKlaim(klaim: Record<string, unknown>): Promise<string> {
  return new SignJWT(klaim)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(secret);
}

const tokenPendingBawaAlumniId = await tokenDenganKlaim({
  sub: "akun-uji-123",
  alumniId: "alumni-uji-456",
  type: ALUMNI_TOKEN_TYPE,
  status: "PENDING",
});
catat(
  "token PENDING yang membawa alumniId ditolak",
  (await verifyAlumniToken(tokenPendingBawaAlumniId)) === null,
  "verify -> null"
);

const tokenActiveTanpaAlumniId = await tokenDenganKlaim({
  sub: "akun-uji-123",
  type: ALUMNI_TOKEN_TYPE,
  status: "ACTIVE",
});
catat(
  "token ACTIVE tanpa alumniId ditolak",
  (await verifyAlumniToken(tokenActiveTanpaAlumniId)) === null,
  "verify -> null"
);

for (const status of ["REJECTED", "SUSPENDED"]) {
  const tokenStatusTerlarang = await tokenDenganKlaim({
    sub: "akun-uji-123",
    alumniId: "alumni-uji-456",
    type: ALUMNI_TOKEN_TYPE,
    status,
  });
  catat(
    `token dengan status ${status} ditolak`,
    (await verifyAlumniToken(tokenStatusTerlarang)) === null,
    "verify -> null"
  );
}

const tokenStatusAneh = await tokenDenganKlaim({
  sub: "akun-uji-123",
  alumniId: "alumni-uji-456",
  type: ALUMNI_TOKEN_TYPE,
  status: "DIHAPUS",
});
catat(
  "token dengan status tidak dikenal ditolak",
  (await verifyAlumniToken(tokenStatusAneh)) === null,
  "verify -> null"
);

/* ---------- 2. Token yang harus ditolak ---------- */
const kadaluarsa = await new SignJWT({ ...sesi })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
  .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
  .sign(secret);
catat(
  "token alumni expired ditolak",
  (await verifyAlumniToken(kadaluarsa)) === null,
  "verify -> null"
);

const bagian = token.split(".");
const tandaTanganPalsu = `${bagian[0]}.${bagian[1]}.${bagian[2].slice(0, -4)}AAAA`;
catat(
  "token dengan tanda tangan diubah ditolak",
  (await verifyAlumniToken(tandaTanganPalsu)) === null,
  "verify -> null"
);

const secretLain = new TextEncoder().encode("secret-yang-berbeda-sama-sekali-1234567890");
const tokenSecretLain = await new SignJWT({ ...sesi })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
  .sign(secretLain);
catat(
  "token bertanda tangan secret lain ditolak",
  (await verifyAlumniToken(tokenSecretLain)) === null,
  "verify -> null"
);

/* ---------- 3. Token tidak lintas pakai ---------- */
const tokenAdmin = await signToken({
  sub: "admin-uji",
  nama: "Admin Uji",
  email: "admin@example.invalid",
});

catat(
  "token admin ditolak oleh verifikasi alumni",
  (await verifyAlumniToken(tokenAdmin)) === null,
  "klaim `type` tidak ada -> null"
);

const tokenAlumniTerbacaAdmin = await verifyToken(token);
catat(
  "token alumni ditolak oleh verifikasi admin (lubang /api/admin/*)",
  tokenAlumniTerbacaAdmin === null,
  tokenAlumniTerbacaAdmin === null
    ? "verifyToken -> null"
    : `MASIH LOLOS sebagai ${JSON.stringify(tokenAlumniTerbacaAdmin)}`
);

const tokenAdminTerbacaAdmin = await verifyToken(tokenAdmin);
catat(
  "tidak ada regresi: token admin asli tetap diterima",
  tokenAdminTerbacaAdmin?.sub === "admin-uji" &&
    tokenAdminTerbacaAdmin?.nama === "Admin Uji",
  `hasil=${JSON.stringify(tokenAdminTerbacaAdmin)}`
);

/* ---------- 4. Cookie terpisah ---------- */
/* Dilebarkan ke `string` supaya perbandingannya tetap diuji saat runtime. */
const namaCookieAlumni: string = ALUMNI_SESSION_COOKIE_NAME;
const namaCookieAdmin: string = SESSION_COOKIE_NAME;
catat(
  "nama cookie alumni berbeda dari cookie admin",
  namaCookieAlumni !== namaCookieAdmin &&
    namaCookieAlumni === "ikasada_alumni_session",
  `alumni="${namaCookieAlumni}" admin="${namaCookieAdmin}"`
);

const opsi = alumniCookieOptions();
catat(
  "opsi cookie alumni: flag aman + session cookie tanpa 'ingat saya'",
  opsi.httpOnly === true &&
    opsi.sameSite === "lax" &&
    opsi.path === "/" &&
    opsi.maxAge === undefined,
  `httpOnly=${opsi.httpOnly} sameSite=${opsi.sameSite} path=${opsi.path} maxAge=${opsi.maxAge}`
);

const opsiIngat = alumniCookieOptions(true);
catat(
  '"ingat saya" membuat cookie persistent 30 hari',
  opsiIngat.maxAge === 30 * 24 * 60 * 60,
  `maxAge=${opsiIngat.maxAge}s (harap ${30 * 24 * 60 * 60}s)`
);

/*
 * Flag `secure` bergantung NODE_ENV, jadi diuji dengan menyetel env-nya
 * bergantian — bukan sekadar membandingkan dengan ekspresi yang sama seperti
 * di kode.
 */
/* `NODE_ENV` read-only di tipe Node, jadi diakses lewat tampilan record. */
const env = process.env as Record<string, string | undefined>;
const nodeEnvAsli = env.NODE_ENV;
env.NODE_ENV = "development";
const opsiDev = alumniCookieOptions();
env.NODE_ENV = "production";
const opsiProd = alumniCookieOptions();
env.NODE_ENV = nodeEnvAsli;
catat(
  "flag `secure` menyala hanya di production",
  opsiDev.secure === false && opsiProd.secure === true,
  `development.secure=${opsiDev.secure} production.secure=${opsiProd.secure}`
);

/* ---------- laporan ---------- */
console.log("\n===== VERIFIKASI AUTH ALUMNI =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
