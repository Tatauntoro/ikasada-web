import { resetRateLimit, type OpsiRateLimit } from "@/lib/rate-limit";

/**
 * Aturan rate limit login admin.
 *
 * Dipisah dari route-nya supaya pembersihan kunci (mis. saat superadmin
 * mereset kata sandi) memakai `scope` yang persis sama dengan yang dipakai
 * saat mencatat percobaan. Kalau scope-nya beda, pembersihannya diam-diam
 * tidak mengenai catatan yang benar.
 */

/** Panjang jendela sekaligus lama blokir: 15 menit. */
export const JENDELA_MS = 15 * 60 * 1000;
export const MAKS_PER_EMAIL = 5;
export const MAKS_PER_IP = 20;

const SCOPE_EMAIL = "admin_login_email";
const SCOPE_IP = "admin_login_ip";

export function opsiLoginAdminEmail(email: string): OpsiRateLimit {
  return {
    scope: SCOPE_EMAIL,
    key: email,
    maxAttempts: MAKS_PER_EMAIL,
    windowMs: JENDELA_MS,
  };
}

export function opsiLoginAdminIp(ip: string): OpsiRateLimit {
  return {
    scope: SCOPE_IP,
    key: ip,
    maxAttempts: MAKS_PER_IP,
    windowMs: JENDELA_MS,
  };
}

/**
 * Buka blokir login sebuah akun. Dipakai setelah superadmin mereset kata
 * sandi: tanpa ini, akun yang sudah terkunci tetap tidak bisa masuk sampai
 * jendelanya habis, walau kata sandinya sudah benar.
 */
export async function bukaBlokirLoginAdmin(email: string): Promise<void> {
  await resetRateLimit(opsiLoginAdminEmail(email));
}
