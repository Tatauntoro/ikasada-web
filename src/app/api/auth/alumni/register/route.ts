import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  conflict,
  created,
  tooManyRequests,
  validationError,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { catatAudit } from "@/lib/audit";
import { publikasiNotifikasi } from "@/lib/notifikasi-events";
import {
  ambilIpKlien,
  catatPercobaan,
  cekRateLimit,
} from "@/lib/rate-limit";
import { alumniRegisterSchema } from "@/lib/validations/alumni-account";
import { logPeristiwa, requestIdDari } from "@/lib/log";

/**
 * Registrasi alumni (BE-Planning §3.2).
 *
 * Akun selalu lahir `PENDING` dan **tidak** mendapat session: pengurus yang
 * mencocokkan akun dengan record `Alumni` di Task 5.
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 menit
const MAX_PER_IP = 10;
const MAX_PER_EMAIL = 5;
const BCRYPT_ROUNDS = 10;

async function handler(req: NextRequest): Promise<Response> {
  const body = await readJsonBody(req);

  const parsed = alumniRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { namaLengkap, email, angkatan, programStudi, password } = parsed.data;

  const opsiIp = {
    scope: "alumni_register_ip",
    key: ambilIpKlien(req),
    maxAttempts: MAX_PER_IP,
    windowMs: WINDOW_MS,
  };
  const opsiEmail = {
    scope: "alumni_register_email",
    key: email,
    maxAttempts: MAX_PER_EMAIL,
    windowMs: WINDOW_MS,
  };

  const [cekIp, cekEmail] = await Promise.all([
    cekRateLimit(opsiIp),
    cekRateLimit(opsiEmail),
  ]);
  if (cekIp.blocked || cekEmail.blocked) {
    logPeristiwa("rate_limit", {
      requestId: requestIdDari(req),
      endpoint: "/api/auth/alumni/register",
      scope: cekEmail.blocked ? "email" : "ip",
    });

    return tooManyRequests(
      "Terlalu banyak percobaan pendaftaran. Silakan coba lagi nanti."
    );
  }

  // Dihitung sejak request lolos validasi, supaya percobaan berulang tercatat.
  await Promise.all([catatPercobaan(opsiIp), catatPercobaan(opsiEmail)]);

  const emailTerdaftar = await prisma.alumniAccount.findUnique({
    where: { email },
    select: { id: true },
  });

  if (emailTerdaftar) {
    /*
     * Pesannya sengaja seragam dan tidak menyebut status, tanggal, atau data
     * akun yang sudah ada. Tanpa email provider (out of scope) enumerasi email
     * tidak bisa dihilangkan sepenuhnya, tetapi tidak ada detail yang bocor.
     */
    return conflict("Email sudah terdaftar. Silakan masuk atau gunakan email lain.");
  }

  const passwordHash = await hash(password, BCRYPT_ROUNDS);

  const akun = await prisma.$transaction(async (tx) => {
    const dibuat = await tx.alumniAccount.create({
      data: {
        email,
        passwordHash,
        status: "PENDING",
        namaLengkapSaatDaftar: namaLengkap,
        angkatanSaatDaftar: angkatan,
        programStudiSaatDaftar: programStudi,
        consentDataAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        status: true,
        namaLengkapSaatDaftar: true,
        angkatanSaatDaftar: true,
        programStudiSaatDaftar: true,
        consentDataAt: true,
        createdAt: true,
      },
    });

    await catatAudit(tx, {
      alumniAccountId: dibuat.id,
      aksi: "ALUMNI_REGISTER",
      entitas: "AlumniAccount",
      entitasId: dibuat.id,
    });

    return dibuat;
  });

  /*
   * Ping realtime untuk inbox admin. Persistennya tetap baris AuditLog di atas,
   * jadi sinyal ini boleh hilang tanpa menghilangkan notifikasi.
   */
  publikasiNotifikasi({ aksi: "ALUMNI_REGISTER", entitasId: akun.id });

  return created(akun);
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
