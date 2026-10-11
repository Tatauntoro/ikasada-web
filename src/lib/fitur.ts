/**
 * Sakelar fitur tingkat aplikasi.
 *
 * `JEJARING_ALUMNI` mematikan seluruh permukaan fitur jejaring alumni —
 * koneksi antar alumni, status keterbukaan ("Terbuka kolaborasi"/"Terbuka
 * kesempatan"), dan tampilan kontak (WhatsApp/media sosial) — **tanpa**
 * menghapus kode, route API, model, enum, atau kolom database.
 *
 * Ubah ke `true` untuk mengaktifkan kembali seluruh fitur. Tidak ada migrasi
 * database yang diperlukan saat membalik sakelar ini.
 *
 * Anotasinya sengaja `boolean`, bukan dibiarkan tersimpul sebagai literal
 * `false`. Dengan begitu modul yang mengimpornya melihat tipe `boolean` (bukan
 * konstanta mati), sehingga cabang `FITUR_JEJARING_ALUMNI && (...)` tetap
 * diuji-tipe dan tidak ditandai sebagai kode yang tak terjangkau.
 */
export const FITUR_JEJARING_ALUMNI: boolean = false;
