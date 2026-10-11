import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  ok,
  badRequest,
  conflict,
  notFound,
  validationError,
} from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth";
import { requireAdminAktif, requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { generateUniqueSlug, generateSlug } from "@/lib/slug";
import { normalizeKegiatanInput, normalizeMediaKegiatan } from "@/lib/normalize-input";
import { kegiatanUpdateSchema } from "@/lib/validations/kegiatan";
import {
  gateSimpan,
  kontenBerubah,
  mediaBerubah,
  RESET_VERIFIKASI,
} from "@/lib/verifikasi-konten";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function getKegiatanOr404(id: string) {
  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id, deletedAt: null },
    include: {
      kategoriKegiatan: true,
      media: { orderBy: { urutan: "asc" } },
    },
  });

  if (!kegiatan) {
    return null;
  }

  return kegiatan;
}

async function handleDetail(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { id } = await params;
  const kegiatan = await getKegiatanOr404(id);

  if (!kegiatan) {
    return notFound("Kegiatan tidak ditemukan");
  }

  return ok(kegiatan);
}

async function handleUpdate(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireAdminAktif();
  const { id } = await params;

  const existing = await getKegiatanOr404(id);
  if (!existing) {
    return notFound("Kegiatan tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = kegiatanUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeKegiatanInput(parsed.data);
  const media = normalizeMediaKegiatan(parsed.data.media);

  // Gate verifikasi: edit yang mengubah isi membatalkan verifikasi; publish
  // hanya boleh bila konten sudah DISETUJUI dan isinya tidak berubah.
  const gate = gateSimpan(session, {
    statusBaru: data.status,
    verifikasiLama: existing.verifikasi,
    kontenBerubah:
      kontenBerubah(existing, data) ||
      mediaBerubah(existing.media ?? [], media),
  });
  if (!gate.ok) return conflict(gate.pesan);

  const kategori = await prisma.kategoriKegiatan.findFirst({
    where: { id: data.kategoriKegiatanId, deletedAt: null },
  });
  if (!kategori) {
    return badRequest("Kategori kegiatan tidak ditemukan", {
      kategori: "Kategori tidak valid",
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    let slug = existing.slug;
    if (data.judul !== existing.judul) {
      const baseSlug = generateSlug(data.judul);
      if (baseSlug !== existing.slug) {
        slug = await generateUniqueSlug(data.judul, tx, {
          table: "kegiatan",
          existingId: id,
        });
      }
    }

    const updateData = {
      ...data,
      slug,
      ...(gate.reset ? RESET_VERIFIKASI : {}),
    };

    const result = await tx.kegiatan.update({
      where: { id },
      data: updateData,
    });

    /* Galeri ditulis ulang dari daftar form: hapus lalu buat lagi. */
    await tx.kegiatanMedia.deleteMany({ where: { kegiatanId: id } });
    if (media.length > 0) {
      await tx.kegiatanMedia.createMany({
        data: media.map((item) => ({ ...item, kegiatanId: id })),
      });
    }

    const perubahan = diffPerubahan(
      {
        judul: existing.judul,
        deskripsiSingkat: existing.deskripsiSingkat,
        deskripsiLengkap: existing.deskripsiLengkap,
        tanggalMulai: existing.tanggalMulai,
        tanggalSelesai: existing.tanggalSelesai,
        lokasi: existing.lokasi,
        kategoriKegiatanId: existing.kategoriKegiatanId,
        videoYoutubeUrl: existing.videoYoutubeUrl,
        videoYoutubeId: existing.videoYoutubeId,
        linkPendaftaran: existing.linkPendaftaran,
        gambarThumbnailUrl: existing.gambarThumbnailUrl,
        status: existing.status,
        slug: existing.slug,
      },
      {
        judul: result.judul,
        deskripsiSingkat: result.deskripsiSingkat,
        deskripsiLengkap: result.deskripsiLengkap,
        tanggalMulai: result.tanggalMulai,
        tanggalSelesai: result.tanggalSelesai,
        lokasi: result.lokasi,
        kategoriKegiatanId: result.kategoriKegiatanId,
        videoYoutubeUrl: result.videoYoutubeUrl,
        videoYoutubeId: result.videoYoutubeId,
        linkPendaftaran: result.linkPendaftaran,
        gambarThumbnailUrl: result.gambarThumbnailUrl,
        status: result.status,
        slug: result.slug,
      }
    );

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "UPDATE",
      entitas: "Kegiatan",
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

  const existing = await getKegiatanOr404(id);
  if (!existing) {
    return notFound("Kegiatan tidak ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.kegiatan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "DELETE",
      entitas: "Kegiatan",
      entitasId: id,
    });
  });

  return ok({ message: "Kegiatan berhasil dihapus" });
}

async function handler(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  await requirePermissionModul(MODUL.KEGIATAN, req.method);

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
