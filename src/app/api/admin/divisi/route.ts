import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  ok,
  created,
  badRequest,
  conflict,
  validationError,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requireSuperadmin } from "@/lib/sesi-admin";
import { catatAudit } from "@/lib/audit";
import { generateUniqueSlug } from "@/lib/slug";
import { normalisasiIzin } from "@/lib/permission";
import { divisiCreateSchema } from "@/lib/validations/divisi";

/**
 * Master data Divisi (khusus superadmin).
 *
 * `GET` daftar divisi aktif; `POST` membuat divisi baru. `permissions` yang
 * dikirim dinormalisasi (modul/aksi tak dikenal dibuang) sebelum disimpan — sama
 * seperti izin admin.
 */
async function handleList(): Promise<Response> {
  const divisi = await prisma.divisi.findMany({
    where: { deletedAt: null },
    orderBy: [{ urutan: "asc" }, { nama: "asc" }],
    include: { _count: { select: { admin: true } } },
  });

  return ok(divisi);
}

async function handleCreate(req: NextRequest): Promise<Response> {
  const session = await requireSuperadmin();
  const body = await readJsonBody(req);

  const parsed = divisiCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { nama, urutan, lintasDivisi, permissions } = parsed.data;

  const existing = await prisma.divisi.findUnique({ where: { nama } });
  if (existing && !existing.deletedAt) {
    return conflict("Divisi dengan nama tersebut sudah ada");
  }

  const divisi = await prisma.$transaction(async (tx) => {
    const slug = await generateUniqueSlug(nama, tx, { table: "divisi" });

    // Nama yang pernah dihapus diaktifkan kembali, bukan dibuat duplikat.
    const dibuat = existing
      ? await tx.divisi.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            slug,
            urutan: urutan ?? existing.urutan,
            lintasDivisi: lintasDivisi ?? existing.lintasDivisi,
            permissions: permissions
              ? normalisasiIzin(permissions)
              : ((existing.permissions ?? {}) as Prisma.InputJsonValue),
          },
        })
      : await tx.divisi.create({
          data: {
            nama,
            slug,
            urutan: urutan ?? 0,
            lintasDivisi: lintasDivisi ?? false,
            permissions: normalisasiIzin(permissions),
          },
        });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "DIVISI_CREATE",
      entitas: "Divisi",
      entitasId: dibuat.id,
    });

    return dibuat;
  });

  return created(divisi);
}

async function handler(req: NextRequest): Promise<Response> {
  await requireSuperadmin();

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
