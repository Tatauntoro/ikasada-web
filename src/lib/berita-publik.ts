import { prisma } from "@/lib/db";
import { toPublicBerita, type PublicBerita } from "@/lib/mapper-public";

/** Berapa berita terbaru yang dipratinjau di beranda / per halaman `/berita`. */
export const PER_PAGE_BERITA = 6;

export type FilterBeritaPublik = {
  page: number;
  limit: number;
};

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
  const where = { status: "PUBLISHED" as const, deletedAt: null };

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
