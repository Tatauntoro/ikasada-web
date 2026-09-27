import type { AksiAudit } from "@/generated/prisma/enums";

/**
 * Bus notifikasi in-process untuk SSE.
 *
 * Route koneksi/register memanggil `publikasiNotifikasi()` tepat setelah
 * transaksinya commit, lalu route `GET /api/admin/notifikasi/stream` yang
 * sedang terbuka meneruskan sinyal itu ke browser admin. Ini hanya jalur
 * **pemberitahuan cepat**: datanya tetap dibaca dari `AuditLog`, jadi sinyal
 * yang hilang (mis. proses lain, koneksi putus) tidak menghilangkan notifikasi —
 * stream juga menghitung ulang dari database secara berkala.
 *
 * `Set` disimpan di `globalThis` supaya tidak ter-reset saat hot reload dev.
 */

export type PeristiwaNotifikasi = {
  aksi: AksiAudit;
  /** `AuditLog.entitasId` — id koneksi atau id akun alumni. */
  entitasId: string;
};

type Pendengar = (peristiwa: PeristiwaNotifikasi) => void;

type GlobalDenganBus = { __ikasadaNotifBus?: Set<Pendengar> };

const global = globalThis as unknown as GlobalDenganBus;
const pendengar: Set<Pendengar> = (global.__ikasadaNotifBus ??= new Set<Pendengar>());

export function langganNotifikasi(fn: Pendengar): () => void {
  pendengar.add(fn);
  return () => {
    pendengar.delete(fn);
  };
}

export function publikasiNotifikasi(peristiwa: PeristiwaNotifikasi): void {
  for (const fn of pendengar) {
    try {
      fn(peristiwa);
    } catch {
      // Satu pendengar yang gagal tidak boleh memutus pendengar lain, dan
      // sama sekali tidak boleh menggagalkan aksi alumni yang memicunya.
    }
  }
}
