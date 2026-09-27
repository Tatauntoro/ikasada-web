import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";

/**
 * Ringkasan angka untuk Dashboard admin.
 *
 * - `totalAlumniTerdaftar` — record `Alumni` yang belum dihapus (direktori).
 * - `totalKegiatan`, `totalArsip`, `totalKerjasama` — entri yang belum dihapus.
 * - `totalAlumniTerhubung` — jumlah **koneksi `ACCEPTED`** (pasangan alumni yang
 *   sudah terhubung). Angkanya sengaja sama dengan tab "Diterima" di halaman
 *   Jejaring Alumni supaya mudah dibandingkan.
 */
async function handler(req: NextRequest): Promise<Response> {
  void req;
  const session = await requireAdminAktif();

  const [
    totalAlumniTerdaftar,
    totalKegiatan,
    totalArsip,
    totalKerjasama,
    totalAlumniTerhubung,
  ] = await prisma.$transaction([
    prisma.alumni.count({ where: { deletedAt: null } }),
    prisma.kegiatan.count({ where: { deletedAt: null } }),
    prisma.arsip.count({ where: { deletedAt: null } }),
    prisma.kerjasama.count({ where: { deletedAt: null } }),
    prisma.connection.count({ where: { status: "ACCEPTED" } }),
  ]);

  const ringkasan = {
    totalAlumniTerdaftar,
    totalKegiatan,
    totalArsip,
    totalKerjasama,
    totalAlumniTerhubung,
  };

  return ok({
    ringkasan,
    admin: { nama: session.nama, email: session.email },
  });
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
