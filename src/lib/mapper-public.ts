import type { Prisma } from "@/generated/prisma/client";
import type { SektorIndustriModel as SektorIndustri } from "@/generated/prisma/models/SektorIndustri";
import type { PengurusModel as Pengurus } from "@/generated/prisma/models/Pengurus";
import type { KerjasamaModel as Kerjasama } from "@/generated/prisma/models/Kerjasama";
import type { JenisArsipModel as JenisArsip } from "@/generated/prisma/models/JenisArsip";
import type { AksesArsip } from "@/generated/prisma/enums";
import { terkunci } from "@/lib/akses-arsip";

export type KegiatanDenganKategori = Prisma.KegiatanGetPayload<{
  include: { kategoriKegiatan: true };
}>;

export type AlumniDenganSektor = Prisma.AlumniGetPayload<{
  include: { sektorIndustri: true };
}>;

export type ArsipDenganJenis = Prisma.ArsipGetPayload<{
  include: { jenisArsip: true; _count: { select: { media: true } } };
}>;

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

export type PublicPengurus = {
  id: string;
  nama: string;
  jabatan: string;
  angkatan: string | null;
  ket: string | null;
  fotoUrl: string | null;
};

export type PublicJenisArsip = {
  id: string;
  nama: string;
};

/**
 * Arsip dokumen versi publik.
 *
 * `berkasId` dan `berkasPenyimpanan` **sengaja tidak ikut**: itu identitas
 * penyimpanan yang hanya boleh dipakai server. Yang publik cukup tahu
 * formatnya dan apakah berkasnya sudah ada (`adaBerkas`) supaya halaman detail
 * bisa memilih antara pratinjau/unduh atau placeholder.
 *
 * Media galeri tidak ikut di sini (isinya bisa 30 baris per arsip) — daftar
 * cukup membawa `jumlahMedia`; halaman detail membaca barisnya sendiri.
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
  /** Tingkat akses — dipakai UI untuk menandai entri khusus alumni. */
  akses: AksesArsip;
  /**
   * `true` bila isi arsip ini digembok untuk pengunjung sekarang (khusus alumni
   * dan pengunjungnya bukan alumni aktif). Judul & sampulnya tetap tampil.
   */
  terkunci: boolean;
};

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

export function toPublicKegiatan(
  kegiatan: KegiatanDenganKategori
): PublicKegiatan {
  return {
    id: kegiatan.id,
    slug: kegiatan.slug,
    judul: kegiatan.judul,
    deskripsiSingkat: kegiatan.deskripsiSingkat,
    deskripsiLengkap: kegiatan.deskripsiLengkap,
    tanggalMulai: kegiatan.tanggalMulai.toISOString(),
    tanggalSelesai: kegiatan.tanggalSelesai
      ? kegiatan.tanggalSelesai.toISOString()
      : null,
    lokasi: kegiatan.lokasi,
    kategori: kegiatan.kategoriKegiatan.namaKategori,
    gambarThumbnailUrl: kegiatan.gambarThumbnailUrl,
    videoYoutubeUrl: kegiatan.videoYoutubeUrl,
    videoYoutubeId: kegiatan.videoYoutubeId,
    linkPendaftaran: kegiatan.linkPendaftaran,
  };
}

/**
 * Mapper publik (BE-Planning §7).
 *
 * `email`, `noWhatsapp`, `linkInstagram`, dan `linkSosmedLain` sengaja **tidak**
 * ikut: kontak alumni bukan data publik otomatis dan hanya dibuka sesuai consent
 * setelah koneksi diterima (mapper direktori di `directory-alumni.ts`).
 */
export function toPublicAlumni(alumni: AlumniDenganSektor): PublicAlumni {
  const sektor = alumni.sektorIndustri;

  return {
    id: alumni.id,
    namaLengkap: alumni.namaLengkap,
    gelar: alumni.gelar,
    fotoUrl: alumni.fotoUrl,
    angkatan: alumni.angkatan,
    programStudi: alumni.programStudi,
    profesi: alumni.profesi,
    instansi: alumni.instansi,
    sektorIndustri: sektor
      ? { id: sektor.id, namaSektor: sektor.namaSektor }
      : null,
  };
}

export function toPublicSektorIndustri(
  sektor: SektorIndustri
): PublicSektorIndustri {
  return {
    id: sektor.id,
    namaSektor: sektor.namaSektor,
  };
}

export function toPublicJenisArsip(jenis: JenisArsip): PublicJenisArsip {
  return {
    id: jenis.id,
    nama: jenis.nama,
  };
}

export function toPublicArsip(
  arsip: ArsipDenganJenis,
  opsi: { alumniAktif?: boolean } = {}
): PublicArsip {
  return {
    id: arsip.id,
    slug: arsip.slug,
    judul: arsip.judul,
    jenis: toPublicJenisArsip(arsip.jenisArsip),
    tanggalUpload: arsip.tanggalUpload.toISOString(),
    tanggalKegiatanMulai: arsip.tanggalKegiatanMulai.toISOString(),
    tanggalKegiatanSelesai: arsip.tanggalKegiatanSelesai.toISOString(),
    deskripsiSingkat: arsip.deskripsiSingkat,
    deskripsiLengkap: arsip.deskripsiLengkap,
    gambarSampulUrl: arsip.gambarSampulUrl,
    alt: arsip.alt,
    berkasFormat: arsip.berkasFormat,
    berkasUkuran: arsip.berkasUkuran,
    adaBerkas: Boolean(arsip.berkasId),
    jumlahMedia: arsip._count.media,
    akses: arsip.akses,
    terkunci: terkunci(arsip.akses, Boolean(opsi.alumniAktif)),
  };
}

export function toPublicPengurus(pengurus: Pengurus): PublicPengurus {
  return {
    id: pengurus.id,
    nama: pengurus.nama,
    jabatan: pengurus.jabatan,
    angkatan: pengurus.angkatan,
    ket: pengurus.ket,
    fotoUrl: pengurus.fotoUrl,
  };
}

/**
 * `status`, `createdById`, dan `deletedAt` sengaja tidak ikut: hanya baris
 * `PUBLISHED` yang diambil route publik, jadi field internal itu tidak perlu
 * sampai ke browser. Kanal kontak ikut karena memang ditampilkan di blok
 * "Hubungi Kami" halaman detail.
 */
export function toPublicKerjasama(kerjasama: Kerjasama): PublicKerjasama {
  return {
    id: kerjasama.id,
    slug: kerjasama.slug,
    organisasi: kerjasama.organisasi,
    programUtama: kerjasama.programUtama,
    profil: kerjasama.profil,
    contohKegiatan: kerjasama.contohKegiatan,
    imageUrl: kerjasama.imageUrl,
    alt: kerjasama.alt,
    linkInstagram: kerjasama.linkInstagram,
    linkTiktok: kerjasama.linkTiktok,
    email: kerjasama.email,
    urutan: kerjasama.urutan,
  };
}
