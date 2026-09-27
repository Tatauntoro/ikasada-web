import { NextRequest } from "next/server";
import { badRequest, ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";
import {
  batasUkuranMedia,
  formatMediaDariMime,
  jenisMediaDariMime,
} from "@/lib/batas-media";
import { simpanMediaArsip } from "@/lib/simpan-media";

/**
 * Upload satu foto atau video untuk galeri arsip (maks 4 MB per berkas).
 *
 * Terpisah dari `/api/admin/upload` (gambar 2 MB) dan `/api/admin/upload/berkas`
 * (dokumen) karena aturannya beda: menerima video. Hasilnya **identitas berkas,
 * bukan URL** — media mengikuti aturan akses arsipnya, jadi berkasnya hanya
 * bisa keluar lewat `GET /api/arsip/[slug]/media/[id]`.
 */
async function handler(req: NextRequest): Promise<Response> {
  await requireAdminAktif();

  const formData = await req.formData();

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return badRequest("Berkas media wajib diunggah");
  }

  if (!formatMediaDariMime(file.type)) {
    return badRequest(
      "Format media tidak didukung. Foto: JPG/PNG/WEBP. Video: MP4/WEBM/MOV."
    );
  }

  if (file.size === 0) {
    return badRequest("Berkas kosong tidak bisa diunggah.");
  }

  const jenis = jenisMediaDariMime(file.type)!;
  const batas = batasUkuranMedia(jenis);

  if (file.size > batas) {
    return badRequest(
      `Ukuran ${jenis === "FOTO" ? "foto" : "video"} maksimal ${Math.round(
        batas / (1024 * 1024)
      )} MB.`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hasil = await simpanMediaArsip(buffer, file.name, file.type);

  return ok(hasil);
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
