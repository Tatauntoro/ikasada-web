import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, badRequest, notFound, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { generateUniqueSlug, generateSlug } from "@/lib/slug";
import { normalizeArsipInput, normalizeMediaArsip } from "@/lib/normalize-input";
import { arsipUpdateSchema } from "@/lib/validations/arsip";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getArsipOr404(id: string) {
  return prisma.arsip.findFirst({
    where: { id, deletedAt: null },
    include: {
      jenisArsip: true,
      media: { orderBy: { urutan: "asc" } },
    },
  });
}

async function handleDetail(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  await requireAdmin();
  const { id } = await params;

  const arsip = await getArsipOr404(id);
  if (!arsip) {
    return notFound("Arsip tidak ditemukan");
  }

  return ok(arsip);
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireAdmin();
  const { id } = await params;

  const existing = await getArsipOr404(id);
  if (!existing) {
    return notFound("Arsip tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = arsipUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeArsipInput(parsed.data);
  const media = normalizeMediaArsip(parsed.data.media);

  const jenis = await prisma.jenisArsip.findFirst({
    where: { id: data.jenisArsipId, deletedAt: null },
  });
  if (!jenis) {
    return badRequest("Jenis arsip tidak ditemukan", {
      jenisArsipId: "Jenis tidak valid",
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    let slug = existing.slug;
    if (data.judul !== existing.judul) {
      const baseSlug = generateSlug(data.judul);
      if (baseSlug !== existing.slug) {
        slug = await generateUniqueSlug(data.judul, tx, {
          table: "arsip",
          existingId: id,
        });
      }
    }

    const result = await tx.arsip.update({
      where: { id },
      data: { ...data, slug },
    });

    /*
     * Galeri ditulis ulang dari daftar yang dikirim form: hapus lalu buat lagi.
     * Urutannya pun jadi mengikuti urutan di form, dan media yang dihapus admin
     * tidak menyisakan baris menggantung.
     */
    await tx.arsipMedia.deleteMany({ where: { arsipId: id } });
    if (media.length > 0) {
      await tx.arsipMedia.createMany({
        data: media.map((item) => ({ ...item, arsipId: id })),
      });
    }

    const perubahan = diffPerubahan(
      {
        judul: existing.judul,
        jenisArsipId: existing.jenisArsipId,
        tanggalUpload: existing.tanggalUpload,
        tanggalKegiatanMulai: existing.tanggalKegiatanMulai,
        tanggalKegiatanSelesai: existing.tanggalKegiatanSelesai,
        deskripsiSingkat: existing.deskripsiSingkat,
        deskripsiLengkap: existing.deskripsiLengkap,
        gambarSampulUrl: existing.gambarSampulUrl,
        alt: existing.alt,
        berkasId: existing.berkasId,
        berkasNama: existing.berkasNama,
        berkasFormat: existing.berkasFormat,
        berkasUkuran: existing.berkasUkuran,
        jumlahMedia: existing.media.length,
        status: existing.status,
        slug: existing.slug,
      },
      {
        judul: result.judul,
        jenisArsipId: result.jenisArsipId,
        tanggalUpload: result.tanggalUpload,
        tanggalKegiatanMulai: result.tanggalKegiatanMulai,
        tanggalKegiatanSelesai: result.tanggalKegiatanSelesai,
        deskripsiSingkat: result.deskripsiSingkat,
        deskripsiLengkap: result.deskripsiLengkap,
        gambarSampulUrl: result.gambarSampulUrl,
        alt: result.alt,
        berkasId: result.berkasId,
        berkasNama: result.berkasNama,
        berkasFormat: result.berkasFormat,
        berkasUkuran: result.berkasUkuran,
        jumlahMedia: media.length,
        status: result.status,
        slug: result.slug,
      }
    );

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "UPDATE",
      entitas: "Arsip",
      entitasId: id,
      detailPerubahan: perubahan,
    });

    return result;
  });

  return ok(updated);
}

async function handleDelete(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireAdmin();
  const { id } = await params;

  const existing = await getArsipOr404(id);
  if (!existing) {
    return notFound("Arsip tidak ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.arsip.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "DELETE",
      entitas: "Arsip",
      entitasId: id,
    });
  });

  return ok({ message: "Arsip berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.ARSIP, req.method);

  if (req.method === "GET") {
    return handleDetail(req, context);
  }

  if (req.method === "PUT") {
    return handleUpdate(req, context);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, context);
  }

  return badRequest("Method tidak didukung");
}

export const GET = apiHandler(handler);
export const PUT = apiHandler(handler);
export const DELETE = apiHandler(handler);
export const dynamic = "force-dynamic";
