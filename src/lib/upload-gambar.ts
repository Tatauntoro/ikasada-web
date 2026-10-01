import crypto from "node:crypto";
import { bacaDariR2, isR2Configured, unggahKeR2 } from "@/lib/r2";

export type TipeUploadGambar = "kegiatan" | "alumni" | "kerjasama" | "arsip";

/**
 * Gambar sampul (kegiatan/alumni/kerjasama/arsip), selalu disimpan di R2
 * (bucket privat) dan dibaca lewat `GET /api/uploads/[tipe]/[filename]`
 * (server yang fetch ke R2, browser tidak pernah tahu endpoint R2-nya).
 *
 * Tidak ada fallback ke disk lokal: kalau R2 belum dikonfigurasi, upload
 * gagal dengan error jelas.
 */

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
  if (!isR2Configured()) {
    throw new Error("Penyimpanan R2 belum dikonfigurasi (R2_* kosong)");
  }

  const ext = extensionFromMimeType(mimeType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const publicId = `${tipe}/${filename}`;

  await unggahKeR2(`uploads-gambar/${publicId}`, buffer, mimeType);

  return { url: `/api/uploads/${tipe}/${filename}`, publicId };
}

/**
 * Dipakai `GET /api/uploads/[tipe]/[filename]`. `filename` datang dari URL
 * (input tidak terpercaya), jadi divalidasi ketat (UUID + ekstensi dikenal)
 * supaya tidak bisa dipakai untuk akses key R2 sembarangan.
 */
export async function bacaGambar(
  tipe: TipeUploadGambar,
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cocok = /^[0-9a-f-]{36}\.([a-z]+)$/i.exec(filename);
  if (!cocok) return null;

  const ext = cocok[1].toLowerCase();
  if (!EXT_VALID.has(ext)) return null;

  if (!isR2Configured()) return null;

  const buffer = await bacaDariR2(`uploads-gambar/${tipe}/${filename}`);
  return buffer ? { buffer, mimeType: MIME_DARI_EXT[ext] } : null;
}
