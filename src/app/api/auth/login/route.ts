import { compare } from "bcryptjs";
import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  ok,
  unauthorized,
  tooManyRequests,
  validationError,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { setSessionCookie, signToken } from "@/lib/auth";
import {
  ambilIpKlien,
  catatPercobaan,
  cekRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit";
import { opsiLoginAdminEmail, opsiLoginAdminIp } from "@/lib/rate-limit-admin";

/**
 * Login admin.
 *
 * Rate limit memakai tabel `AuthRateLimit` (lihat `@/lib/rate-limit`), bukan
 * `Map` di memory, supaya blokir konsisten lintas instance dan tidak hilang
 * saat redeploy. Pola ini sama dengan login alumni.
 */

const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
  /** "Ingat saya" — memperpanjang sesi menjadi 30 hari (cookie persistent). */
  ingatSaya: z.boolean().optional(),
});

// Hash dummy untuk menyamakan waktu respons saat email tidak ditemukan.
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function handler(req: NextRequest): Promise<Response> {
  const body = await readJsonBody(req);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const email = normalizeEmail(parsed.data.email);
  const { password, ingatSaya } = parsed.data;

  const opsiEmail = opsiLoginAdminEmail(email);
  const opsiIp = opsiLoginAdminIp(ambilIpKlien(req));

  const [cekEmail, cekIp] = await Promise.all([
    cekRateLimit(opsiEmail),
    cekRateLimit(opsiIp),
  ]);
  if (cekEmail.blocked || cekIp.blocked) {
    return tooManyRequests(
      "Terlalu banyak percobaan gagal. Silakan coba lagi setelah 15 menit."
    );
  }

  const admin = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!admin) {
    // Tetap lakukan perbandingan agar waktu respons tidak membocorkan
    // apakah email terdaftar atau tidak.
    await compare(password, DUMMY_HASH);
    await Promise.all([catatPercobaan(opsiEmail), catatPercobaan(opsiIp)]);
    return unauthorized("Email atau kata sandi salah");
  }

  const isPasswordValid = await compare(password, admin.passwordHash);

  if (!isPasswordValid) {
    await Promise.all([catatPercobaan(opsiEmail), catatPercobaan(opsiIp)]);
    return unauthorized("Email atau kata sandi salah");
  }

  // Kata sandi benar: bersihkan hitungan sebelum memeriksa status akun.
  await Promise.all([resetRateLimit(opsiEmail), resetRateLimit(opsiIp)]);

  // Akun yang dinonaktifkan superadmin tidak boleh masuk (kata sandi benar pun).
  if (!admin.isAktif) {
    return unauthorized("Akun admin ini dinonaktifkan. Hubungi superadmin.");
  }

  // Update last login
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await signToken(
    {
      sub: admin.id,
      nama: admin.nama,
      email: admin.email,
    },
    { ingatSaya }
  );

  await setSessionCookie(token, ingatSaya);

  const { passwordHash, ...adminWithoutPassword } = admin;
  void passwordHash;
  return ok({
    ...adminWithoutPassword,
    lastLoginAt: new Date(),
  });
}

export const POST = apiHandlerWithoutParams(handler);
