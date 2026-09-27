import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  ok,
  created,
  badRequest,
  conflict,
  validationError,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { kategoriKegiatanSchema } from "@/lib/validations/kategoriKegiatan";

async function handleList(): Promise<Response> {
  const kategori = await prisma.kategoriKegiatan.findMany({
    where: { deletedAt: null },
    orderBy: { namaKategori: "asc" },
  });

  return ok(kategori);
}

async function handleCreate(req: NextRequest): Promise<Response> {
  const body = await readJsonBody(req);
  const parsed = kategoriKegiatanSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { namaKategori } = parsed.data;

  const existing = await prisma.kategoriKegiatan.findUnique({
    where: { namaKategori },
  });
  if (existing && !existing.deletedAt) {
    return conflict("Kategori kegiatan dengan nama tersebut sudah ada");
  }

  // Bila nama yang sama pernah dihapus, aktifkan kembali barisnya.
  const kategori = existing
    ? await prisma.kategoriKegiatan.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      })
    : await prisma.kategoriKegiatan.create({ data: { namaKategori } });

  return created(kategori);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.KATEGORI_KEGIATAN, req.method);

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
