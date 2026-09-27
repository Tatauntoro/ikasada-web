import { NextRequest } from "next/server";
import { StatusAlumniAccount } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, ok } from "@/lib/response";
import { apiHandler } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { publikasiNotifikasi } from "@/lib/notifikasi-events";
import {
  alumniAccountAdminSelect,
  ambilAkunAlumni,
} from "@/lib/alumni-account-admin";

/**
 * Suspend akun alumni (BE-Planning §4.5, §7).
 *
 * Hanya berlaku untuk `ACTIVE`. Link ke `Alumni` sengaja dipertahankan supaya
 * pengurus bisa memulihkannya lewat approve tanpa mencocokkan ulang. Efeknya
 * langsung: login ditolak, `/me` menolak, dan seluruh endpoint privat tertutup
 * karena `requireAlumniAktif()` menuntut status `ACTIVE` menurut database.
 */
type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requirePermission(MODUL.VERIFIKASI_AKUN, AKSI.UBAH);
  const { id } = await params;

  const akun = await ambilAkunAlumni(id);
  if (!akun) {
    return notFound("Akun alumni tidak ditemukan");
  }

  if (akun.status !== StatusAlumniAccount.ACTIVE) {
    return conflict("Hanya akun berstatus ACTIVE yang dapat ditangguhkan");
  }

  const hasil = await prisma.$transaction(async (tx) => {
    const diperbarui = await tx.alumniAccount.update({
      where: { id },
      data: {
        status: StatusAlumniAccount.SUSPENDED,
        suspendedAt: new Date(),
      },
      select: alumniAccountAdminSelect,
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "ALUMNI_SUSPEND",
      entitas: "AlumniAccount",
      entitasId: id,
      detailPerubahan: diffPerubahan(
        { status: akun.status },
        { status: diperbarui.status }
      ),
    });

    return diperbarui;
  });

  // Ping realtime status akun: pemilik akun langsung tahu akunnya ditangguhkan.
  publikasiNotifikasi({ aksi: "ALUMNI_SUSPEND", entitasId: id });

  return ok(hasil);
}

export const POST = apiHandler(handler);
export const dynamic = "force-dynamic";
