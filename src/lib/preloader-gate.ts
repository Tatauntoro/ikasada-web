/**
 * Gerbang veil preloader.
 *
 * Veil hanya boleh main pada **kedatangan pertama** ke route yang memang
 * memasangnya, yaitu saat route itu menjadi pintu masuk dokumen ini. Berpindah
 * ke sana lewat navigasi client-side (tombol back, breadcrumb, tautan) tidak
 * memutarnya lagi — dulu komponen `Preloader` remount tiap kali, jadi veil
 * selalu main dari nol setiap kembali ke beranda.
 *
 * Modul ini mencatat `pathname` saat dirinya pertama dievaluasi di browser.
 * Karena diimpor oleh `ScrollToHash` (root layout), ia selalu ikut bundle awal
 * setiap route — jadi pencatatannya terjadi di awal pemuatan dokumen, bukan
 * saat chunk route kebetulan baru dimuat.
 */

/** Route yang memang memasang `<Preloader />`. */
const RUTE_BERVEIL = ["/", "/glyph"];

let pintuMasuk: string | null = null;
if (typeof window !== "undefined") pintuMasuk = window.location.pathname;

let sudahPindahRoute = false;

/**
 * Dipanggil `ScrollToHash` tiap kali route aktif berubah. Begitu pengunjung
 * meninggalkan pintu masuk, veil tidak boleh main lagi di dokumen ini.
 */
export function catatRouteAktif(pathname: string) {
  if (pintuMasuk !== null && pathname !== pintuMasuk) sudahPindahRoute = true;
}

/**
 * Murni dan idempoten: aman dipanggil berkali-kali dari render (termasuk render
 * ganda StrictMode) karena ia tidak "menghabiskan" keputusan apa pun.
 */
export function preloaderAktif(): boolean {
  /*
   * Di server tidak ada `window` untuk dibaca. Dianggap `true` supaya markup
   * yang di-render server sama dengan render pertama klien ketika pintu
   * masuknya memang beranda — kalau tidak, React melaporkan hydration mismatch
   * (server tidak menggambar veil, klien menggambar).
   */
  if (typeof window === "undefined") return true;
  if (pintuMasuk === null) return false;
  if (!RUTE_BERVEIL.includes(pintuMasuk)) return false;
  return !sudahPindahRoute;
}
