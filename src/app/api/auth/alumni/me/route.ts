import { NextRequest } from "next/server";
import { StatusAlumniAccount } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import {
  clearAlumniSessionCookie,
  requireAlumniSession,
} from "@/lib/auth-alumni";
import {
  alumniAccountSelect,
  toAlumniAccountResponse,
} from "@/lib/mapper-alumni-account";

/**
 * Status akun untuk pemilik session (BE-Planning §4.1).
 *
 * - Tanpa session: `401`.
 * - `PENDING`: data pendaftaran saja, tanpa status keterbukaan.
 * - `ACTIVE`: data akun, ikhtisar alumni tertaut, dan preferensi keterbukaan.
 *
 * Status dibaca ulang dari database, bukan dari klaim token: suspend atau
 * reject yang terjadi setelah login harus langsung berlaku.
 */
async function handler(req: NextRequest): Promise<Response> {
  void req;
  const sesi = await requireAlumniSession();

  const akun = await prisma.alumniAccount.findUnique({
    where: { id: sesi.sub },
    select: alumniAccountSelect,
  });

  if (!akun) {
    return unauthorized("Sesi tidak valid. Silakan login kembali.");
  }

  if (
    akun.status === StatusAlumniAccount.REJECTED ||
    akun.status === StatusAlumniAccount.SUSPENDED
  ) {
    await clearAlumniSessionCookie();
    return unauthorized(
      akun.status === StatusAlumniAccount.REJECTED
        ? "Pendaftaran akun ini tidak disetujui pengurus."
        : "Akun ini sedang ditangguhkan. Hubungi pengurus."
    );
  }

  return ok(toAlumniAccountResponse(akun));
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
