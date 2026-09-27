import { NextRequest } from "next/server";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { clearSessionCookie } from "@/lib/auth";

async function handler(req: NextRequest): Promise<Response> {
  void req;
  await clearSessionCookie();
  return ok({ message: "Logout berhasil" });
}

export const POST = apiHandlerWithoutParams(handler);
