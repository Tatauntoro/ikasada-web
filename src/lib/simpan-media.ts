import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
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
 * - Lokal: ditulis ke `storage/arsip-media/` (di luar `public/`), tidak bisa
 *   dibuka lewat URL statis.
 * - Cloudinary: diunggah sebagai `type: "authenticated"` sehingga hanya bisa
 *   diambil dengan URL bertanda tangan.
 *
 * Yang keluar dari sini hanya **identitas** berkas; isinya dilayani
 * `GET /api/arsip/[slug]/media/[id]` yang memeriksa hak akses lebih dulu
 * (lihat `akses-arsip.ts`). URL publik TIDAK pernah disimpan, karena itu jalan
 * pintas yang membuat arsip "khusus alumni" bocor.
 */

export type MediaTersimpan = {
  berkasId: string;
  penyimpanan: "CLOUDINARY" | "LOKAL";
  namaAsli: string;
  format: string;
  ukuran: number;
  jenis: JenisMedia;
};

const FOLDER_CLOUDINARY = "ikasada/arsip-media";
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

function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
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

  if (!isCloudinaryConfigured()) {
    const nama = `${crypto.randomUUID()}.${format}`;
    await fs.mkdir(MEDIA_DIR, { recursive: true });
    await fs.writeFile(path.join(MEDIA_DIR, nama), buffer);

    return {
      berkasId: `arsip-media/${nama}`,
      penyimpanan: "LOKAL",
      namaAsli,
      format,
      ukuran: buffer.byteLength,
      jenis,
    };
  }

  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const hasil = await cloudinary.uploader.upload(dataUri, {
    folder: FOLDER_CLOUDINARY,
    resource_type: jenis === "FOTO" ? "image" : "video",
    // Privat: hanya bisa diambil lewat URL bertanda tangan.
    type: "authenticated",
  });

  return {
    berkasId: hasil.public_id,
    penyimpanan: "CLOUDINARY",
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
  penyimpanan: "CLOUDINARY" | "LOKAL";
  jenis: JenisMedia;
}): Promise<Buffer | null> {
  if (berkas.penyimpanan === "CLOUDINARY") {
    const url = cloudinary.url(berkas.berkasId, {
      resource_type: berkas.jenis === "FOTO" ? "image" : "video",
      type: "authenticated",
      sign_url: true,
    });

    const res = await fetch(url);
    if (res.status === 404 || res.status === 410) return null;
    if (!res.ok) {
      throw new Error(`Gagal mengambil media dari Cloudinary (${res.status})`);
    }

    return Buffer.from(await res.arrayBuffer());
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
