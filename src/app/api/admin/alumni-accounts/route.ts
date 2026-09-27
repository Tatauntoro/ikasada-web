import { NextRequest } from "next/server";
import { Prisma, StatusAlumniAccount } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { okPaginated } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { parsePagination } from "@/lib/pagination";
import { alumniAccountAdminSelect } from "@/lib/alumni-account-admin";

/**
 * Daftar akun alumni untuk pengurus (BE-Planning §4.5).
 *
 * Read-only dan tanpa `passwordHash`. Urutan `createdAt` menurun supaya
 * pendaftar terbaru langsung terlihat di antrean verifikasi. Filter `status`
 * tidak valid diabaikan, mengikuti pola endpoint admin lain.
 */

async function handler(req: NextRequest): Promise<Response> {
  await requirePermission(MODUL.VERIFIKASI_AKUN, AKSI.LIHAT);

  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);
  const status = searchParams.get("status");

  const where: Prisma.AlumniAccountWhereInput = {};

  if (status && Object.values(StatusAlumniAccount).includes(status as StatusAlumniAccount)) {
    where.status = status as StatusAlumniAccount;
  }

  const [data, total] = await prisma.$transaction([
    prisma.alumniAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      select: alumniAccountAdminSelect,
    }),
    prisma.alumniAccount.count({ where }),
  ]);

  return okPaginated(data, {
    page: pagination.page,
    limit: pagination.limit,
    total,
  });
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
