import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, notFound } from "@/lib/response";
import { apiHandler } from "@/lib/api-handler";
import { toPublicKegiatan } from "@/lib/mapper-public";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

async function handler(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { slug } = await params;

  const kegiatan = await prisma.kegiatan.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: { kategoriKegiatan: true },
  });

  if (!kegiatan) {
    return notFound("Kegiatan tidak ditemukan");
  }

  return ok(toPublicKegiatan(kegiatan));
}

export const GET = apiHandler(handler);
export const dynamic = "force-dynamic";
