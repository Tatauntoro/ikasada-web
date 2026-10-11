import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ok, badRequest, conflict, notFound, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireSuperadmin } from "@/lib/sesi-admin";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";
import { normalisasiIzin } from "@/lib/permission";
import { divisiUpdateSchema } from "@/lib/validations/divisi";

/**
 * Ubah & hapus (soft) satu Divisi (khusus superadmin).
 *
 * Divisi tidak di-hard-delete: `deletedAt` diisi supaya konten lama yang
 * merujuknya tidak kehilangan jejak, dan admin anggotanya tinggal dilepas
 * (`divisiId` jadi null) — bukan ikut terhapus.
 */
type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireSuperadmin();
  const { id } = await params;

  const existing = await prisma.divisi.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    return notFound("Divisi tidak ditemukan");
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    const parsed = divisiUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const data = parsed.data;

    if (data.nama && data.nama !== existing.nama) {
      const bentrok = await prisma.divisi.findUnique({
        where: { nama: data.nama },
      });
      if (bentrok && bentrok.id !== id && !bentrok.deletedAt) {
        return conflict("Divisi dengan nama tersebut sudah ada");
      }
    }

    const izinBaru =
      data.permissions !== undefined
        ? normalisasiIzin(data.permissions)
        : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      let slug = existing.slug;
      if (data.nama && data.nama !== existing.nama) {
        const dasar = generateSlug(data.nama);
        if (dasar !== existing.slug) {
          slug = await generateUniqueSlug(data.nama, tx, {
            table: "divisi",
            existingId: id,
          });
        }
      }

      const hasil = await tx.divisi.update({
        where: { id },
        data: {
          ...(data.nama !== undefined ? { nama: data.nama, slug } : {}),
          ...(data.urutan !== undefined ? { urutan: data.urutan } : {}),
          ...(data.lintasDivisi !== undefined
            ? { lintasDivisi: data.lintasDivisi }
            : {}),
          ...(izinBaru !== undefined
            ? { permissions: izinBaru as Prisma.InputJsonValue }
            : {}),
        },
      });

      /*
       * Template izin berubah → terapkan ulang ke **semua anggota** divisi ini.
       * Dengan begitu perubahan di Kelola Divisi langsung ter-reflect di
       * masing-masing akun yang terhubung (izin per-admin yang berbeda akan
       * tertimpa oleh template, sesuai maksud "template divisi").
       */
      if (izinBaru !== undefined) {
        await tx.adminUser.updateMany({
          // Hanya anggota yang belum memakai izin khusus yang ikut template.
          where: { divisiId: id, izinKhusus: false },
          data: { permissions: izinBaru as Prisma.InputJsonValue },
        });
      }

      await catatAudit(tx, {
        adminId: session.sub,
        aksi: "DIVISI_UPDATE",
        entitas: "Divisi",
        entitasId: id,
        detailPerubahan: diffPerubahan(
          {
            nama: existing.nama,
            urutan: existing.urutan,
            lintasDivisi: existing.lintasDivisi,
            permissions: existing.permissions,
          },
          {
            nama: hasil.nama,
            urutan: hasil.urutan,
            lintasDivisi: hasil.lintasDivisi,
            permissions: hasil.permissions,
          }
        ),
      });

      return hasil;
    });

    return ok(updated);
  }

  if (req.method === "DELETE") {
    await prisma.$transaction(async (tx) => {
      // Lepaskan admin dari divisi ini (jangan biarkan menunjuk divisi terhapus).
      await tx.adminUser.updateMany({
        where: { divisiId: id },
        data: { divisiId: null },
      });
      await tx.divisi.update({ where: { id }, data: { deletedAt: new Date() } });

      await catatAudit(tx, {
        adminId: session.sub,
        aksi: "DIVISI_DELETE",
        entitas: "Divisi",
        entitasId: id,
      });
    });

    return ok({ message: "Divisi berhasil dihapus" });
  }

  return badRequest("Method tidak didukung");
}

export const PATCH = apiHandler(handler);
export const DELETE = apiHandler(handler);
export const dynamic = "force-dynamic";
