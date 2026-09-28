#!/usr/bin/env node
/**
 * Preflight boot untuk container produksi.
 *
 * Mengapa di sini, bukan di instrumentation hook Next: `throw` dari
 * `instrumentation.register()` ditelan Next (server tetap jalan), dan hook itu
 * belum tentu dieksekusi pada output `standalone`. Pemeriksaan di perintah start
 * container ini pasti jalan sebelum server mendengarkan port.
 *
 * Di produksi, penyimpanan berkas WAJIB Cloudflare R2: kalau `R2_*` kosong,
 * aplikasi akan diam-diam menulis ke disk container — berkas hilang saat
 * redeploy, dan aset jadi tak tampil kalau DB dipakai bersama antar-lingkungan.
 *
 * Sumber kebenaran daftar variabel: `isR2Configured()` di `src/lib/r2.ts`.
 */
const WAJIB = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

if (process.env.NODE_ENV === "production") {
  const kurang = WAJIB.filter((nama) => !process.env[nama]);
  if (kurang.length > 0) {
    console.error(
      `[boot] Konfigurasi R2 tidak lengkap: ${kurang.join(", ")}. ` +
        "R2_* wajib di produksi (isi di environment container)."
    );
    process.exit(1);
  }
}
