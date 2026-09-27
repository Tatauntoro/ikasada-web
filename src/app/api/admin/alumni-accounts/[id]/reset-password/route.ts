import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { notFound, ok, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { alumniResetPasswordSchema } from "@/lib/validations/alumni-account";
import { ambilAkunAlumni } from "@/lib/alumni-account-admin";

/**
 * Reset password manual oleh admin (fase 1, tanpa self-service).
 *
 * Kata sandi baru ditentukan pengurus dan **tidak** dikembalikan di response.
 * Hash lama juga tidak pernah ikut ke audit — yang dicatat hanya bahwa field
 * `passwordHash` berubah.
 *
 * Catatan: `AksiAudit` belum punya nilai khusus untuk reset password
 * (BE-Planning §2.5 menetapkan sepuluh aksi minimum, reset tidak termasuk),
 * jadi aksi ini dicatat sebagai `UPDATE` dengan entitas `AlumniAccount`.
 * Menambah nilai enum baru berarti migration; itu keputusan terpisah.
 *
 * Karena JWT tidak punya revocation list, reset password tidak memutus session
 * yang sedang berjalan — token lama tetap sah sampai kedaluwarsa (8 jam).
 */
const BCRYPT_ROUNDS = 10;

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requirePermission(MODUL.VERIFIKASI_AKUN, AKSI.UBAH);
  const { id } = await params;

  const akun = await ambilAkunAlumni(id);
  if (!akun) {
    return notFound("Akun alumni tidak ditemukan");
  }

  const body = await readJsonBody(req);
  const parsed = alumniResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const passwordHash = await hash(parsed.data.password, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.alumniAccount.update({
      where: { id },
      data: { passwordHash },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "UPDATE",
      entitas: "AlumniAccount",
      entitasId: id,
      detailPerubahan: diffPerubahan(
        { passwordHash: "[lama]" },
        { passwordHash: "[baru]" }
      ),
    });
  });

  return ok({
    message:
      "Kata sandi akun berhasil direset. Sampaikan kata sandi baru kepada alumni lewat kanal resmi.",
  });
}

export const POST = apiHandler(handler);
export const dynamic = "force-dynamic";
