import { NextRequest } from "next/server";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { badRequest, notFound, ok } from "@/lib/response";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { hapusDariR2, infoObjekR2 } from "@/lib/r2";

const MAKS_VIDEO = 30 * 1024 * 1024;
const MIME_DARI_EKSTENSI: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
};

async function handler(req: NextRequest): Promise<Response> {
  await requirePermission(MODUL.BERANDA, AKSI.UBAH);
  if (req.method !== "POST") return badRequest("Method tidak didukung");

  const body = (await readJsonBody(req)) as { filename?: unknown };
  const filename = typeof body.filename === "string" ? body.filename : "";
  const match = /^([0-9a-f-]{36})\.(mp4|webm)$/i.exec(filename);
  if (!match) return badRequest("Nama berkas video tidak valid.");

  const contentType = MIME_DARI_EKSTENSI[match[2].toLowerCase()];
  const info = await infoObjekR2(`hero-video/${filename}`);
  if (!info) return notFound("Video belum ditemukan di penyimpanan.");
  if (info.ukuran < 1 || info.ukuran > MAKS_VIDEO) {
    await hapusDariR2(`hero-video/${filename}`);
    return badRequest("Ukuran video harus antara 1 byte dan 30 MB.");
  }
  if (info.contentType !== contentType) {
    await hapusDariR2(`hero-video/${filename}`);
    return badRequest("Tipe berkas video tidak cocok dengan formatnya.");
  }

  return ok({
    url: `/api/uploads/hero-video/${filename}`,
    filename,
    contentType,
    size: info.ukuran,
  });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
