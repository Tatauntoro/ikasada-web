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

const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
  /** "Ingat saya" — memperpanjang sesi menjadi 30 hari (cookie persistent). */
  ingatSaya: z.boolean().optional(),
});

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit
// Hash dummy untuk menyamakan waktu respons saat email tidak ditemukan.
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

type AttemptEntry = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, AttemptEntry>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function pruneExpiredAttempts(now: number): void {
  for (const [key, entry] of loginAttempts) {
    if (now > entry.resetAt) {
      loginAttempts.delete(key);
    }
  }
}

function getAttempts(key: string): AttemptEntry {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    const fresh: AttemptEntry = { count: 0, resetAt: now + WINDOW_MS };
    loginAttempts.set(key, fresh);
    return fresh;
  }
  return entry;
}

function isRateLimited(key: string): boolean {
  return getAttempts(key).count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string): void {
  const entry = getAttempts(key);
  entry.count += 1;
}

function resetAttempts(key: string): void {
  loginAttempts.delete(key);
}

async function handler(req: NextRequest): Promise<Response> {
  const body = await readJsonBody(req);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const email = normalizeEmail(parsed.data.email);
  const { password, ingatSaya } = parsed.data;

  pruneExpiredAttempts(Date.now());

  if (isRateLimited(email)) {
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
    recordFailedAttempt(email);
    return unauthorized("Email atau kata sandi salah");
  }

  const isPasswordValid = await compare(password, admin.passwordHash);

  if (!isPasswordValid) {
    recordFailedAttempt(email);
    return unauthorized("Email atau kata sandi salah");
  }

  // Reset percobaan gagal setelah login berhasil
  resetAttempts(email);

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
