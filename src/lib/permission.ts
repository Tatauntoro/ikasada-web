/**
 * Katalog modul & aksi Portal Admin, plus helper izin.
 *
 * Sengaja **tanpa** import Prisma supaya aman dimuat di komponen klien (menu,
 * matrix izin) sekaligus di server (guard). Tipe `Izin` adalah bentuk yang
 * disimpan di `AdminUser.permissions` (JSON).
 */

export const MODUL = {
  KEGIATAN: "kegiatan",
  ALUMNI: "alumni",
  VERIFIKASI_AKUN: "verifikasi-akun",
  PENGURUS: "pengurus",
  KERJASAMA: "kerjasama",
  ARSIP: "arsip",
  SEKTOR_INDUSTRI: "sektor-industri",
  KATEGORI_KEGIATAN: "kategori-kegiatan",
  JENIS_ARSIP: "jenis-arsip",
  AKTIVITAS: "aktivitas",
  JEJARING: "jejaring",
  INBOX: "inbox",
} as const;

export const AKSI = {
  LIHAT: "lihat",
  TAMBAH: "tambah",
  UBAH: "ubah",
  HAPUS: "hapus",
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
  {
    slug: MODUL.AKTIVITAS,
    label: "Aktivitas",
    aksi: [AKSI.LIHAT],
  },
  {
    slug: MODUL.JEJARING,
    label: "Jejaring Alumni",
    aksi: [AKSI.LIHAT],
  },
  {
    slug: MODUL.INBOX,
    label: "Inbox",
    aksi: [AKSI.LIHAT],
  },
];

export const LABEL_AKSI: Record<AksiSlug, string> = {
  lihat: "Lihat",
  tambah: "Tambah",
  ubah: "Ubah",
  hapus: "Hapus",
};

/** Segmen URL admin → modul, untuk page guard di `(admin)/layout.tsx`. */
export const MODUL_DARI_SEGMEN: Record<string, ModulSlug> = {
  kegiatan: MODUL.KEGIATAN,
  alumni: MODUL.ALUMNI,
  "alumni-accounts": MODUL.VERIFIKASI_AKUN,
  pengurus: MODUL.PENGURUS,
  kerjasama: MODUL.KERJASAMA,
  arsip: MODUL.ARSIP,
  "sektor-industri": MODUL.SEKTOR_INDUSTRI,
  "kategori-kegiatan": MODUL.KATEGORI_KEGIATAN,
  "jenis-arsip": MODUL.JENIS_ARSIP,
  aktivitas: MODUL.AKTIVITAS,
  jejaring: MODUL.JEJARING,
  inbox: MODUL.INBOX,
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
