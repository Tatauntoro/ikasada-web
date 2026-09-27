import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  toPublicArsip,
  toPublicJenisArsip,
  type PublicArsip,
  type PublicJenisArsip,
} from "@/lib/mapper-public";

/**
 * Query arsip yang dipakai bersama oleh API publik dan halaman `/arsip`.
 *
 * Halaman `/arsip` merender halaman pertamanya di server lewat fungsi ini juga
 * (bukan lewat HTTP ke API-nya sendiri), supaya HTML awal tetap berisi dokumen —
 * arsipnya tetap terindeks dan tidak ada kedipan kosong saat hidrasi.
 */

export const PER_PAGE_ARSIP = 6;

/** Batas rentang tahun yang dianggap wajar saat menurunkan opsi filter. */
const SPAN_TAHUN_MAKS = 60;

export type FilterArsipPublik = {
  search?: string | null;
  jenisId?: string | null;
  tahun?: string | null;
  page: number;
  limit: number;
  /** Alumni aktif boleh melihat entri `KHUSUS_ALUMNI` (lihat `akses-arsip.ts`). */
  alumniAktif?: boolean;
};

/**
 * Filter tahun berdasarkan **tanggal kegiatan**, bukan tanggal upload.
 *
 * Sebuah arsip bisa mencakup rentang (mis. kumpulan kegiatan 2019–2023), jadi
 * yang diperiksa adalah perpotongan rentang itu dengan tahun yang diminta —
 * memilih 2021 tetap menemukan arsip 2019–2023.
 */
export function whereTahunKegiatan(
  tahun: string | null | undefined
): Prisma.ArsipWhereInput | null {
  if (!tahun) return null;

  const angka = Number(tahun);
  if (!Number.isInteger(angka) || angka < 1900 || angka > 2200) return null;

  return {
    tanggalKegiatanMulai: { lt: new Date(Date.UTC(angka + 1, 0, 1)) },
    tanggalKegiatanSelesai: { gte: new Date(Date.UTC(angka, 0, 1)) },
  };
}

function whereArsipTerbit(filter: FilterArsipPublik): Prisma.ArsipWhereInput {
  /*
   * Semua tingkat akses ikut terdaftar — arsip `KHUSUS_ALUMNI` tampil dalam
   * mode terkunci, bukan disembunyikan (lihat `akses-arsip.ts`). Yang digembok
   * adalah isinya: deskripsi, galeri, dan berkas dokumen.
   */
  const where: Prisma.ArsipWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  const kata = filter.search?.trim();
  if (kata) {
    where.OR = [
      { judul: { contains: kata, mode: "insensitive" } },
      { deskripsiSingkat: { contains: kata, mode: "insensitive" } },
    ];
  }

  if (filter.jenisId) {
    where.jenisArsipId = filter.jenisId;
  }

  return Object.assign(where, whereTahunKegiatan(filter.tahun));
}

export async function daftarArsipPublik(
  filter: FilterArsipPublik
): Promise<{ items: PublicArsip[]; total: number }> {
  const where = whereArsipTerbit(filter);

  const [data, total] = await prisma.$transaction([
    prisma.arsip.findMany({
      where,
      // Terbaru menurut waktu kegiatannya — itu yang dicari pengunjung arsip.
      orderBy: [{ tanggalKegiatanMulai: "desc" }, { createdAt: "desc" }],
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      include: { jenisArsip: true, _count: { select: { media: true } } },
    }),
    prisma.arsip.count({ where }),
  ]);

  return { items: data.map((a) => toPublicArsip(a, { alumniAktif: filter.alumniAktif })), total };
}

/**
 * Tahun yang muncul di data terbit, terbaru dulu — opsi filter tahun.
 *
 * Rentang dipecah menjadi tahun-tahunnya (2019–2023 menjadi 2019, 2020, …)
 * supaya filter tahun menawarkan semua tahun yang benar-benar bisa dipilih.
 * Dihitung dari seluruh data terbit (bukan hasil filter aktif), jadi pilihannya
 * tidak menyusut sendiri saat filter lain dipakai.
 */
export async function tahunArsipTersedia(): Promise<string[]> {
  const baris = await prisma.arsip.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { tanggalKegiatanMulai: true, tanggalKegiatanSelesai: true },
  });

  const tahun = new Set<string>();

  for (const b of baris) {
    const mulai = b.tanggalKegiatanMulai.getUTCFullYear();
    const selesai = b.tanggalKegiatanSelesai.getUTCFullYear();

    for (let t = mulai; t <= Math.min(selesai, mulai + SPAN_TAHUN_MAKS); t += 1) {
      tahun.add(String(t));
    }
  }

  return [...tahun].sort().reverse();
}

/**
 * Jenis yang benar-benar dipakai minimal satu arsip terbit.
 *
 * Jenis tanpa arsip tidak perlu muncul di filter publik: memilihnya pasti
 * menghasilkan daftar kosong.
 */
export async function jenisArsipTerpakai(): Promise<PublicJenisArsip[]> {
  const jenis = await prisma.jenisArsip.findMany({
    where: {
      deletedAt: null,
      arsip: { some: { status: "PUBLISHED", deletedAt: null } },
    },
    orderBy: { nama: "asc" },
  });

  return jenis.map(toPublicJenisArsip);
}
