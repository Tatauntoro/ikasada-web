/**
 * Katalog section beranda + nilai default-nya.
 *
 * Modul **murni** (tanpa Prisma) supaya dipakai server (upsert default, API
 * publik) sekaligus komponen klien (halaman Kelola Beranda).
 *
 * `urutan` menentukan:
 * - urutan baris di halaman **Kelola Beranda**, dan
 * - **posisi blok** di beranda publik (lihat `SECTION_POSISI`).
 *
 * Satu blok di beranda bisa memuat beberapa kunci (mis. blok Overview memuat
 * `tentang-kami` + `lima-cara`, blok Statistik memuat `statistik` +
 * `sebaran-geografis` + `sebaran-angkatan` + `agenda`). Posisi blok memakai
 * kunci utamanya saja (`SECTION_POSISI`), sementara sub-kunci tidak dipakai
 * untuk memindahkan blok.
 *
 * `konfigurasi` menampung data khas section (daftar poin "lima cara", email
 * kontak, titik asal peta). Bentuknya divalidasi per-kunci di server
 * (`@/lib/validations/beranda`).
 */

import { KONTAK } from "@/data/kontak";

export const KUNCI_SECTION = [
  "tentang-kami",
  "lima-cara",
  "statistik",
  "sebaran-geografis",
  "sebaran-angkatan",
  "agenda",
  "direktori-alumni",
  "berita",
  "kegiatan",
  "kerjasama",
  "arsip",
  "pengurus",
  "kontak",
] as const;

export type KunciSection = (typeof KUNCI_SECTION)[number];

export type DefaultSection = {
  kunci: KunciSection;
  label: string;
  urutan: number;
  eyebrow?: string;
  judul?: string;
  deskripsi?: string;
  konfigurasi?: Record<string, unknown>;
};

/** Nilai awal tiap section — sengaja sama dengan tampilan beranda sekarang. */
export const SECTION_DEFAULT: DefaultSection[] = [
  {
    kunci: "tentang-kami",
    label: "Tentang Kami",
    urutan: 1,
    eyebrow: "Tentang Kami",
    judul:
      "Jejaring alumni yang tumbuh dari satu akar, bergerak lebih jauh bersama.",
    deskripsi:
      "IKASADA merawat hubungan lintas angkatan melalui ruang bertemu, berbagi pengetahuan, dan kontribusi yang terus hidup di dalam dan di luar kampus.",
  },
  {
    kunci: "lima-cara",
    label: '"Lima cara kami menyambung"',
    urutan: 2,
    eyebrow: "Jejaring Ikasada FIB UI",
    judul: "Lima cara kami menyambung.",
    konfigurasi: {
      items: [
        {
          judul: "Ruang Terhubung",
          deskripsi:
            "IKASADA membuka ruang bagi alumni lintas angkatan untuk bertemu, berbagi cerita, dan kembali terhubung.",
        },
        {
          judul: "Koneksi Jadi Kolaborasi",
          deskripsi:
            "Koneksi antaralumni bisa berkembang menjadi ruang berbagi gagasan dan kerja sama.",
        },
        {
          judul: "Kegiatan yang Terus Tumbuh",
          deskripsi:
            "Ragam kegiatan IKASADA terus berkembang mengikuti semangat dan kebutuhan komunitas.",
        },
        {
          judul: "Ruang Tumbuh Bersama",
          deskripsi:
            "Mahasiswa aktif, terutama tingkat akhir, bertemu alumni, bertukar pengalaman, dan mencari bekal untuk langkah setelah kampus.",
        },
        {
          judul: "Dosen dan Prodi Terhubung",
          deskripsi:
            "Dosen yang juga alumni berdialog dan berkolaborasi dengan IKASADA melalui dukungan Prodi.",
        },
      ],
    },
  },
  {
    kunci: "statistik",
    label: 'Statistik "Sejauh ini"',
    urutan: 3,
    eyebrow: "Statistik",
    judul: "Sejauh ini",
    deskripsi:
      "Jejak alumni kami yang terus bertambah, dan apa yang sedang kami siapkan.",
  },
  {
    kunci: "sebaran-geografis",
    label: "Sebaran geografis",
    urutan: 4,
    eyebrow: "Sebaran",
    judul: "geografis",
    deskripsi:
      "Jejaring alumni Sastra Daerah yang tumbuh dari Indonesia hingga lintas benua—saling terhubung oleh pengalaman, pengetahuan, dan ikatan yang sama.",
    // Titik asal busur (almamater). Koordinatnya Depok, labelnya "Indonesia".
    konfigurasi: {
      asal: { nama: "Indonesia", lat: -6.4025, lng: 106.7942 },
    },
  },
  {
    kunci: "sebaran-angkatan",
    label: "Sebaran angkatan",
    urutan: 5,
    judul: "Sebaran angkatan",
  },
  {
    kunci: "agenda",
    label: "Agenda (Terakhir & Akan datang)",
    urutan: 6,
    judul: "Agenda",
  },
  {
    kunci: "direktori-alumni",
    label: "Direktori Alumni",
    urutan: 7,
    eyebrow: "Direktori",
    judul: "Temukan Rekan Alumni.",
  },
  {
    kunci: "berita",
    label: "Berita",
    urutan: 8,
    eyebrow: "Berita",
    judul: "Berita Terkini.",
  },
  {
    kunci: "kegiatan",
    label: "Kegiatan",
    urutan: 9,
    eyebrow: "Kegiatan",
    judul: "Hadiri Kegiatan Kami.",
  },
  {
    kunci: "kerjasama",
    label: "Kerjasama",
    urutan: 10,
    eyebrow: "Kerjasama",
    judul: "Kerjasama Kami",
  },
  {
    kunci: "arsip",
    label: "Arsip",
    urutan: 11,
    eyebrow: "Arsip",
    judul: "Dokumen & Laporan.",
  },
  {
    kunci: "pengurus",
    label: "Pengurus Inti",
    urutan: 12,
    eyebrow: "Pengurus",
    judul: "Dewan Pengurus Inti",
    deskripsi:
      "Nakhoda organisasi yang berdedikasi menjaga sinergi antar-alumni dan kejayaan tradisi Sastra Daerah FIB UI.",
  },
  {
    kunci: "kontak",
    label: 'Kontak "Mari saling terhubung"',
    urutan: 13,
    judul: "Mari saling terhubung dengan kami.",
    deskripsi:
      "Mau daftar jadi anggota, memperbarui data alumni, atau sekadar bertanya soal kegiatan kami? Sampaikan saja—kami senang mendengarnya.",
    konfigurasi: { email: KONTAK.email },
  },
];

export const DEFAULT_PER_KUNCI: Record<KunciSection, DefaultSection> =
  Object.fromEntries(SECTION_DEFAULT.map((s) => [s.kunci, s])) as Record<
    KunciSection,
    DefaultSection
  >;

/**
 * Palet warna cepat untuk judul/eyebrow section di Kelola Beranda.
 *
 * Nilainya sengaja hex (bukan token) supaya sama persis dengan yang disimpan di
 * DB dan gampang ditimpa lewat input hex manual. Empat pertama menyamai token
 * warna yang sudah dipakai beranda (`--ikasada-*` di globals.css).
 */
export const PALET_WARNA: { nama: string; nilai: string }[] = [
  { nama: "Hitam", nilai: "#0f1012" },
  { nama: "Biru", nilai: "#0b5ed7" },
  { nama: "Hijau", nilai: "#28a745" },
  { nama: "Gold", nilai: "#f4c430" },
  { nama: "Merah", nilai: "#d92d20" },
  { nama: "Putih", nilai: "#ffffff" },
];

/**
 * Kunci yang posisinya menentukan urutan blok di beranda (satu blok bisa
 * memuat beberapa kunci; yang dipakai hanya kunci utamanya).
 */
export const SECTION_POSISI: KunciSection[] = [
  "tentang-kami",
  "statistik",
  "direktori-alumni",
  "berita",
  "kegiatan",
  "kerjasama",
  "arsip",
  "pengurus",
  "kontak",
];

/** Kunci yang section-nya menampilkan field "Label kecil (eyebrow)". */
export const SECTION_PAKAI_EYEBROW: KunciSection[] = [
  "tentang-kami",
  "lima-cara",
  "statistik",
  "sebaran-geografis",
  "direktori-alumni",
  "berita",
  "kegiatan",
  "kerjasama",
  "arsip",
  "pengurus",
];

/** Kunci yang section-nya menampilkan field "Deskripsi". */
export const SECTION_PAKAI_DESKRIPSI: KunciSection[] = [
  "tentang-kami",
  "statistik",
  "sebaran-geografis",
  "pengurus",
  "kontak",
];

export function kunciValid(nilai: string): nilai is KunciSection {
  return (KUNCI_SECTION as readonly string[]).includes(nilai);
}
