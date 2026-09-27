import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, badRequest, notFound, conflict, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { jenisArsipSchema } from "@/lib/validations/jenisArsip";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getJenisOr404(id: string) {
  return prisma.jenisArsip.findFirst({
    where: { id, deletedAt: null },
  });
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;

  const existing = await getJenisOr404(id);
  if (!existing) {
    return notFound("Jenis arsip tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = jenisArsipSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { nama } = parsed.data;

  if (nama !== existing.nama) {
    const duplicate = await prisma.jenisArsip.findFirst({
      where: { nama, deletedAt: null, id: { not: id } },
    });
    if (duplicate) {
      return conflict("Jenis arsip dengan nama tersebut sudah ada");
    }
  }

  const updated = await prisma.jenisArsip.update({
    where: { id },
    data: { nama },
  });

  return ok(updated);
}

async function handleDelete(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;

  const existing = await getJenisOr404(id);
  if (!existing) {
    return notFound("Jenis arsip tidak ditemukan");
  }

  const dipakai = await prisma.arsip.count({
    where: { jenisArsipId: id, deletedAt: null },
  });

  if (dipakai > 0) {
    return badRequest(
      `Jenis arsip tidak dapat dihapus karena masih dipakai oleh ${dipakai} arsip`
    );
  }

  await prisma.jenisArsip.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return ok({ message: "Jenis arsip berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.JENIS_ARSIP, req.method);

  if (req.method === "PUT" || req.method === "PATCH") {
    return handleUpdate(req, context);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, context);
  }

  return badRequest("Method tidak didukung");
}

export const PUT = apiHandler(handler);
export const PATCH = apiHandler(handler);
export const DELETE = apiHandler(handler);
export const dynamic = "force-dynamic";
