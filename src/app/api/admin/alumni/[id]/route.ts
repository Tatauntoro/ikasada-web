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
import { normalizeAlumniInput } from "@/lib/normalize-input";
import { alumniUpdateSchema } from "@/lib/validations/alumni";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getAlumniOr404(id: string) {
  const alumni = await prisma.alumni.findUnique({
    where: { id, deletedAt: null },
    include: { sektorIndustri: true },
  });

  if (!alumni) {
    return null;
  }

  return alumni;
}

async function handleDetail(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;
  const alumni = await getAlumniOr404(id);

  if (!alumni) {
    return notFound("Alumni tidak ditemukan");
  }

  return ok(alumni);
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireAdmin();
  const { id } = await params;

  const existing = await getAlumniOr404(id);
  if (!existing) {
    return notFound("Alumni tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = alumniUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeAlumniInput(parsed.data);

  const sektorIndustri = await prisma.sektorIndustri.findFirst({
    where: { id: parsed.data.sektorIndustriId, deletedAt: null },
  });

  if (!sektorIndustri) {
    return badRequest("Sektor industri tidak ditemukan", {
      sektorIndustriId: "Sektor industri tidak valid",
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.alumni.update({
      where: { id },
      data,
    });

    const perubahan = diffPerubahan(
      {
        namaLengkap: existing.namaLengkap,
        gelar: existing.gelar,
        fotoUrl: existing.fotoUrl,
        angkatan: existing.angkatan,
        programStudi: existing.programStudi,
        profesi: existing.profesi,
        instansi: existing.instansi,
        sektorIndustriId: existing.sektorIndustriId,
        email: existing.email,
        noWhatsapp: existing.noWhatsapp,
        linkInstagram: existing.linkInstagram,
        linkSosmedLain: existing.linkSosmedLain,
        status: existing.status,
      },
      {
        namaLengkap: result.namaLengkap,
        gelar: result.gelar,
        fotoUrl: result.fotoUrl,
        angkatan: result.angkatan,
        programStudi: result.programStudi,
        profesi: result.profesi,
        instansi: result.instansi,
        sektorIndustriId: result.sektorIndustriId,
        email: result.email,
        noWhatsapp: result.noWhatsapp,
        linkInstagram: result.linkInstagram,
        linkSosmedLain: result.linkSosmedLain,
        status: result.status,
      }
    );

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "UPDATE",
      entitas: "Alumni",
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

  const existing = await getAlumniOr404(id);
  if (!existing) {
    return notFound("Alumni tidak ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.alumni.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "DELETE",
      entitas: "Alumni",
      entitasId: id,
    });
  });

  return ok({ message: "Alumni berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.ALUMNI, req.method);

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
