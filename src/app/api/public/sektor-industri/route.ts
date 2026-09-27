import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { toPublicSektorIndustri } from "@/lib/mapper-public";

async function handler(req: NextRequest): Promise<Response> {
  void req;
  const sektor = await prisma.sektorIndustri.findMany({
    where: { deletedAt: null },
    orderBy: { namaSektor: "asc" },
  });

  return ok(sektor.map(toPublicSektorIndustri));
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
