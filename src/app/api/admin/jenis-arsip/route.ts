import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, badRequest, conflict, created, validationError } from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { jenisArsipSchema } from "@/lib/validations/jenisArsip";

async function handleList(): Promise<Response> {
  const jenis = await prisma.jenisArsip.findMany({
    where: { deletedAt: null },
    orderBy: { nama: "asc" },
  });

  return ok(jenis);
}

async function handleCreate(req: NextRequest): Promise<Response> {
  const body = await readJsonBody(req);
  const parsed = jenisArsipSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { nama } = parsed.data;

  const existing = await prisma.jenisArsip.findUnique({ where: { nama } });

  if (existing && !existing.deletedAt) {
    return conflict("Jenis arsip dengan nama tersebut sudah ada");
  }

  // Bila nama yang sama pernah dihapus, aktifkan kembali barisnya.
  const jenis = existing
    ? await prisma.jenisArsip.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      })
    : await prisma.jenisArsip.create({ data: { nama } });

  return created(jenis);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.JENIS_ARSIP, req.method);

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
