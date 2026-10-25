import { NextRequest } from "next/server";
import { StatusKegiatan } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { hitungStatistikAlumni } from "@/lib/statistik-alumni";

async function handler(req: NextRequest): Promise<Response> {
  void req;

  const now = new Date();

  const [
    totalAlumni,
    totalKegiatan,
    totalPengurus,
    alumniRows,
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
      select: {
        angkatan: true,
        profesi: true,
        sektorIndustri: {
          select: { id: true, namaSektor: true, deletedAt: true },
        },
      },
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

  return ok({
    totalAlumni,
    totalKegiatan,
    totalPengurus,
    ...hitungStatistikAlumni(alumniRows),
    kegiatanTerakhir,
    kegiatanMendatang,
  });
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
