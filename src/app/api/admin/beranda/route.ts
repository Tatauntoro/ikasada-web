import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { pastikanSectionAda } from "@/lib/beranda-server";

/**
 * Kelola Beranda — daftar section + titik sebaran (khusus pemegang izin
 * `beranda:lihat`). Mutasi ada di route masing-masing (`[id]`).
 */
async function handler(req: NextRequest): Promise<Response> {
  void req;
  await requirePermission(MODUL.BERANDA, AKSI.LIHAT);
  await pastikanSectionAda();

  const [section, titik] = await Promise.all([
    prisma.sectionBeranda.findMany({
      where: { deletedAt: null },
      orderBy: [{ urutan: "asc" }, { kunci: "asc" }],
    }),
    prisma.titikSebaran.findMany({
      where: { deletedAt: null },
      orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return ok({ section, titik });
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
