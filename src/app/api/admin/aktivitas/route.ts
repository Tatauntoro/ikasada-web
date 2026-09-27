import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { AksiAudit } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { okPaginated } from "@/lib/response";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { parsePagination } from "@/lib/pagination";
import { ambilAktivitas } from "@/lib/aktivitas-server";

/**
 * Log aktivitas (read-only) untuk pengurus.
 *
 * Sumbernya `AuditLog` (aksi admin maupun alumni). Filter: aktor
 * (admin/alumni), admin tertentu, modul (entitas), aksi, dan rentang tanggal.
 * Guard: butuh izin `aktivitas:lihat` — superadmin selalu boleh.
 */
async function handler(req: NextRequest): Promise<Response> {
  await requirePermission(MODUL.AKTIVITAS, AKSI.LIHAT);

  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);

  const aktor = searchParams.get("aktor");
  const adminId = searchParams.get("adminId");
  const modul = searchParams.get("modul");
  const aksi = searchParams.get("aksi");
  const dari = searchParams.get("dari");
  const sampai = searchParams.get("sampai");

  const where: Prisma.AuditLogWhereInput = {};

  if (aktor === "admin") where.adminId = { not: null };
  else if (aktor === "alumni") where.alumniAccountId = { not: null };

  if (adminId) where.adminId = adminId;
  if (modul) where.entitas = modul;
  if (aksi && Object.values(AksiAudit).includes(aksi as AksiAudit)) {
    where.aksi = aksi as AksiAudit;
  }

  const rentang: Prisma.DateTimeFilter = {};
  if (dari) {
    const d = new Date(dari);
    if (!Number.isNaN(d.getTime())) rentang.gte = d;
  }
  if (sampai) {
    const s = new Date(sampai);
    if (!Number.isNaN(s.getTime())) {
      s.setHours(23, 59, 59, 999);
      rentang.lte = s;
    }
  }
  if (Object.keys(rentang).length > 0) {
    where.createdAt = rentang;
  }

  const { items, total } = await ambilAktivitas({
    where,
    skip: pagination.skip,
    take: pagination.take,
  });

  // Daftar pengurus untuk dropdown filter. Hanya nama & id (tidak sensitif),
  // dikirim di `meta` supaya admin ber-izin Aktivitas tak perlu akses Kelola Admin.
  const pengurus = await prisma.adminUser.findMany({
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });

  return okPaginated(
    items,
    {
      page: pagination.page,
      limit: pagination.limit,
      total,
    },
    { pengurus }
  );
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
