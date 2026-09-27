import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { okPaginated } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { parsePagination } from "@/lib/pagination";
import { toPublicKegiatan } from "@/lib/mapper-public";

async function handler(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);

  const search = searchParams.get("search")?.trim();
  const kategori = searchParams.get("kategori");

  const where: Prisma.KegiatanWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { judul: { contains: search, mode: "insensitive" } },
      { deskripsiSingkat: { contains: search, mode: "insensitive" } },
    ];
  }

  if (kategori) {
    where.kategoriKegiatanId = kategori;
  }

  const [data, total] = await prisma.$transaction([
    prisma.kegiatan.findMany({
      where,
      orderBy: { tanggalMulai: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: { kategoriKegiatan: true },
    }),
    prisma.kegiatan.count({ where }),
  ]);

  return okPaginated(data.map(toPublicKegiatan), {
    page: pagination.page,
    limit: pagination.limit,
    total,
  });
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
