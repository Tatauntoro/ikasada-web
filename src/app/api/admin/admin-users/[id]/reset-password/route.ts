import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { notFound, ok, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireSuperadmin } from "@/lib/sesi-admin";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { adminResetPasswordSchema } from "@/lib/validations/admin";

/**
 * Reset kata sandi akun admin (khusus superadmin).
 *
 * Kata sandi baru ditentukan superadmin dan tidak dikembalikan di response.
 * Hash lama juga tidak pernah ikut ke audit.
 */

const BCRYPT_ROUNDS = 10;

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const session = await requireSuperadmin();
  const { id } = await params;

  const body = await readJsonBody(req);
  const parsed = adminResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const target = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) {
    return notFound("Admin tidak ditemukan");
  }

  const passwordHash = await hash(parsed.data.password, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id },
      data: { passwordHash },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "UPDATE",
      entitas: "AdminUser",
      entitasId: id,
      detailPerubahan: diffPerubahan(
        { passwordHash: "[lama]" },
        { passwordHash: "[baru]" }
      ),
    });
  });

  return ok({
    message:
      "Kata sandi admin berhasil direset. Sampaikan kata sandi baru lewat kanal aman.",
  });
}

export const POST = apiHandler(handler);
export const dynamic = "force-dynamic";
