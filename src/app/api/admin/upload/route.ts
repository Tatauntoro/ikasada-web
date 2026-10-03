import { NextRequest } from "next/server";
import { badRequest, ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";
import { uploadGambar, TipeUploadGambar } from "@/lib/upload-gambar";

const TIPE_VALID: TipeUploadGambar[] = ["kegiatan", "alumni", "kerjasama", "arsip", "berita"];
const MIME_VALID = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function isValidMimeType(mimeType: string): boolean {
  return MIME_VALID.includes(mimeType.toLowerCase());
}

async function handler(req: NextRequest): Promise<Response> {
  await requireAdminAktif();

  const formData = await req.formData();

  const tipe = formData.get("tipe");
  if (typeof tipe !== "string" || !TIPE_VALID.includes(tipe as TipeUploadGambar)) {
    return badRequest("Tipe upload wajib diisi dengan salah satu tipe yang dikenal");
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return badRequest("File gambar wajib diunggah");
  }

  if (!isValidMimeType(file.type)) {
    return badRequest(
      "Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP."
    );
  }

  if (file.size > MAX_SIZE) {
    return badRequest("Ukuran file maksimal 2 MB.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const hasil = await uploadGambar(buffer, tipe as TipeUploadGambar, file.type);

  return ok(hasil);
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
