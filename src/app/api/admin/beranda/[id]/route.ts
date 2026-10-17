import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, notFound, ok, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { sectionUpdateSchema, skemaKonfigurasi } from "@/lib/validations/beranda";

/**
 * Ubah satu section beranda: tampil/tidak (`aktif`), `urutan`, dan teks
 * (eyebrow/judul/deskripsi). Section tidak bisa ditambah/dihapus — kuncinya
 * tetap, hanya isinya yang diatur.
 */
type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  if (req.method !== "PATCH") {
    return badRequest("Method tidak didukung");
  }

  const sesi = await requirePermission(MODUL.BERANDA, AKSI.UBAH);
  const { id } = await params;

  const parsed = sectionUpdateSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const data = parsed.data;

  const existing = await prisma.sectionBeranda.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    return notFound("Section tidak ditemukan");
  }

  // Konfigurasi khas section divalidasi sesuai kuncinya (lima-cara / kontak).
  let konfigurasiBaru: Prisma.InputJsonValue | undefined;
  if (data.konfigurasi !== undefined) {
    const skema = skemaKonfigurasi(existing.kunci);
    if (!skema) {
      return badRequest("Section ini tidak menerima konfigurasi tambahan");
    }
    const r = skema.safeParse(data.konfigurasi);
    if (!r.success) {
      return validationError(r.error);
    }
    konfigurasiBaru = r.data as Prisma.InputJsonValue;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const hasil = await tx.sectionBeranda.update({
      where: { id },
      data: {
        ...(data.aktif !== undefined ? { aktif: data.aktif } : {}),
        ...(data.urutan !== undefined ? { urutan: data.urutan } : {}),
        ...(data.judul !== undefined ? { judul: data.judul } : {}),
        ...(data.eyebrow !== undefined ? { eyebrow: data.eyebrow } : {}),
        ...(data.deskripsi !== undefined ? { deskripsi: data.deskripsi } : {}),
        ...(data.warnaJudul !== undefined
          ? { warnaJudul: data.warnaJudul }
          : {}),
        ...(data.warnaEyebrow !== undefined
          ? { warnaEyebrow: data.warnaEyebrow }
          : {}),
        ...(data.ukuranJudul !== undefined
          ? { ukuranJudul: data.ukuranJudul }
          : {}),
        ...(data.ukuranEyebrow !== undefined
          ? { ukuranEyebrow: data.ukuranEyebrow }
          : {}),
        ...(konfigurasiBaru !== undefined
          ? { konfigurasi: konfigurasiBaru }
          : {}),
      },
    });

    await catatAudit(tx, {
      adminId: sesi.sub,
      aksi: "UPDATE",
      entitas: "SectionBeranda",
      entitasId: id,
      detailPerubahan: diffPerubahan(
        {
          aktif: existing.aktif,
          urutan: existing.urutan,
          judul: existing.judul,
          eyebrow: existing.eyebrow,
          deskripsi: existing.deskripsi,
          warnaJudul: existing.warnaJudul,
          warnaEyebrow: existing.warnaEyebrow,
          ukuranJudul: existing.ukuranJudul,
          ukuranEyebrow: existing.ukuranEyebrow,
          konfigurasi: existing.konfigurasi,
        },
        {
          aktif: hasil.aktif,
          urutan: hasil.urutan,
          judul: hasil.judul,
          eyebrow: hasil.eyebrow,
          deskripsi: hasil.deskripsi,
          warnaJudul: hasil.warnaJudul,
          warnaEyebrow: hasil.warnaEyebrow,
          ukuranJudul: hasil.ukuranJudul,
          ukuranEyebrow: hasil.ukuranEyebrow,
          konfigurasi: hasil.konfigurasi,
        }
      ),
    });

    return hasil;
  });

  return ok(updated);
}

export const PATCH = apiHandler(handler);
export const dynamic = "force-dynamic";
