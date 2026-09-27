// Public API types
import type { ItemKoneksi, LawanBicara, StatusKoneksi } from "@/lib/connection";

export type PublicKegiatan = {
  id: string;
  slug: string;
  judul: string;
  deskripsiSingkat: string;
  deskripsiLengkap: string | null;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  lokasi: string;
  kategori: string;
  gambarThumbnailUrl: string | null;
  videoYoutubeUrl: string | null;
  videoYoutubeId: string | null;
  linkPendaftaran: string | null;
};

export type PublicAlumni = {
  id: string;
  namaLengkap: string;
  gelar: string | null;
  fotoUrl: string | null;
  angkatan: number;
  programStudi: string;
  profesi: string;
  instansi: string | null;
  sektorIndustri: { id: string; namaSektor: string } | null;
};

export type PublicSektorIndustri = {
  id: string;
  namaSektor: string;
};

export type PublicJenisArsip = {
  id: string;
  nama: string;
};

/**
 * Satu dokumen/media arsip seperti yang dikirim `GET /api/public/arsip`.
 *
 * Tidak ada `berkasId`/`berkasPenyimpanan` di sini: berkas dokumen tidak pernah
 * diakses lewat URL publik, melainkan lewat `GET /api/arsip/[slug]/unduh` yang
 * memeriksa sesi alumni. `adaBerkas` hanya penanda tampilan, dan `jumlahMedia`
 * menggantikan daftar media yang isinya dibaca halaman detail sendiri.
 *
 * `tanggalUpload` kapan entri diisi admin; `tanggalKegiatan*` kapan kegiatannya
 * berlangsung (boleh rentang, mis. kumpulan kegiatan 2019–2023).
 *
 * `akses` mengatur siapa yang boleh melihat/mengunduh. Arsip `KHUSUS_ALUMNI`
 * tetap tampil di daftar publik (judul, jenis, periode, sampul) dengan
 * `terkunci: true`; isinya baru terbuka setelah alumni masuk.
 */
export type PublicArsip = {
  id: string;
  slug: string;
  judul: string;
  jenis: PublicJenisArsip;
  tanggalUpload: string;
  tanggalKegiatanMulai: string;
  tanggalKegiatanSelesai: string;
  deskripsiSingkat: string;
  deskripsiLengkap: string | null;
  gambarSampulUrl: string | null;
  alt: string | null;
  berkasFormat: string | null;
  berkasUkuran: number | null;
  adaBerkas: boolean;
  jumlahMedia: number;
  akses: "PUBLIK" | "PUBLIK_UNDUH_ALUMNI" | "KHUSUS_ALUMNI";
  terkunci: boolean;
};

/**
 * Satu kartu section "Kerjasama Kami" (`GET /api/public/kerjasama`).
 *
 * Hanya berisi field yang boleh publik: `status`, `createdById`, dan
 * `deletedAt` disaring di server (`toPublicKerjasama`). Kanal kontak
 * (`linkInstagram`, `linkTiktok`, `email`) ikut karena dipakai halaman detail.
 */
export type PublicKerjasama = {
  id: string;
  slug: string;
  organisasi: string;
  programUtama: string;
  profil: string;
  contohKegiatan: string[];
  imageUrl: string | null;
  alt: string;
  linkInstagram: string | null;
  linkTiktok: string | null;
  email: string | null;
  urutan: number;
};

/**
 * Satu kartu direktori alumni (`GET /api/public/alumni`, BE-Planning §4.3).
 *
 * Server sengaja mengirim dua bentuk yang berbeda, bukan satu bentuk dengan
 * nilai kosong:
 *
 * - Anonymous (juga session yang akunnya belum `ACTIVE`): hanya field publik
 *   plus penanda `openStatusLocked`. Nilai keterbukaan tidak pernah sampai ke
 *   browser, jadi tidak ada yang bisa dibaca dari response.
 * - Akun `ACTIVE`: nilai keterbukaan dan status koneksi terhadap pengunjung.
 *
 * FE wajib memilih tampilan berdasarkan penanda itu (`"openStatusLocked" in
 * kartu`), bukan menebak dari absennya field.
 */
export type PublicAlumniDirektoriAnonim = PublicAlumni & {
  openStatusLocked: true;
};

export type PublicAlumniDirektoriAktif = PublicAlumni & {
  openToCollaboration: boolean;
  openToOpportunity: boolean;
  connectionStatus: StatusKoneksi;
  /**
   * Alumni ini punya akun jejaring **aktif**, sehingga permintaan koneksi bisa
   * diterima. Tanpa akun aktif, `POST /api/alumni/connections` selalu menolak
   * ("Alumni tujuan tidak dapat dihubungi") — jadi kartunya tidak boleh
   * menawarkan tombol Hubungkan.
   */
  bisaDihubungi: boolean;
};

export type PublicAlumniDirektori =
  | PublicAlumniDirektoriAnonim
  | PublicAlumniDirektoriAktif;

/**
 * Item daftar jejaring alumni (`GET /api/alumni/connections`, BE-Planning §4.4).
 *
 * Bentuknya diturunkan dari tipe server (`ItemKoneksi`) supaya tidak bisa
 * berbeda tafsir, dengan satu penyesuaian yang tidak bisa dihindari: tanggal
 * menjadi string begitu melewati JSON.
 */
export type ItemKoneksiJejaring = Omit<
  ItemKoneksi,
  "createdAt" | "respondedAt"
> & {
  createdAt: string;
  respondedAt: string | null;
};

/** Data ringkas lawan bicara; field kontak hanya ada pada koneksi `ACCEPTED`. */
export type LawanBicaraJejaring = LawanBicara;

export type PublicStatistikKegiatan = {
  id: string;
  slug: string;
  judul: string;
  tanggalMulai: string;
};

export type PublicStatistik = {
  totalAlumni: number;
  totalKegiatan: number;
  totalPengurus: number;
  angkatanPerDekade: { dekade: number; jumlah: number }[];
  kegiatanTerakhir: PublicStatistikKegiatan | null;
  kegiatanMendatang: PublicStatistikKegiatan[];
};
