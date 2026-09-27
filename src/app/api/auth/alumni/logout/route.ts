import { NextRequest } from "next/server";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { clearAlumniSessionCookie } from "@/lib/auth-alumni";

/**
 * Logout alumni (BE-Planning §3.1).
 *
 * Idempoten seperti logout admin: cookie dikosongkan terlepas dari session
 * masih valid atau tidak, jadi user tidak bisa terjebak dengan cookie rusak.
 */
async function handler(req: NextRequest): Promise<Response> {
  void req;
  await clearAlumniSessionCookie();
  return ok({ message: "Logout berhasil" });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
