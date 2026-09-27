import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Rate limit server-side berbasis tabel `AuthRateLimit`.
 *
 * Disimpan di database, bukan `Map` di memory, karena deployment bisa berjalan
 * di beberapa instance (BE-Planning §2.4). Identifier mentah (email/IP) tidak
 * pernah disimpan — yang masuk kolom `keyHash` hanya HMAC-SHA256 dengan
 * `JWT_SECRET` sebagai kunci.
 */

export type OpsiRateLimit = {
  /** Nama grup aturan, mis. `alumni_login_email`. */
  scope: string;
  /** Identifier mentah: email ternormalisasi atau alamat IP. */
  key: string;
  /** Jumlah percobaan yang memicu blokir. */
  maxAttempts: number;
  /** Panjang jendela sekaligus lama blokir, dalam milidetik. */
  windowMs: number;
};

export type HasilRateLimit = {
  blocked: boolean;
  retryAfterDetik: number;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET belum diatur di environment variables");
  }
  return secret;
}

function hashKey(scope: string, key: string): string {
  return createHmac("sha256", getSecret())
    .update(`${scope}:${key.trim().toLowerCase()}`)
    .digest("hex");
}

/**
 * Sidik jari identifier untuk log (Task 22).
 *
 * Dipakai supaya kegagalan login bisa diagregasi per akun tanpa menulis email
 * mentah ke log — aturan yang sama dengan kolom `keyHash` di tabel rate limit.
 */
export function sidikJari(scope: string, key: string): string {
  return hashKey(scope, key).slice(0, 12);
}

function detikTersisa(sampai: Date | null): number {
  if (!sampai) return 0;
  return Math.max(0, Math.ceil((sampai.getTime() - Date.now()) / 1000));
}

/**
 * Ambil IP klien dari header proxy. Di development header ini biasanya kosong,
 * jadi dipakai penanda `lokal` agar rate limit tetap berjalan (satu keranjang
 * untuk semua request lokal).
 */
export function ambilIpKlien(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const pertama = forwarded.split(",")[0]?.trim();
    if (pertama) return pertama;
  }
  return req.headers.get("x-real-ip")?.trim() || "lokal";
}

export async function cekRateLimit(opsi: OpsiRateLimit): Promise<HasilRateLimit> {
  const keyHash = hashKey(opsi.scope, opsi.key);
  const catatan = await prisma.authRateLimit.findUnique({
    where: { scope_keyHash: { scope: opsi.scope, keyHash } },
  });

  if (!catatan) {
    return { blocked: false, retryAfterDetik: 0 };
  }

  const blockedSampai = catatan.blockedUntil;
  if (blockedSampai && blockedSampai.getTime() > Date.now()) {
    return { blocked: true, retryAfterDetik: detikTersisa(blockedSampai) };
  }

  // Jendela sudah lewat: hitungan lama diabaikan, tidak perlu ditulis dulu.
  const umurJendela = Date.now() - catatan.windowStartedAt.getTime();
  if (umurJendela > opsi.windowMs) {
    return { blocked: false, retryAfterDetik: 0 };
  }

  return { blocked: false, retryAfterDetik: 0 };
}

/**
 * Catat satu percobaan yang dihitung. Kalau sudah mencapai `maxAttempts`,
 * blokir dipasang selama satu jendela penuh.
 */
export async function catatPercobaan(opsi: OpsiRateLimit): Promise<void> {
  const keyHash = hashKey(opsi.scope, opsi.key);
  const sekarang = new Date();

  const catatan = await prisma.authRateLimit.findUnique({
    where: { scope_keyHash: { scope: opsi.scope, keyHash } },
  });

  const jendelaLewat =
    !catatan || sekarang.getTime() - catatan.windowStartedAt.getTime() > opsi.windowMs;

  if (jendelaLewat) {
    await prisma.authRateLimit.upsert({
      where: { scope_keyHash: { scope: opsi.scope, keyHash } },
      create: {
        scope: opsi.scope,
        keyHash,
        attemptCount: 1,
        windowStartedAt: sekarang,
      },
      update: {
        attemptCount: 1,
        windowStartedAt: sekarang,
        blockedUntil: null,
      },
    });
    return;
  }

  const attemptCount = catatan.attemptCount + 1;
  await prisma.authRateLimit.update({
    where: { scope_keyHash: { scope: opsi.scope, keyHash } },
    data: {
      attemptCount,
      blockedUntil:
        attemptCount >= opsi.maxAttempts
          ? new Date(sekarang.getTime() + opsi.windowMs)
          : catatan.blockedUntil,
    },
  });
}

/** Buang hitungan setelah aksi yang sah (mis. login berhasil). */
export async function resetRateLimit(opsi: OpsiRateLimit): Promise<void> {
  const keyHash = hashKey(opsi.scope, opsi.key);
  await prisma.authRateLimit.deleteMany({
    where: { scope: opsi.scope, keyHash },
  });
}
