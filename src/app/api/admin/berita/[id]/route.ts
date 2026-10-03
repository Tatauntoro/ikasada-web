import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, badRequest, notFound, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";
import { normalizeBeritaInput } from "@/lib/normalize-input";
import { beritaUpdateSchema } from "@/lib/validations/berita";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getBeritaOr404(id: string) {
  return prisma.berita.findFirst({
    where: { id, deletedAt: null },
    include: { jenisBerita: true },
  });
}

async function handleDetail(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  await requireAdmin();
  const { id } = await params;

  const berita = await getBeritaOr404(id);
  if (!berita) {
    return notFound("Berita tidak ditemukan");
  }

  return ok(berita);
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireAdmin();
  const { id } = await params;

  const existing = await getBeritaOr404(id);
  if (!existing) {
    return notFound("Berita tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = beritaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeBeritaInput(parsed.data);

  const jenis = await prisma.jenisBerita.findFirst({
    where: { id: data.jenisBeritaId, deletedAt: null },
  });
  if (!jenis) {
    return badRequest("Tipe berita tidak ditemukan", {
      jenisBeritaId: "Tipe berita tidak valid",
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Slug hanya dibuat ulang saat judul berubah, supaya URL yang sudah
    // dibagikan tidak mati karena perubahan lain.
    let slug = existing.slug;
    if (data.judul !== existing.judul) {
      const baseSlug = generateSlug(data.judul);
      if (baseSlug !== existing.slug) {
        slug = await generateUniqueSlug(data.judul, tx, {
          table: "berita",
          existingId: id,
        });
      }
    }

    const hasil = await tx.berita.update({
      where: { id },
      data: { ...data, slug },
    });

    const perubahan = diffPerubahan(
      {
        judul: existing.judul,
        jenisBeritaId: existing.jenisBeritaId,
        tanggal: existing.tanggal,
        deskripsiSingkat: existing.deskripsiSingkat,
        deskripsiLengkap: existing.deskripsiLengkap,
        gambarUrl: existing.gambarUrl,
        status: existing.status,
      },
      {
        judul: data.judul,
        jenisBeritaId: data.jenisBeritaId,
        tanggal: data.tanggal,
        deskripsiSingkat: data.deskripsiSingkat,
        deskripsiLengkap: data.deskripsiLengkap ?? null,
        gambarUrl: data.gambarUrl ?? null,
        status: data.status,
      }
    );

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "UPDATE",
      entitas: "Berita",
      entitasId: id,
      detailPerubahan: perubahan,
    });

    return hasil;
  });

  return ok(updated);
}

async function handleDelete(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireAdmin();
  const { id } = await params;

  const existing = await getBeritaOr404(id);
  if (!existing) {
    return notFound("Berita tidak ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.berita.update({ where: { id }, data: { deletedAt: new Date() } });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "DELETE",
      entitas: "Berita",
      entitasId: id,
    });
  });

  return ok({ message: "Berita berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.BERITA, req.method);

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
