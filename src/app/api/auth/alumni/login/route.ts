import { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { StatusAlumniAccount } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  ok,
  tooManyRequests,
  unauthorized,
  validationError,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import {
  ALUMNI_TOKEN_TYPE,
  setAlumniSessionCookie,
  signAlumniToken,
} from "@/lib/auth-alumni";
import { catatAudit } from "@/lib/audit";
import {
  ambilIpKlien,
  catatPercobaan,
  cekRateLimit,
  resetRateLimit,
  sidikJari,
} from "@/lib/rate-limit";
import { logPeristiwa, requestIdDari } from "@/lib/log";
import {
  alumniLoginSchema,
  pathInternalAman,
} from "@/lib/validations/alumni-account";
import {
  alumniAccountSelect,
  toAlumniAccountResponse,
} from "@/lib/mapper-alumni-account";

/**
 * Login alumni (BE-Planning §3.3).
 *
 * Semua kegagalan kredensial memakai satu pesan generik supaya tidak bisa
 * dipakai menebak email terdaftar. Akun `PENDING` tetap mendapat session —
 * hanya untuk melihat status verifikasi (master planning §6) — sedangkan
 * `REJECTED` dan `SUSPENDED` tidak.
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 menit
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

const PESAN_GAGAL = "Email atau kata sandi salah";

// Hash dummy untuk menyamakan waktu respons saat email tidak ditemukan.
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

async function handler(req: NextRequest): Promise<Response> {
  const body = await readJsonBody(req);

  const parsed = alumniLoginSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { email, password, next, ingatSaya } = parsed.data;

  const opsiEmail = {
    scope: "alumni_login_email",
    key: email,
    maxAttempts: MAX_PER_EMAIL,
    windowMs: WINDOW_MS,
  };
  const opsiIp = {
    scope: "alumni_login_ip",
    key: ambilIpKlien(req),
    maxAttempts: MAX_PER_IP,
    windowMs: WINDOW_MS,
  };

  const [cekEmail, cekIp] = await Promise.all([
    cekRateLimit(opsiEmail),
    cekRateLimit(opsiIp),
  ]);
  if (cekEmail.blocked || cekIp.blocked) {
    /*
     * Peristiwa `rate_limit` dicatat supaya pola brute force terlihat di log
     * tanpa perlu membuka tabel (BE-Planning §9). Identifier tetap sebagai
     * sidik jari, bukan email mentah.
     */
    logPeristiwa("rate_limit", {
      requestId: requestIdDari(req),
      endpoint: "/api/auth/alumni/login",
      scope: cekEmail.blocked ? "email" : "ip",
      sidikJari: sidikJari("alumni_login_email", email),
      retryAfterDetik: Math.max(cekEmail.retryAfterDetik, cekIp.retryAfterDetik),
    });

    return tooManyRequests(
      "Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit."
    );
  }

  const akun = await prisma.alumniAccount.findUnique({
    where: { email },
    select: { ...alumniAccountSelect, passwordHash: true },
  });

  if (!akun) {
    // Tetap bandingkan agar waktu respons tidak membocorkan keberadaan email.
    await compare(password, DUMMY_HASH);
    await Promise.all([catatPercobaan(opsiEmail), catatPercobaan(opsiIp)]);
    logPeristiwa("login_gagal", {
      requestId: requestIdDari(req),
      endpoint: "/api/auth/alumni/login",
      alasan: "email_tidak_dikenal",
      sidikJariEmail: sidikJari("alumni_login_email", email),
    });
    return unauthorized(PESAN_GAGAL);
  }

  const cocok = await compare(password, akun.passwordHash);
  if (!cocok) {
    await Promise.all([catatPercobaan(opsiEmail), catatPercobaan(opsiIp)]);
    logPeristiwa("login_gagal", {
      requestId: requestIdDari(req),
      endpoint: "/api/auth/alumni/login",
      alasan: "kata_sandi_salah",
      sidikJariEmail: sidikJari("alumni_login_email", email),
    });
    return unauthorized(PESAN_GAGAL);
  }

  if (
    akun.status === StatusAlumniAccount.REJECTED ||
    akun.status === StatusAlumniAccount.SUSPENDED
  ) {
    // Kata sandi benar, jadi bukan percobaan brute force: hitungan dibersihkan.
    await Promise.all([resetRateLimit(opsiEmail), resetRateLimit(opsiIp)]);
    return unauthorized(
      akun.status === StatusAlumniAccount.REJECTED
        ? "Pendaftaran akun ini tidak disetujui pengurus."
        : "Akun ini sedang ditangguhkan. Hubungi pengurus."
    );
  }

  if (akun.status === StatusAlumniAccount.ACTIVE && !akun.alumni) {
    // Pengaman data: token ACTIVE wajib membawa `alumniId`. Tanpa ini session
    // akan terbit tetapi selalu ditolak saat dipakai.
    await Promise.all([resetRateLimit(opsiEmail), resetRateLimit(opsiIp)]);
    return unauthorized("Akun belum tertaut ke data alumni. Hubungi pengurus.");
  }

  await Promise.all([resetRateLimit(opsiEmail), resetRateLimit(opsiIp)]);

  const token = await signAlumniToken(
    {
      sub: akun.id,
      alumniId: akun.alumni?.id ?? null,
      type: ALUMNI_TOKEN_TYPE,
      status: akun.status,
    },
    { ingatSaya }
  );

  const { passwordHash, ...akunRingkas } = akun;
  void passwordHash;

  await prisma.$transaction(async (tx) => {
    await tx.alumniAccount.update({
      where: { id: akun.id },
      data: { lastLoginAt: new Date() },
    });

    await catatAudit(tx, {
      alumniAccountId: akun.id,
      aksi: "ALUMNI_LOGIN",
      entitas: "AlumniAccount",
      entitasId: akun.id,
    });
  });

  await setAlumniSessionCookie(token, ingatSaya);

  return ok({
    ...toAlumniAccountResponse(akunRingkas),
    /*
     * Akun pending selalu diarahkan ke halaman status, bukan ke `next`.
     * Akun `ACTIVE` tanpa `next` mendarat di profil — di sanalah ia mengatur
     * status keterbukaan dan melihat datanya sendiri lebih dulu.
     */
    redirectTo:
      akun.status === StatusAlumniAccount.ACTIVE
        ? pathInternalAman(next, "/alumni/profil")
        : "/alumni/status",
  });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
