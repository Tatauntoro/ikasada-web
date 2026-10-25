import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { badRequest, ok } from "@/lib/response";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { isR2Configured, urlUnggahBertandaTanganR2 } from "@/lib/r2";

const MIME_VIDEO: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};
const MAKS_VIDEO = 30 * 1024 * 1024;

async function handler(req: NextRequest): Promise<Response> {
  await requirePermission(MODUL.BERANDA, AKSI.UBAH);
  if (req.method !== "POST") return badRequest("Method tidak didukung");
  if (!isR2Configured()) return badRequest("Penyimpanan R2 belum dikonfigurasi");

  const body = (await readJsonBody(req)) as {
    contentType?: unknown;
    size?: unknown;
  };
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const size = typeof body.size === "number" ? body.size : 0;
  const ext = MIME_VIDEO[contentType];

  if (!ext) return badRequest("Format video harus MP4 atau WebM.");
  if (!Number.isInteger(size) || size < 1 || size > MAKS_VIDEO) {
    return badRequest("Ukuran video harus antara 1 byte dan 30 MB.");
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const key = `hero-video/${filename}`;
  const uploadUrl = await urlUnggahBertandaTanganR2(key, contentType);

  return ok({ key, filename, uploadUrl, contentType, size });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
