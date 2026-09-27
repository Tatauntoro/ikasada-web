import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { toPublicPengurus } from "@/lib/mapper-public";

async function handler(req: NextRequest): Promise<Response> {
  void req;

  const search = req.nextUrl.searchParams.get("search")?.trim();

  const where: Prisma.PengurusWhereInput = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { nama: { contains: search, mode: "insensitive" } },
      { jabatan: { contains: search, mode: "insensitive" } },
    ];
  }

  const pengurus = await prisma.pengurus.findMany({
    where,
    orderBy: { urutan: "asc" },
  });

  return ok(pengurus.map(toPublicPengurus));
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
