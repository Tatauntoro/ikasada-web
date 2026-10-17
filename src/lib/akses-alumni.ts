import { redirect } from "next/navigation";
import { AKSES_ALUMNI_TERBUKA } from "@/lib/fitur";
import { forbidden } from "@/lib/response";

/**
 * Gerbang akses akun alumni (login/register).
 *
 * Saat `AKSES_ALUMNI_TERBUKA` dimatikan, seluruh titik masuk login di halaman
 * publik harus hilang dan route auth alumni harus ditolak di server — bukan
 * sekadar disembunyikan tombolnya. Dua fungsi di bawah adalah satu-satunya
 * tempat aturan itu ditulis, supaya halaman dan endpoint tidak menyimpang.
 *
 * Modul ini sengaja tidak mengimpor Prisma: ia dipakai juga oleh route handler
 * yang tidak perlu menyentuh database.
 */

/** Halaman server: alihkan ke beranda bila akses alumni ditutup. */
export function gerbangHalamanAlumni(): void {
  if (!AKSES_ALUMNI_TERBUKA) redirect("/");
}

/** Route handler: `403` saat ditutup, `null` saat akses terbuka (lanjut). */
export function gerbangApiAlumni(): Response | null {
  if (AKSES_ALUMNI_TERBUKA) return null;
  return forbidden("Akses akun alumni sedang dinonaktifkan.");
}
