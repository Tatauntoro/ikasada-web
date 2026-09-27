import { NextRequest } from "next/server";
import { StatusKegiatan } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";

async function handler(req: NextRequest): Promise<Response> {
  void req;

  const now = new Date();

  const [
    totalAlumni,
    totalKegiatan,
    totalPengurus,
    angkatanRows,
    kegiatanTerakhir,
    kegiatanMendatang,
  ] = await prisma.$transaction([
    prisma.alumni.count({
      where: { status: "PUBLISHED", deletedAt: null },
    }),
    prisma.kegiatan.count({
      where: {
        status: { in: [StatusKegiatan.PUBLISHED, StatusKegiatan.SELESAI] },
        deletedAt: null,
      },
    }),
    prisma.pengurus.count({
      where: { deletedAt: null },
    }),
    prisma.alumni.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { angkatan: true },
    }),
    prisma.kegiatan.findFirst({
      where: {
        status: { in: [StatusKegiatan.PUBLISHED, StatusKegiatan.SELESAI] },
        deletedAt: null,
        tanggalMulai: { lte: now },
      },
      orderBy: { tanggalMulai: "desc" },
      select: { id: true, slug: true, judul: true, tanggalMulai: true },
    }),
    prisma.kegiatan.findMany({
      where: {
        status: StatusKegiatan.PUBLISHED,
        deletedAt: null,
        tanggalMulai: { gte: now },
      },
      orderBy: { tanggalMulai: "asc" },
      take: 3,
      select: { id: true, slug: true, judul: true, tanggalMulai: true },
    }),
  ]);

  // Bucket alumni by decade of graduation.
  const buckets = new Map<number, number>();
  for (const row of angkatanRows) {
    const dekade = Math.floor(row.angkatan / 10) * 10;
    buckets.set(dekade, (buckets.get(dekade) ?? 0) + 1);
  }
  const angkatanPerDekade = Array.from(buckets.entries())
    .map(([dekade, jumlah]) => ({ dekade, jumlah }))
    .sort((a, b) => a.dekade - b.dekade);

  return ok({
    totalAlumni,
    totalKegiatan,
    totalPengurus,
    angkatanPerDekade,
    kegiatanTerakhir,
    kegiatanMendatang,
  });
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
