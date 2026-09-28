import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { bacaDariR2, isR2Configured, unggahKeR2 } from "@/lib/r2";

export type TipeUploadGambar = "kegiatan" | "alumni" | "kerjasama" | "arsip";

/**
 * Gambar sampul (kegiatan/alumni/kerjasama/arsip).
 *
 * - R2: bucket privat, dibaca lewat `GET /api/uploads/[tipe]/[filename]`
 *   (server yang fetch ke R2, browser tidak pernah tahu endpoint R2-nya).
 * - Lokal: fallback kalau R2 belum dikonfigurasi (dev). SENGAJA di luar
 *   `public/`: di build standalone (Docker), Next.js men-snapshot daftar
 *   file `public/` saat build, jadi file yang ditulis saat runtime (hasil
 *   upload) tidak akan pernah ke-serve lewat static file serving bawaannya.
 */
const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads-gambar");

const EXT_VALID = new Set(["jpg", "jpeg", "png", "webp"]);

const MIME_DARI_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function extensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mimeType.toLowerCase()] || "jpg";
}

export async function uploadGambar(
  buffer: Buffer,
  tipe: TipeUploadGambar,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  const ext = extensionFromMimeType(mimeType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const publicId = `${tipe}/${filename}`;

  if (isR2Configured()) {
    await unggahKeR2(`uploads-gambar/${publicId}`, buffer, mimeType);
  } else {
    const folder = path.join(UPLOAD_DIR, tipe);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, filename), buffer);
  }

  return {
    url: `/api/uploads/${tipe}/${filename}`,
    publicId,
  };
}

/**
 * Dipakai `GET /api/uploads/[tipe]/[filename]`. `filename` datang dari URL
 * (input tidak terpercaya), jadi divalidasi ketat (UUID + ekstensi dikenal)
 * supaya tidak bisa dipakai untuk path traversal / akses key R2 sembarangan.
 */
export async function bacaGambar(
  tipe: TipeUploadGambar,
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cocok = /^[0-9a-f-]{36}\.([a-z]+)$/i.exec(filename);
  if (!cocok) return null;

  const ext = cocok[1].toLowerCase();
  if (!EXT_VALID.has(ext)) return null;

  const mimeType = MIME_DARI_EXT[ext] ?? "application/octet-stream";

  if (isR2Configured()) {
    const buffer = await bacaDariR2(`uploads-gambar/${tipe}/${filename}`);
    return buffer ? { buffer, mimeType } : null;
  }

  try {
    const buffer = await fs.readFile(path.join(UPLOAD_DIR, tipe, filename));
    return { buffer, mimeType };
  } catch {
    return null;
  }
}
