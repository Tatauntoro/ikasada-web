/**
 * Katalog modul & aksi Portal Admin, plus helper izin.
 *
 * Sengaja **tanpa** import Prisma supaya aman dimuat di komponen klien (menu,
 * matrix izin) sekaligus di server (guard). Tipe `Izin` adalah bentuk yang
 * disimpan di `AdminUser.permissions` (JSON).
 */

import { FITUR_JEJARING_ALUMNI } from "@/lib/fitur";

export const MODUL = {
  DASHBOARD: "dashboard",
  KEGIATAN: "kegiatan",
  ALUMNI: "alumni",
  VERIFIKASI_AKUN: "verifikasi-akun",
  PENGURUS: "pengurus",
  KERJASAMA: "kerjasama",
  ARSIP: "arsip",
  SEKTOR_INDUSTRI: "sektor-industri",
  KATEGORI_KEGIATAN: "kategori-kegiatan",
  JENIS_ARSIP: "jenis-arsip",
  BERITA: "berita",
  JENIS_BERITA: "jenis-berita",
  AKTIVITAS: "aktivitas",
  JEJARING: "jejaring",
  VERIFIKASI_KONTEN: "verifikasi-konten",
  /*
   * Inbox dipecah per kategori supaya aksesnya bisa diatur per topik:
   * pendaftaran akun, permintaan akun, verifikasi konten, dan administrasi.
   */
  INBOX_PENDAFTARAN: "inbox-pendaftaran",
  INBOX_PERMINTAAN: "inbox-permintaan",
  INBOX_KONTEN: "inbox-konten",
  INBOX_ADMIN: "inbox-admin",
  /** Kelola Beranda: section & titik sebaran di halaman publik. */
  BERANDA: "beranda",
} as const;

export const AKSI = {
  LIHAT: "lihat",
  /** Lihat halaman detail/hasil (mis. kartu Dashboard yang bisa diklik). */
  LIHAT_DETAIL: "lihat-detail",
  TAMBAH: "tambah",
  UBAH: "ubah",
  HAPUS: "hapus",
  /**
   * Buka halaman tujuan dari notifikasi Inbox ("Tindak lanjuti"). Dipisah dari
   * `lihat` supaya notifikasi boleh dibaca tanpa selalu boleh ditindaklanjuti.
   */
  TINDAK_LANJUT: "tindak-lanjut",
} as const;

export type ModulSlug = (typeof MODUL)[keyof typeof MODUL];
export type AksiSlug = (typeof AKSI)[keyof typeof AKSI];

/** Izin satu admin: { "<modul>": ["lihat","tambah",...] }. */
export type Izin = Partial<Record<ModulSlug, AksiSlug[]>>;

export const SEMUA_AKSI: AksiSlug[] = [
  AKSI.LIHAT,
  AKSI.TAMBAH,
  AKSI.UBAH,
  AKSI.HAPUS,
];

/** Modul + aksi yang relevan untuk dirender di matrix izin. */
export const MODUL_INFO: {
  slug: ModulSlug;
  label: string;
  aksi: AksiSlug[];
}[] = [
  {
    slug: MODUL.DASHBOARD,
    label: "Dashboard",
    aksi: [AKSI.LIHAT, AKSI.LIHAT_DETAIL],
  },
  { slug: MODUL.BERANDA, label: "Kelola Beranda", aksi: SEMUA_AKSI },
  { slug: MODUL.KEGIATAN, label: "Kegiatan", aksi: SEMUA_AKSI },
  { slug: MODUL.ALUMNI, label: "Data Alumni", aksi: SEMUA_AKSI },
  {
    slug: MODUL.VERIFIKASI_AKUN,
    label: "Verifikasi Akun",
    aksi: [AKSI.LIHAT, AKSI.UBAH],
  },
  { slug: MODUL.PENGURUS, label: "Pengurus Inti", aksi: SEMUA_AKSI },
  { slug: MODUL.KERJASAMA, label: "Kerjasama", aksi: SEMUA_AKSI },
  { slug: MODUL.ARSIP, label: "Arsip", aksi: SEMUA_AKSI },
  { slug: MODUL.SEKTOR_INDUSTRI, label: "Sektor Industri", aksi: SEMUA_AKSI },
  {
    slug: MODUL.KATEGORI_KEGIATAN,
    label: "Kategori Kegiatan",
    aksi: SEMUA_AKSI,
  },
  { slug: MODUL.JENIS_ARSIP, label: "Jenis Arsip", aksi: SEMUA_AKSI },
  { slug: MODUL.BERITA, label: "Berita", aksi: SEMUA_AKSI },
  { slug: MODUL.JENIS_BERITA, label: "Jenis Berita", aksi: SEMUA_AKSI },
  {
    slug: MODUL.AKTIVITAS,
    label: "Aktivitas",
    aksi: [AKSI.LIHAT],
  },
  /*
   * Modul jejaring disembunyikan dari matriks izin saat mode jejaring dimatikan
   * (`@/lib/fitur`) — halamannya dialihkan, jadi izinnya tidak ada gunanya.
   * Slug-nya tetap terdaftar di `MODUL`/`MODUL_DARI_SEGMEN` agar guard & restore
   * tidak perlu diubah.
   */
  ...(FITUR_JEJARING_ALUMNI
    ? [
        {
          slug: MODUL.JEJARING,
          label: "Jejaring Alumni",
          aksi: [AKSI.LIHAT],
        },
      ]
    : []),
  {
    slug: MODUL.VERIFIKASI_KONTEN,
    label: "Verifikasi Konten",
    aksi: [AKSI.LIHAT, AKSI.UBAH],
  },
  {
    slug: MODUL.INBOX_PENDAFTARAN,
    label: "Inbox: Pendaftaran Akun",
    aksi: [AKSI.LIHAT, AKSI.TINDAK_LANJUT],
  },
  {
    slug: MODUL.INBOX_PERMINTAAN,
    label: "Inbox: Permintaan Akun",
    aksi: [AKSI.LIHAT, AKSI.TINDAK_LANJUT],
  },
  {
    slug: MODUL.INBOX_KONTEN,
    label: "Inbox: Verifikasi Konten",
    aksi: [AKSI.LIHAT, AKSI.TINDAK_LANJUT],
  },
  {
    slug: MODUL.INBOX_ADMIN,
    label: "Inbox: Admin & Divisi",
    aksi: [AKSI.LIHAT, AKSI.TINDAK_LANJUT],
  },
];

export const LABEL_AKSI: Record<AksiSlug, string> = {
  lihat: "Lihat",
  "lihat-detail": "Lihat Detail",
  tambah: "Tambah",
  ubah: "Ubah",
  hapus: "Hapus",
  "tindak-lanjut": "Tindak Lanjut",
};

/** Modul inbox (dipecah per kategori notifikasi). */
export const MODUL_INBOX: ModulSlug[] = [
  MODUL.INBOX_PENDAFTARAN,
  MODUL.INBOX_PERMINTAAN,
  MODUL.INBOX_KONTEN,
  MODUL.INBOX_ADMIN,
];

/**
 * Peta tipe notifikasi → modul inbox-nya.
 *
 * Kuncinya adalah string `TipeNotifikasi` (hindari import dari `@/lib/notifikasi`
 * yang memuat Prisma, supaya aman di komponen klien).
 */
export const MODUL_INBOX_PER_TIPE: Record<string, ModulSlug> = {
  PENDAFTARAN: MODUL.INBOX_PENDAFTARAN,
  AKUN: MODUL.INBOX_PERMINTAAN,
  KONTEN: MODUL.INBOX_KONTEN,
  ADMIN: MODUL.INBOX_ADMIN,
};

/** Segmen URL admin → modul, untuk page guard di `(admin)/layout.tsx`. */
export const MODUL_DARI_SEGMEN: Record<string, ModulSlug> = {
  beranda: MODUL.BERANDA,
  kegiatan: MODUL.KEGIATAN,
  alumni: MODUL.ALUMNI,
  "alumni-accounts": MODUL.VERIFIKASI_AKUN,
  pengurus: MODUL.PENGURUS,
  kerjasama: MODUL.KERJASAMA,
  arsip: MODUL.ARSIP,
  "sektor-industri": MODUL.SEKTOR_INDUSTRI,
  "kategori-kegiatan": MODUL.KATEGORI_KEGIATAN,
  "jenis-arsip": MODUL.JENIS_ARSIP,
  berita: MODUL.BERITA,
  "jenis-berita": MODUL.JENIS_BERITA,
  aktivitas: MODUL.AKTIVITAS,
  jejaring: MODUL.JEJARING,
  verifikasi: MODUL.VERIFIKASI_KONTEN,
};

/** Modul yang valid, dipakai validator. */
export const MODUL_SLUGS = Object.values(MODUL) as [ModulSlug, ...ModulSlug[]];
export const AKSI_SLUGS = Object.values(AKSI) as [AksiSlug, ...AksiSlug[]];

/** Apakah `izin` mengizinkan `aksi` pada `modul`. */
export function boleh(
  izin: Izin | null | undefined,
  modul: ModulSlug,
  aksi: AksiSlug
): boolean {
  if (!izin) return false;
  const daftar = izin[modul];
  return Array.isArray(daftar) && daftar.includes(aksi);
}

/**
 * Bersihkan nilai JSON dari DB menjadi `Izin` yang hanya memuat modul/aksi
 * yang dikenal. Nilai asing dibuang, bukan dipercaya apa adanya.
 */
export function normalisasiIzin(nilai: unknown): Izin {
  if (typeof nilai !== "object" || nilai === null || Array.isArray(nilai)) {
    return {};
  }

  const hasil: Izin = {};
  for (const [kunci, isi] of Object.entries(nilai as Record<string, unknown>)) {
    if (!MODUL_SLUGS.includes(kunci as ModulSlug)) continue;
    if (!Array.isArray(isi)) continue;

    const aksi = isi.filter((a): a is AksiSlug =>
      AKSI_SLUGS.includes(a as AksiSlug)
    );
    if (aksi.length > 0) {
      hasil[kunci as ModulSlug] = [...new Set(aksi)];
    }
  }

  return hasil;
}
