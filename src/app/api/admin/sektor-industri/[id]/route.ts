import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, badRequest, notFound, conflict, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { sektorIndustriSchema } from "@/lib/validations/sektorIndustri";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getSektorOr404(id: string) {
  return prisma.sektorIndustri.findFirst({
    where: { id, deletedAt: null },
  });
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;

  const existing = await getSektorOr404(id);
  if (!existing) {
    return notFound("Sektor industri tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = sektorIndustriSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { namaSektor } = parsed.data;

  if (namaSektor !== existing.namaSektor) {
    const duplicate = await prisma.sektorIndustri.findFirst({
      where: { namaSektor, deletedAt: null, id: { not: id } },
    });
    if (duplicate) {
      return conflict("Sektor industri dengan nama tersebut sudah ada");
    }
  }

  const updated = await prisma.sektorIndustri.update({
    where: { id },
    data: { namaSektor },
  });

  return ok(updated);
}

async function handleDelete(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;

  const existing = await getSektorOr404(id);
  if (!existing) {
    return notFound("Sektor industri tidak ditemukan");
  }

  const usedCount = await prisma.alumni.count({
    where: { sektorIndustriId: id, deletedAt: null },
  });

  if (usedCount > 0) {
    return badRequest(
      `Sektor industri tidak dapat dihapus karena masih digunakan oleh ${usedCount} alumni`
    );
  }

  await prisma.sektorIndustri.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return ok({ message: "Sektor industri berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.SEKTOR_INDUSTRI, req.method);

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
