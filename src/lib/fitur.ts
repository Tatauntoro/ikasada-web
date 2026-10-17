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

/**
 * Sakelar akses akun alumni (login/register).
 *
 * `false` menyembunyikan seluruh titik masuk login di halaman publik dan
 * memblokir akses langsung ke `/alumni/login`, `/alumni/register`,
 * `/alumni/lupa-password` beserta endpoint API-nya: halaman dialihkan ke
 * beranda, endpoint dibalas `403`. Halaman publik lain dan portal admin tidak
 * terpengaruh. Ubah ke `true` untuk membuka kembali; tidak ada migrasi database.
 *
 * Anotasinya `boolean` (bukan literal `false`) untuk alasan yang sama seperti
 * `FITUR_JEJARING_ALUMNI` di atas: cabang `AKSES_ALUMNI_TERBUKA && (...)` tetap
 * diuji-tipe dan tidak ditandai sebagai kode yang tak terjangkau.
 */
export const AKSES_ALUMNI_TERBUKA: boolean = false;
