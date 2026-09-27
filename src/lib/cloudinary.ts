import { v2 as cloudinary } from "cloudinary";

export type TipeUpload = "kegiatan" | "alumni" | "kerjasama" | "arsip";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const FOLDER: Record<TipeUpload, string> = {
  kegiatan: "ikasada/kegiatan",
  alumni: "ikasada/alumni",
  kerjasama: "ikasada/kerjasama",
  arsip: "ikasada/arsip-sampul",
};

const TRANSFORMASI: Record<
  TipeUpload,
  Array<Record<string, string | number>>
> = {
  kegiatan: [
    { width: 1200, height: 675, crop: "fill", gravity: "auto" },
  ],
  alumni: [
    { width: 400, height: 400, crop: "fill", gravity: "face" },
  ],
  kerjasama: [
    { width: 1200, height: 675, crop: "fill", gravity: "auto" },
  ],
  arsip: [
    { width: 1200, height: 675, crop: "fill", gravity: "auto" },
  ],
};

function isConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export async function uploadGambar(
  buffer: Buffer,
  tipe: TipeUpload,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  if (!isConfigured()) {
    throw new Error("Konfigurasi Cloudinary belum lengkap");
  }

  if (!["kegiatan", "alumni", "kerjasama", "arsip"].includes(tipe)) {
    throw new Error("Tipe upload tidak valid");
  }

  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  const hasil = await cloudinary.uploader.upload(dataUri, {
    folder: FOLDER[tipe],
    resource_type: "image",
    overwrite: true,
  });

  const publicId = hasil.public_id;
  const url = cloudinary.url(publicId, {
    secure: true,
    transformation: TRANSFORMASI[tipe],
  });

  return { url, publicId };
}
