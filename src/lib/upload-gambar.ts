import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { bacaDariR2, isR2Configured, unggahKeR2 } from "@/lib/r2";

export type TipeUploadGambar = "kegiatan" | "alumni" | "kerjasama" | "arsip";

/** Di mana sebuah gambar disimpan. Ikut ditulis di URL sebagai `?b=`. */
export type BackendGambar = "r2" | "lokal";

/**
 * Gambar sampul (kegiatan/alumni/kerjasama/arsip).
 *
 * - R2: bucket privat, dibaca lewat `GET /api/uploads/[tipe]/[filename]`
 *   (server yang fetch ke R2, browser tidak pernah tahu endpoint R2-nya).
 * - Lokal: fallback kalau R2 belum dikonfigurasi (dev). SENGAJA di luar
 *   `public/`: di build standalone (Docker), Next.js men-snapshot daftar
 *   file `public/` saat build, jadi file yang ditulis saat runtime (hasil
 *   upload) tidak akan pernah ke-serve lewat static file serving bawaannya.
 *
 * URL yang dikembalikan membawa penanda backend (`?b=r2` / `?b=lokal`) supaya
 * route pembaca tidak perlu menebak dari env server. URL tanpa penanda
 * (data lama) tetap dilayani lewat jalur legacy di `bacaGambar`.
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

/** Backend yang dipakai untuk penulisan gambar baru di server ini. */
export function backendAktif(): BackendGambar {
  return isR2Configured() ? "r2" : "lokal";
}

async function bacaDariLokal(
  tipe: TipeUploadGambar,
  filename: string
): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, tipe, filename));
  } catch {
    return null;
  }
}

export async function uploadGambar(
  buffer: Buffer,
  tipe: TipeUploadGambar,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  const ext = extensionFromMimeType(mimeType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const publicId = `${tipe}/${filename}`;
  const backend = backendAktif();

  if (backend === "r2") {
    await unggahKeR2(`uploads-gambar/${publicId}`, buffer, mimeType);
  } else {
    const folder = path.join(UPLOAD_DIR, tipe);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, filename), buffer);
  }

  return {
    url: `/api/uploads/${tipe}/${filename}?b=${backend}`,
    publicId,
  };
}

/**
 * Dipakai `GET /api/uploads/[tipe]/[filename]`. `filename` datang dari URL
 * (input tidak terpercaya), jadi divalidasi ketat (UUID + ekstensi dikenal)
 * supaya tidak bisa dipakai untuk path traversal / akses key R2 sembarangan.
 *
 * `backend` diambil dari penanda `?b=` pada URL. Backend yang ditandai dicoba
 * lebih dulu, lalu backend lain sebagai fallback transisi (berkas lama yang
 * diupload sebelum penanda ada). Nama berkas UUID, jadi tidak mungkin ada dua
 * berkas berbeda dengan nama sama di dua backend.
 */
export async function bacaGambar(
  tipe: TipeUploadGambar,
  filename: string,
  backend?: BackendGambar | null
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cocok = /^[0-9a-f-]{36}\.([a-z]+)$/i.exec(filename);
  if (!cocok) return null;

  const ext = cocok[1].toLowerCase();
  if (!EXT_VALID.has(ext)) return null;

  const mimeType = MIME_DARI_EXT[ext] ?? "application/octet-stream";

  const utama = backend ?? backendAktif();
  const urutan: BackendGambar[] = [utama, utama === "r2" ? "lokal" : "r2"];

  for (const asal of urutan) {
    // R2 hanya bisa dicoba bila kredensialnya ada di server ini.
    if (asal === "r2" && !isR2Configured()) continue;

    const buffer =
      asal === "r2"
        ? await bacaDariR2(`uploads-gambar/${tipe}/${filename}`)
        : await bacaDariLokal(tipe, filename);

    if (buffer) return { buffer, mimeType };
  }

  return null;
}
