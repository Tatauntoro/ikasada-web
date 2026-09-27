import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  ok,
  badRequest,
  notFound,
  conflict,
  validationError,
} from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { kategoriKegiatanSchema } from "@/lib/validations/kategoriKegiatan";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getKategoriOr404(id: string) {
  return prisma.kategoriKegiatan.findFirst({
    where: { id, deletedAt: null },
  });
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;

  const existing = await getKategoriOr404(id);
  if (!existing) {
    return notFound("Kategori kegiatan tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = kategoriKegiatanSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { namaKategori } = parsed.data;

  if (namaKategori !== existing.namaKategori) {
    const duplicate = await prisma.kategoriKegiatan.findFirst({
      where: { namaKategori, deletedAt: null, id: { not: id } },
    });
    if (duplicate) {
      return conflict("Kategori kegiatan dengan nama tersebut sudah ada");
    }
  }

  const updated = await prisma.kategoriKegiatan.update({
    where: { id },
    data: { namaKategori },
  });

  return ok(updated);
}

async function handleDelete(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;

  const existing = await getKategoriOr404(id);
  if (!existing) {
    return notFound("Kategori kegiatan tidak ditemukan");
  }

  const usedCount = await prisma.kegiatan.count({
    where: { kategoriKegiatanId: id, deletedAt: null },
  });

  if (usedCount > 0) {
    return badRequest(
      `Kategori kegiatan tidak dapat dihapus karena masih digunakan oleh ${usedCount} kegiatan`
    );
  }

  await prisma.kategoriKegiatan.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return ok({ message: "Kategori kegiatan berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.KATEGORI_KEGIATAN, req.method);

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
