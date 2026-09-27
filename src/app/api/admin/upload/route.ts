import { NextRequest } from "next/server";
import { badRequest, ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";
import { uploadGambar, TipeUpload } from "@/lib/cloudinary";
import { uploadGambarLokal } from "@/lib/upload-lokal";

const TIPE_VALID: TipeUpload[] = ["kegiatan", "alumni", "kerjasama", "arsip"];
const MIME_VALID = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function isValidMimeType(mimeType: string): boolean {
  return MIME_VALID.includes(mimeType.toLowerCase());
}

function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

async function handler(req: NextRequest): Promise<Response> {
  await requireAdminAktif();

  const formData = await req.formData();

  const tipe = formData.get("tipe");
  if (typeof tipe !== "string" || !TIPE_VALID.includes(tipe as TipeUpload)) {
    return badRequest("Tipe upload wajib diisi dengan 'kegiatan' atau 'alumni'");
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

  const hasil = isCloudinaryConfigured()
    ? await uploadGambar(buffer, tipe as TipeUpload, file.type)
    : await uploadGambarLokal(buffer, tipe as TipeUpload, file.type);

  return ok(hasil);
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
