import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, notFound, ok, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { titikSebaranUpdateSchema } from "@/lib/validations/beranda";

/** Ubah / hapus (soft) satu titik sebaran geografis. */
type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;

  const existing = await prisma.titikSebaran.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    return notFound("Titik sebaran tidak ditemukan");
  }

  if (req.method === "PATCH") {
    const sesi = await requirePermission(MODUL.BERANDA, AKSI.UBAH);

    const parsed = titikSebaranUpdateSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) {
      return validationError(parsed.error);
    }
    const data = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const hasil = await tx.titikSebaran.update({
        where: { id },
        data: {
          ...(data.nama !== undefined ? { nama: data.nama } : {}),
          ...(data.lat !== undefined ? { lat: data.lat } : {}),
          ...(data.lng !== undefined ? { lng: data.lng } : {}),
          ...(data.keterangan !== undefined
            ? { keterangan: data.keterangan }
            : {}),
          ...(data.urutan !== undefined ? { urutan: data.urutan } : {}),
          ...(data.aktif !== undefined ? { aktif: data.aktif } : {}),
        },
      });

      await catatAudit(tx, {
        adminId: sesi.sub,
        aksi: "UPDATE",
        entitas: "TitikSebaran",
        entitasId: id,
        detailPerubahan: diffPerubahan(
          {
            nama: existing.nama,
            lat: existing.lat,
            lng: existing.lng,
            keterangan: existing.keterangan,
            urutan: existing.urutan,
            aktif: existing.aktif,
          },
          {
            nama: hasil.nama,
            lat: hasil.lat,
            lng: hasil.lng,
            keterangan: hasil.keterangan,
            urutan: hasil.urutan,
            aktif: hasil.aktif,
          }
        ),
      });

      return hasil;
    });

    return ok(updated);
  }

  if (req.method === "DELETE") {
    const sesi = await requirePermission(MODUL.BERANDA, AKSI.HAPUS);

    await prisma.$transaction(async (tx) => {
      await tx.titikSebaran.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await catatAudit(tx, {
        adminId: sesi.sub,
        aksi: "DELETE",
        entitas: "TitikSebaran",
        entitasId: id,
      });
    });

    return ok({ message: "Titik sebaran dihapus" });
  }

  return badRequest("Method tidak didukung");
}

export const PATCH = apiHandler(handler);
export const DELETE = apiHandler(handler);
export const dynamic = "force-dynamic";
