import type { NextRequest } from "next/server";

/**
 * Log terstruktur untuk observability (BE-Planning §9, Task 22).
 *
 * Satu baris JSON per peristiwa, ditulis ke stdout dengan awalan `[log]` supaya
 * bisa dipisahkan dari log framework. Yang **tidak** pernah masuk ke sini:
 * password, token, body request, dan identifier mentah (email/IP) — yang dipakai
 * untuk agregasi hanya sidik jari HMAC dari `@/lib/rate-limit`.
 *
 * Isi log:
 * - `akses`      — satu baris per request API: requestId, method, path, status,
 *                  dan durasi (ms). Dari sini latency dan error rate per endpoint
 *                  bisa dihitung tanpa metrik tambahan.
 * - `login_gagal` — percobaan login alumni yang gagal, dengan sidik jari email.
 * - `rate_limit`  — request yang ditolak karena batas percobaan.
 * - `konflik`     — konflik state koneksi (`409`).
 * - `penyimpanan` — aset yang gagal diambil karena backend penyimpanannya tidak
 *                   tersedia di server ini (mis. berkas ada di R2 tapi kredensial
 *                   R2 kosong). Tanpa ini, kegagalannya cuma tampak sebagai 404.
 * - `konfigurasi` — masalah konfigurasi saat proses start (mis. R2 wajib di
 *                   produksi tapi belum diisi).
 */

export type PeristiwaLog =
  | "akses"
  | "login_gagal"
  | "rate_limit"
  | "konflik"
  | "penyimpanan"
  | "konfigurasi";

type DataLog = Record<string, unknown>;

/**
 * Request id per objek request.
 *
 * `apiHandler` yang membuatnya; handler yang ingin ikut mencantumkannya cukup
 * memanggil `requestIdDari(req)`. Pemetaan berbasis `WeakMap` supaya tidak ada
 * state yang bocor antar request dan tidak perlu mengubah tanda tangan handler.
 */
const idPerRequest = new WeakMap<NextRequest, string>();

export function catatRequestId(req: NextRequest, id: string): void {
  idPerRequest.set(req, id);
}

export function requestIdDari(req: NextRequest): string | undefined {
  return idPerRequest.get(req);
}

/** Buang nilai yang `undefined` supaya baris log tetap ringkas. */
function rapikan(data: DataLog): DataLog {
  return Object.fromEntries(
    Object.entries(data).filter(([, nilai]) => nilai !== undefined)
  );
}

export function logPeristiwa(peristiwa: PeristiwaLog, data: DataLog = {}): void {
  const baris = rapikan({
    waktu: new Date().toISOString(),
    peristiwa,
    ...data,
  });

  console.log(`[log] ${JSON.stringify(baris)}`);
}
