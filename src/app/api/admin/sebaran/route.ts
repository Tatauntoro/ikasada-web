import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, created, ok, validationError } from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { catatAudit } from "@/lib/audit";
import { titikSebaranSchema } from "@/lib/validations/beranda";

/**
 * Titik sebaran geografis (peta beranda): daftar + tambah.
 * Ubah/hapus ada di `[id]`.
 */
async function handleList(): Promise<Response> {
  await requirePermission(MODUL.BERANDA, AKSI.LIHAT);

  const data = await prisma.titikSebaran.findMany({
    where: { deletedAt: null },
    orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
  });

  return ok(data);
}

async function handleCreate(req: NextRequest): Promise<Response> {
  const sesi = await requirePermission(MODUL.BERANDA, AKSI.TAMBAH);

  const parsed = titikSebaranSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const data = parsed.data;

  const dibuat = await prisma.$transaction(async (tx) => {
    const hasil = await tx.titikSebaran.create({
      data: {
        nama: data.nama,
        lat: data.lat,
        lng: data.lng,
        keterangan: data.keterangan ?? null,
        urutan: data.urutan ?? 0,
        aktif: data.aktif ?? true,
      },
    });

    await catatAudit(tx, {
      adminId: sesi.sub,
      aksi: "CREATE",
      entitas: "TitikSebaran",
      entitasId: hasil.id,
    });

    return hasil;
  });

  return created(dibuat);
}

async function handler(req: NextRequest): Promise<Response> {
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
