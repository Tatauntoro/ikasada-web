/**
 * Kode numerik status akun alumni untuk payload kanal realtime.
 *
 * `buatStreamHitungan` (`@/lib/sse`) hanya mengirim `Record<string, number>`,
 * sedangkan status akun adalah string enum. Modul ini menjembatani keduanya
 * supaya pemetaannya satu sumber: dipakai server saat menghitung, dan klien saat
 * menerjemahkan kembali.
 *
 * Sengaja **tanpa** import Prisma agar aman dimuat di bundle klien; enum Prisma
 * cukup dikirim sebagai string biasa ke `kodeDariStatus`.
 */

export const KODE_STATUS_AKUN = {
  PENDING: 0,
  ACTIVE: 1,
  REJECTED: 2,
  SUSPENDED: 3,
} as const;

export type KodeStatusAkun =
  (typeof KODE_STATUS_AKUN)[keyof typeof KODE_STATUS_AKUN];

/** Akun tidak ditemukan / status tak dikenal. */
export const KODE_STATUS_TIDAK_DIKENAL = -1;

export function kodeDariStatus(status: string): number {
  return (
    (KODE_STATUS_AKUN as Record<string, number>)[status] ??
    KODE_STATUS_TIDAK_DIKENAL
  );
}
