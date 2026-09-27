import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, badRequest, notFound, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { generateUniqueSlug, generateSlug } from "@/lib/slug";
import { normalizeKerjasamaInput } from "@/lib/normalize-input";
import { kerjasamaUpdateSchema } from "@/lib/validations/kerjasama";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getKerjasamaOr404(id: string) {
  return prisma.kerjasama.findFirst({
    where: { id, deletedAt: null },
  });
}

async function handleDetail(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  await requireAdmin();
  const { id } = await params;

  const kerjasama = await getKerjasamaOr404(id);
  if (!kerjasama) {
    return notFound("Kerjasama tidak ditemukan");
  }

  return ok(kerjasama);
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireAdmin();
  const { id } = await params;

  const existing = await getKerjasamaOr404(id);
  if (!existing) {
    return notFound("Kerjasama tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = kerjasamaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeKerjasamaInput(parsed.data);

  const updated = await prisma.$transaction(async (tx) => {
    let slug = existing.slug;
    if (data.organisasi !== existing.organisasi) {
      const baseSlug = generateSlug(data.organisasi);
      if (baseSlug !== existing.slug) {
        slug = await generateUniqueSlug(data.organisasi, tx, {
          table: "kerjasama",
          existingId: id,
        });
      }
    }

    const result = await tx.kerjasama.update({
      where: { id },
      data: { ...data, slug },
    });

    const perubahan = diffPerubahan(
      {
        organisasi: existing.organisasi,
        programUtama: existing.programUtama,
        profil: existing.profil,
        contohKegiatan: existing.contohKegiatan,
        imageUrl: existing.imageUrl,
        alt: existing.alt,
        linkInstagram: existing.linkInstagram,
        linkTiktok: existing.linkTiktok,
        email: existing.email,
        urutan: existing.urutan,
        status: existing.status,
        slug: existing.slug,
      },
      {
        organisasi: result.organisasi,
        programUtama: result.programUtama,
        profil: result.profil,
        contohKegiatan: result.contohKegiatan,
        imageUrl: result.imageUrl,
        alt: result.alt,
        linkInstagram: result.linkInstagram,
        linkTiktok: result.linkTiktok,
        email: result.email,
        urutan: result.urutan,
        status: result.status,
        slug: result.slug,
      }
    );

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "UPDATE",
      entitas: "Kerjasama",
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

  const existing = await getKerjasamaOr404(id);
  if (!existing) {
    return notFound("Kerjasama tidak ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.kerjasama.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "DELETE",
      entitas: "Kerjasama",
      entitasId: id,
    });
  });

  return ok({ message: "Kerjasama berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.KERJASAMA, req.method);

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
