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
 * Reject akun alumni (BE-Planning §4.5).
 *
 * Hanya berlaku untuk `PENDING` — keputusan atas pendaftaran baru. Akun yang
 * sudah aktif tidak dihapus, tetapi ditangguhkan lewat endpoint suspend.
 * Sesuai aturan, reject **tidak** menghapus account.
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

  if (akun.status !== StatusAlumniAccount.PENDING) {
    return conflict("Hanya akun berstatus PENDING yang dapat ditolak");
  }

  const hasil = await prisma.$transaction(async (tx) => {
    const diperbarui = await tx.alumniAccount.update({
      where: { id },
      data: {
        status: StatusAlumniAccount.REJECTED,
        rejectedAt: new Date(),
      },
      select: alumniAccountAdminSelect,
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "ALUMNI_REJECT",
      entitas: "AlumniAccount",
      entitasId: id,
      detailPerubahan: diffPerubahan(
        { status: akun.status },
        { status: diperbarui.status }
      ),
    });

    return diperbarui;
  });

  // Ping realtime status akun: pemilik akun langsung tahu pendaftarannya ditolak.
  publikasiNotifikasi({ aksi: "ALUMNI_REJECT", entitasId: id });

  return ok(hasil);
}

export const POST = apiHandler(handler);
export const dynamic = "force-dynamic";
