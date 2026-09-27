import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type TipeUploadLokal = "kegiatan" | "alumni" | "kerjasama" | "arsip";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function uploadGambarLokal(
  buffer: Buffer,
  tipe: TipeUploadLokal,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  const ext = extensionFromMimeType(mimeType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const folder = path.join(UPLOAD_DIR, tipe);
  const filePath = path.join(folder, filename);

  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(filePath, buffer);

  return {
    url: `/uploads/${tipe}/${filename}`,
    publicId: `${tipe}/${filename}`,
  };
}

function extensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mimeType.toLowerCase()] || "jpg";
}
