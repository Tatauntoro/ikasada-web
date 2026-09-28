import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type TipeUploadLokal = "kegiatan" | "alumni" | "kerjasama" | "arsip";

/**
 * Sengaja DI LUAR `public/`: di build standalone (Docker), Next.js
 * men-snapshot daftar file `public/` saat build, jadi file yang ditulis saat
 * runtime (hasil upload) tidak akan pernah ke-serve lewat static file
 * serving-nya (404 terus walau filenya ada di disk). Berkasnya dilayani lewat
 * `GET /api/uploads/[tipe]/[filename]` (route dinamis, bukan file statis) —
 * lihat route itu untuk sisi baca-nya.
 */
const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads-gambar");

const EXT_VALID = new Set(["jpg", "jpeg", "png", "webp"]);

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
    url: `/api/uploads/${tipe}/${filename}`,
    publicId: `${tipe}/${filename}`,
  };
}

/**
 * Dipakai `GET /api/uploads/[tipe]/[filename]`. `filename` datang dari URL
 * (input tidak terpercaya), jadi divalidasi ketat (UUID + ekstensi dikenal)
 * supaya tidak bisa dipakai untuk path traversal.
 */
export async function bacaGambarLokal(
  tipe: TipeUploadLokal,
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cocok = /^[0-9a-f-]{36}\.([a-z]+)$/i.exec(filename);
  if (!cocok) return null;

  const ext = cocok[1].toLowerCase();
  if (!EXT_VALID.has(ext)) return null;

  const filePath = path.join(UPLOAD_DIR, tipe, filename);

  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, mimeType: mimeFromExtension(ext) };
  } catch {
    return null;
  }
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

function mimeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}
