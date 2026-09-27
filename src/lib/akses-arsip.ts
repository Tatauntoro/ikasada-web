import type { AksesArsip } from "@/generated/prisma/enums";

/**
 * Aturan akses arsip — satu tempat untuk semua keputusan "siapa boleh apa".
 *
 * Dipakai bersama oleh daftar publik, halaman detail, endpoint unduh dokumen,
 * dan endpoint media, supaya tidak ada jalur yang lupa memeriksa. Nilai enum
 * ditulis sebagai literal string (bukan impor enum) agar file ini aman dipakai
 * komponen klien tanpa menyeret client Prisma.
 *
 * Arsip `KHUSUS_ALUMNI` **tetap ditampilkan** ke pengunjung umum — judul, jenis,
 * periode, dan sampulnya — tapi isinya (deskripsi, galeri, dokumen) digembok
 * sampai alumni masuk. Jadi pengunjung tahu arsipnya ada dan tahu cara
 * membukanya, alih-alih mendapat 404 tanpa penjelasan.
 */

export type PilihanAkses = {
  value: AksesArsip;
  label: string;
  hint: string;
};

export const PILIHAN_AKSES: PilihanAkses[] = [
  {
    value: "PUBLIK",
    label: "Publik",
    hint: "Dilihat dan diunduh siapa saja, termasuk berkas dokumen dan galerinya.",
  },
  {
    value: "PUBLIK_UNDUH_ALUMNI",
    label: "Publik, unduh khusus alumni",
    hint: "Daftar, detail, dan galeri terbuka untuk umum; berkas dokumen hanya bisa diunduh alumni yang sudah masuk.",
  },
  {
    value: "KHUSUS_ALUMNI",
    label: "Khusus alumni",
    hint: "Tetap tampil di daftar publik dalam mode terkunci; isinya hanya bisa dibuka alumni yang sudah masuk.",
  },
];

const LABEL_AKSES: Record<AksesArsip, string> = {
  PUBLIK: "Publik",
  PUBLIK_UNDUH_ALUMNI: "Unduh khusus alumni",
  KHUSUS_ALUMNI: "Khusus alumni",
};

export function labelAkses(akses: AksesArsip): string {
  return LABEL_AKSES[akses] ?? akses;
}

/**
 * Apakah isi arsip boleh dibuka pengunjung ini.
 *
 * `false` bukan berarti 404: halaman detail menampilkan versi terkunci dengan
 * ajakan masuk (lihat `TerkunciArsip`), dan endpoint berkas tetap menolak.
 */
export function bolehLihatKonten(
  akses: AksesArsip,
  alumniAktif: boolean
): boolean {
  return akses !== "KHUSUS_ALUMNI" || alumniAktif;
}

/** Kebalikan dari `bolehLihatKonten` — dipakai UI untuk menampilkan gembok. */
export function terkunci(akses: AksesArsip, alumniAktif: boolean): boolean {
  return !bolehLihatKonten(akses, alumniAktif);
}

/** Apakah pengunjung boleh mengambil berkas dokumen arsip ini. */
export function bolehUnduh(akses: AksesArsip, alumniAktif: boolean): boolean {
  return akses === "PUBLIK" || alumniAktif;
}
