import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  ok,
  badRequest,
  notFound,
  validationError,
} from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { normalizePengurusInput } from "@/lib/normalize-input";
import { pengurusUpdateSchema } from "@/lib/validations/pengurus";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getPengurusOr404(id: string) {
  return prisma.pengurus.findUnique({
    where: { id, deletedAt: null },
  });
}

async function handleDetail(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;
  const pengurus = await getPengurusOr404(id);

  if (!pengurus) {
    return notFound("Pengurus tidak ditemukan");
  }

  return ok(pengurus);
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireAdmin();
  const { id } = await params;

  const existing = await getPengurusOr404(id);
  if (!existing) {
    return notFound("Pengurus tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = pengurusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizePengurusInput(parsed.data);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.pengurus.update({
      where: { id },
      data,
    });

    const perubahan = diffPerubahan(
      {
        nama: existing.nama,
        jabatan: existing.jabatan,
        angkatan: existing.angkatan,
        ket: existing.ket,
        fotoUrl: existing.fotoUrl,
        urutan: existing.urutan,
      },
      {
        nama: result.nama,
        jabatan: result.jabatan,
        angkatan: result.angkatan,
        ket: result.ket,
        fotoUrl: result.fotoUrl,
        urutan: result.urutan,
      }
    );

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "UPDATE",
      entitas: "Pengurus",
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

  const existing = await getPengurusOr404(id);
  if (!existing) {
    return notFound("Pengurus tidak ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.pengurus.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "DELETE",
      entitas: "Pengurus",
      entitasId: id,
    });
  });

  return ok({ message: "Pengurus berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.PENGURUS, req.method);

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
