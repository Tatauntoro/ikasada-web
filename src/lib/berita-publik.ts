import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toPublicBerita, type PublicBerita } from "@/lib/mapper-public";
import type { PublicJenisBerita } from "@/lib/types";

/** Berapa berita terbaru yang dipratinjau di beranda / per halaman `/berita`. */
export const PER_PAGE_BERITA = 6;

export type FilterBeritaPublik = {
  page: number;
  limit: number;
  search?: string | null;
  jenisId?: string | null;
  tahun?: string | null;
};

function whereBeritaTerbit(filter: FilterBeritaPublik): Prisma.BeritaWhereInput {
  const where: Prisma.BeritaWhereInput = {
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

  if (filter.jenisId) where.jenisBeritaId = filter.jenisId;

  const tahun = Number(filter.tahun);
  if (filter.tahun && /^\d{4}$/.test(filter.tahun) && tahun >= 1900 && tahun <= 2200) {
    // Tanggal berita ditampilkan dalam WIB, jadi batas tahun juga mengikuti WIB.
    where.tanggal = {
      gte: new Date(`${filter.tahun}-01-01T00:00:00+07:00`),
      lt: new Date(`${tahun + 1}-01-01T00:00:00+07:00`),
    };
  }

  return where;
}

/**
 * Daftar berita terbit untuk halaman publik.
 *
 * Hanya baris `PUBLISHED` dan belum dihapus yang keluar, urut dari yang paling
 * baru. Dipakai bersama oleh `/api/public/berita` dan halaman `/berita`
 * (server-render) supaya keduanya tidak mungkin berbeda.
 */
export async function daftarBeritaPublik(
  filter: FilterBeritaPublik
): Promise<{ items: PublicBerita[]; total: number }> {
  const where = whereBeritaTerbit(filter);

  const [data, total] = await prisma.$transaction([
    prisma.berita.findMany({
      where,
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      include: { jenisBerita: true },
    }),
    prisma.berita.count({ where }),
  ]);

  return { items: data.map(toPublicBerita), total };
}

/** Jenis yang dipakai oleh setidaknya satu berita publik. */
export async function jenisBeritaTerpakai(): Promise<PublicJenisBerita[]> {
  return prisma.jenisBerita.findMany({
    where: {
      deletedAt: null,
      berita: { some: { status: "PUBLISHED", deletedAt: null } },
    },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });
}

/** Tahun berita terbit dalam zona waktu WIB, terbaru lebih dulu. */
export async function tahunBeritaTersedia(): Promise<string[]> {
  const baris = await prisma.berita.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { tanggal: true },
    orderBy: { tanggal: "desc" },
  });

  return [...new Set(baris.map(({ tanggal }) =>
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
    }).format(tanggal)
  ))];
}

/** Satu berita terbit berdasarkan slug, atau `null` bila tidak ada. */
export async function ambilBeritaPublik(
  slug: string
): Promise<PublicBerita | null> {
  const berita = await prisma.berita.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: { jenisBerita: true },
  });

  return berita ? toPublicBerita(berita) : null;
}

/** Media galeri satu berita terbit (urut sesuai form). */
export type MediaBeritaPublik = {
  id: string;
  jenis: "FOTO" | "VIDEO";
  caption: string | null;
};

export async function ambilMediaBeritaPublik(
  slug: string
): Promise<MediaBeritaPublik[]> {
  const berita = await prisma.berita.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: { id: true },
  });

  if (!berita) return [];

  return prisma.beritaMedia.findMany({
    where: { beritaId: berita.id },
    orderBy: { urutan: "asc" },
    select: { id: true, jenis: true, caption: true },
  });
}
