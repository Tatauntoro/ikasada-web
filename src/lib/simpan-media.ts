import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { bacaDariR2, isR2Configured, unggahKeR2 } from "@/lib/r2";
import {
  batasUkuranMedia,
  formatMediaDariMime,
  jenisMediaDariMime,
  type JenisMedia,
} from "@/lib/batas-media";

/**
 * Penyimpanan foto/video galeri arsip.
 *
 * Media mengikuti aturan akses arsipnya, jadi berkasnya **privat**:
 * - R2: bucket privat sepenuhnya, satu-satunya jalan keluar adalah server ini
 *   yang fetch objeknya lewat kredensial API (tidak pernah ada URL publik).
 * - Lokal: ditulis ke `storage/arsip-media/` (di luar `public/`), dipakai
 *   kalau R2 belum dikonfigurasi (mis. dev lokal).
 *
 * Yang keluar dari sini hanya **identitas** berkas; isinya dilayani
 * `GET /api/arsip/[slug]/media/[id]` yang memeriksa hak akses lebih dulu
 * (lihat `akses-arsip.ts`). URL publik TIDAK pernah disimpan, karena itu jalan
 * pintas yang membuat arsip "khusus alumni" bocor.
 */

export type MediaTersimpan = {
  berkasId: string;
  penyimpanan: "R2" | "LOKAL";
  namaAsli: string;
  format: string;
  ukuran: number;
  jenis: JenisMedia;
};

const AKAR_STORAGE = path.join(process.cwd(), "storage");
const MEDIA_DIR = path.join(AKAR_STORAGE, "arsip-media");

/** MIME untuk header respons, dibalik dari daftar di `batas-media.ts`. */
const MIME_MEDIA: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export function mimeMediaDariFormat(format: string | null | undefined): string {
  if (!format) return "application/octet-stream";
  return MIME_MEDIA[format.toLowerCase()] ?? "application/octet-stream";
}

export async function simpanMediaArsip(
  buffer: Buffer,
  namaAsli: string,
  mimeType: string
): Promise<MediaTersimpan> {
  const jenis = jenisMediaDariMime(mimeType);
  const format = formatMediaDariMime(mimeType);

  if (!jenis || !format) {
    throw new Error(
      "Format media tidak didukung. Foto: JPG/PNG/WEBP. Video: MP4/WEBM/MOV."
    );
  }

  const batas = batasUkuranMedia(jenis);
  if (buffer.byteLength > batas) {
    throw new Error(
      `Ukuran ${jenis === "FOTO" ? "foto" : "video"} maksimal ${Math.round(
        batas / (1024 * 1024)
      )} MB.`
    );
  }

  const nama = `${crypto.randomUUID()}.${format}`;
  const berkasId = `arsip-media/${nama}`;

  if (isR2Configured()) {
    await unggahKeR2(berkasId, buffer, mimeMediaDariFormat(format));

    return {
      berkasId,
      penyimpanan: "R2",
      namaAsli,
      format,
      ukuran: buffer.byteLength,
      jenis,
    };
  }

  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.writeFile(path.join(MEDIA_DIR, nama), buffer);

  return {
    berkasId,
    penyimpanan: "LOKAL",
    namaAsli,
    format,
    ukuran: buffer.byteLength,
    jenis,
  };
}

/**
 * Ambil isi satu media. `null` berarti berkasnya sudah tidak ada di
 * penyimpanan (jawab 404, bukan 500) — sama seperti berkas dokumen.
 */
export async function bacaMediaArsip(berkas: {
  berkasId: string;
  penyimpanan: "R2" | "LOKAL";
  jenis: JenisMedia;
}): Promise<Buffer | null> {
  if (berkas.penyimpanan === "R2") {
    return bacaDariR2(berkas.berkasId);
  }

  const lengkap = path.resolve(AKAR_STORAGE, berkas.berkasId);
  if (lengkap !== AKAR_STORAGE && !lengkap.startsWith(AKAR_STORAGE + path.sep)) {
    throw new Error("Lokasi media tidak valid");
  }

  try {
    return await fs.readFile(lengkap);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
