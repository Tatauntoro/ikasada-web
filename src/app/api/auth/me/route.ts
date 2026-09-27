import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, unauthorized } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";

async function handler(req: NextRequest): Promise<Response> {
  void req;
  const session = await requireAdminAktif();

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.sub },
  });

  if (!admin) {
    return unauthorized("Sesi tidak valid");
  }

  const { passwordHash, ...adminWithoutPassword } = admin;
  void passwordHash;
  return ok(adminWithoutPassword);
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
