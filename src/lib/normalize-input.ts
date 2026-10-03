import { Prisma } from "@/generated/prisma/client";
import type { AlumniInput } from "@/lib/validations/alumni";
import type { ArsipInput } from "@/lib/validations/arsip";
import type { BeritaInput } from "@/lib/validations/berita";
import type { KegiatanInput } from "@/lib/validations/kegiatan";
import type { KerjasamaInput } from "@/lib/validations/kerjasama";
import type { PengurusInput } from "@/lib/validations/pengurus";
import { ekstrakVideoId } from "@/lib/youtube";
import {
  normalisasiInstagram,
  normalisasiTiktok,
  normalisasiWhatsapp,
} from "@/lib/normalisasi";

export function normalizeKegiatanInput(
  input: KegiatanInput
): Omit<Prisma.KegiatanUncheckedCreateInput, "createdById" | "slug"> {
  return {
    judul: input.judul,
    deskripsiSingkat: input.deskripsiSingkat,
    deskripsiLengkap: input.deskripsiLengkap ?? null,
    tanggalMulai: input.tanggalMulai,
    tanggalSelesai: input.tanggalSelesai ?? null,
    lokasi: input.lokasi,
    kategoriKegiatanId: input.kategori,
    videoYoutubeUrl: input.videoYoutubeUrl ?? null,
    videoYoutubeId: input.videoYoutubeUrl
      ? ekstrakVideoId(input.videoYoutubeUrl)
      : null,
    linkPendaftaran: input.linkPendaftaran ?? null,
    gambarThumbnailUrl: input.gambarThumbnailUrl ?? null,
    status: input.status,
  };
}

export function normalizeAlumniInput(
  input: AlumniInput
): Omit<Prisma.AlumniUncheckedCreateInput, "createdById"> {
  return {
    namaLengkap: input.namaLengkap,
    gelar: input.gelar ?? null,
    fotoUrl: input.fotoUrl ?? null,
    angkatan: input.angkatan,
    programStudi: input.programStudi,
    profesi: input.profesi,
    instansi: input.instansi ?? null,
    sektorIndustriId: input.sektorIndustriId,
    email: input.email ?? null,
    noWhatsapp: normalisasiWhatsapp(input.noWhatsapp),
    linkInstagram: normalisasiInstagram(input.linkInstagram),
    linkSosmedLain:
      input.linkSosmedLain && input.linkSosmedLain.length > 0
        ? input.linkSosmedLain
        : Prisma.DbNull,
    status: input.status,
  };
}

export function normalizeArsipInput(
  input: ArsipInput
): Omit<Prisma.ArsipUncheckedCreateInput, "createdById" | "slug" | "media"> {
  return {
    judul: input.judul.trim(),
    jenisArsipId: input.jenisArsipId,
    tanggalUpload: input.tanggalUpload,
    /*
     * Rentang kegiatan: `selesai` selalu terisi supaya filter tahun cukup satu
     * perbandingan. Kalau admin hanya mengisi satu tanggal, selesai = mulai.
     */
    tanggalKegiatanMulai: input.tanggalKegiatanMulai,
    tanggalKegiatanSelesai:
      input.tanggalKegiatanSelesai ?? input.tanggalKegiatanMulai,
    deskripsiSingkat: input.deskripsiSingkat.trim(),
    deskripsiLengkap: input.deskripsiLengkap?.trim() || null,
    gambarSampulUrl: input.gambarSampulUrl?.trim() || null,
    alt: input.alt?.trim() || null,
    berkasId: input.berkasId?.trim() || null,
    berkasPenyimpanan: input.berkasPenyimpanan ?? null,
    berkasNama: input.berkasNama?.trim() || null,
    berkasFormat: input.berkasFormat?.trim().toLowerCase() || null,
    berkasUkuran: input.berkasUkuran ?? null,
    status: input.status,
    akses: input.akses,
  };
}

/** Baris galeri yang siap ditulis, urut sesuai urutan di form. */
export function normalizeMediaArsip(
  media: ArsipInput["media"]
): Omit<Prisma.ArsipMediaUncheckedCreateInput, "arsipId">[] {
  return (media ?? []).map((item, index) => ({
    jenis: item.jenis,
    berkasId: item.berkasId.trim(),
    penyimpanan: item.penyimpanan,
    namaAsli: item.namaAsli?.trim() || null,
    format: item.format?.trim().toLowerCase() || null,
    ukuran: item.ukuran ?? null,
    caption: item.caption?.trim() || null,
    urutan: index,
  }));
}

export function normalizeKerjasamaInput(
  input: KerjasamaInput
): Omit<Prisma.KerjasamaUncheckedCreateInput, "createdById" | "slug"> {
  return {
    organisasi: input.organisasi.trim(),
    programUtama: input.programUtama.trim(),
    profil: input.profil.trim(),
    contohKegiatan: input.contohKegiatan.map((s) => s.trim()).filter(Boolean),
    imageUrl: input.imageUrl?.trim() || null,
    alt: input.alt.trim(),
    linkInstagram: normalisasiInstagram(input.linkInstagram),
    linkTiktok: normalisasiTiktok(input.linkTiktok),
    email: input.email?.trim() || null,
    urutan: input.urutan,
    status: input.status,
  };
}

export function normalizeBeritaInput(
  input: BeritaInput
): Omit<Prisma.BeritaUncheckedCreateInput, "createdById" | "slug"> {
  return {
    judul: input.judul.trim(),
    jenisBeritaId: input.jenisBeritaId,
    tanggal: input.tanggal,
    deskripsiSingkat: input.deskripsiSingkat.trim(),
    deskripsiLengkap: input.deskripsiLengkap?.trim() || null,
    gambarUrl: input.gambarUrl?.trim() || null,
    status: input.status,
  };
}

export function normalizePengurusInput(
  input: PengurusInput
): Omit<Prisma.PengurusUncheckedCreateInput, "createdById"> {
  return {
    nama: input.nama,
    jabatan: input.jabatan,
    angkatan: input.angkatan?.trim() || null,
    ket: input.ket?.trim() || null,
    fotoUrl: input.fotoUrl?.trim() || null,
    urutan: input.urutan,
  };
}
