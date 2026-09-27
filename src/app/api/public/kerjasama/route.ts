import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { toPublicKerjasama } from "@/lib/mapper-public";

const LIMIT = 12;

async function handler(req: NextRequest): Promise<Response> {
  void req;
  const kerjasama = await prisma.kerjasama.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
    take: LIMIT,
  });

  return ok(kerjasama.map(toPublicKerjasama));
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
