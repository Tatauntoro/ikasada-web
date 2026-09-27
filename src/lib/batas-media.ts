/**
 * Batas dan tipe media galeri arsip.
 *
 * File ini **tanpa dependensi server** (tidak ada `fs`/`cloudinary`) supaya
 * aman diimpor komponen klien dan skema validasi. Implementasi penyimpanannya
 * ada di `simpan-media.ts`.
 *
 * Angka batasnya ditentukan request body yang masuk ke API kita (~4,5 MB di
 * Vercel), jadi foto dan video sama-sama 4 MB untuk sekarang. Saat penyimpanan
 * pindah ke Cloudflare R2, batas ini bisa dinaikkan lewat jalur upload
 * bertanda tangan langsung dari browser — cukup ubah angka di bawah.
 */

export type JenisMedia = "FOTO" | "VIDEO";

export const MAX_UKURAN_FOTO = 4 * 1024 * 1024; // 4 MB
export const MAX_UKURAN_VIDEO = 4 * 1024 * 1024; // 4 MB
export const MAX_MEDIA_PER_ARSIP = 30;

/** MIME yang diterima, dipetakan ke ekstensi. */
export const FOTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const VIDEO: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function jenisMediaDariMime(mimeType: string): JenisMedia | null {
  const mime = mimeType.toLowerCase();
  if (FOTO[mime]) return "FOTO";
  if (VIDEO[mime]) return "VIDEO";
  return null;
}

export function formatMediaDariMime(mimeType: string): string | null {
  const mime = mimeType.toLowerCase();
  return FOTO[mime] ?? VIDEO[mime] ?? null;
}

export function batasUkuranMedia(jenis: JenisMedia): number {
  return jenis === "FOTO" ? MAX_UKURAN_FOTO : MAX_UKURAN_VIDEO;
}
