import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, badRequest, conflict, created, validationError } from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { sektorIndustriSchema } from "@/lib/validations/sektorIndustri";

async function handleList(): Promise<Response> {
  const sektor = await prisma.sektorIndustri.findMany({
    where: { deletedAt: null },
    orderBy: { namaSektor: "asc" },
  });

  return ok(sektor);
}

async function handleCreate(req: NextRequest): Promise<Response> {
  const body = await readJsonBody(req);
  const parsed = sektorIndustriSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { namaSektor } = parsed.data;

  const existing = await prisma.sektorIndustri.findUnique({
    where: { namaSektor },
  });

  if (existing && !existing.deletedAt) {
    return conflict("Sektor industri dengan nama tersebut sudah ada");
  }

  // Bila nama yang sama pernah dihapus, aktifkan kembali barisnya.
  const sektor = existing
    ? await prisma.sektorIndustri.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      })
    : await prisma.sektorIndustri.create({ data: { namaSektor } });

  return created(sektor);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.SEKTOR_INDUSTRI, req.method);

  if (req.method === "GET") {
    return handleList();
  }

  if (req.method === "POST") {
    return handleCreate(req);
  }

  return badRequest("Method tidak didukung");
}

export const GET = apiHandlerWithoutParams(handler);
export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
