import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

/**
 * Penyimpanan berkas dokumen arsip.
 *
 * Berbeda dari `upload-lokal.ts` (gambar, ditulis ke `public/uploads`), berkas
 * arsip **tidak boleh** berada di `public/`: apa pun di sana disajikan statis
 * oleh hosting, sehingga pembatasan "unduh khusus alumni" bisa dilewati dengan
 * membuka URL-nya langsung. Karena itu berkas lokal ditulis ke `storage/arsip/`
 * dan hanya bisa keluar lewat `GET /api/arsip/[slug]/unduh`.
 *
 * Yang disimpan ke database adalah **identitas** berkas (`berkasId`), bukan URL:
 * - Cloudinary: `public_id` dari aset `type: "authenticated"` (tidak bisa
 *   diakses publik tanpa tanda tangan).
 * - Lokal: path relatif terhadap `storage/`, mis. `arsip/laporan-a1b2c3d4.pdf`.
 */

export type PenyimpananBerkas = "CLOUDINARY" | "LOKAL";

export type BerkasTersimpan = {
  berkasId: string;
  penyimpanan: PenyimpananBerkas;
  namaAsli: string;
  format: string;
  ukuran: number;
};

/**
 * Format dokumen yang diterima. Kunci = MIME type, nilai = ekstensi.
 *
 * Ukuran dibatasi 4 MB karena berkas melewati API kita dulu; request body di
 * Vercel dibatasi ~4,5 MB (lihat `BE-Planning-Portal-Admin-IKASADA.md` §7.6).
 * Menaikkan batas ini butuh jalur direct-upload bertanda tangan ke Cloudinary,
 * bukan sekadar menaikkan angkanya.
 */
export const MIME_BERKAS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export const MAX_UKURAN_BERKAS = 4 * 1024 * 1024; // 4 MB

const FOLDER_CLOUDINARY = "ikasada/arsip";
const BERKAS_DIR = path.join(process.cwd(), "storage", "arsip");
const AKAR_STORAGE = path.join(process.cwd(), "storage");

/** MIME untuk header respons, dibalik dari `MIME_BERKAS`. */
const MIME_DARI_FORMAT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function mimeDariFormat(format: string): string {
  return MIME_DARI_FORMAT[format.toLowerCase()] ?? "application/octet-stream";
}

/** Ekstensi yang dikenali, atau `null` kalau tipe berkasnya tidak didukung. */
export function formatDariMime(mimeType: string): string | null {
  return MIME_BERKAS[mimeType.toLowerCase()] ?? null;
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/** Nama berkas aman: huruf/angka/strip saja, dipotong supaya tidak kepanjangan. */
function namaAman(namaAsli: string, format: string): string {
  const tanpaEkstensi = namaAsli.replace(/\.[^.]+$/, "");
  const dasar = tanpaEkstensi
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "")
    .slice(0, 60);

  const unik = crypto.randomUUID().slice(0, 8);
  return `${dasar || "berkas"}-${unik}.${format}`;
}

export async function simpanBerkasArsip(
  buffer: Buffer,
  namaAsli: string,
  mimeType: string
): Promise<BerkasTersimpan> {
  const format = formatDariMime(mimeType);

  if (!format) {
    throw new Error("Tipe berkas tidak didukung. Gunakan PDF, DOC, DOCX, XLS, atau XLSX.");
  }

  if (buffer.byteLength > MAX_UKURAN_BERKAS) {
    throw new Error("Ukuran berkas maksimal 4 MB.");
  }

  const namaBerkas = namaAman(namaAsli, format);

  if (isCloudinaryConfigured()) {
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    const hasil = await cloudinary.uploader.upload(dataUri, {
      folder: FOLDER_CLOUDINARY,
      // `raw` untuk dokumen (bukan gambar), dan `authenticated` supaya asetnya
      // tidak bisa diambil tanpa tanda tangan dari akun Cloudinary.
      resource_type: "raw",
      type: "authenticated",
      public_id: namaBerkas,
      overwrite: false,
    });

    return {
      berkasId: hasil.public_id,
      penyimpanan: "CLOUDINARY",
      namaAsli,
      format,
      ukuran: buffer.byteLength,
    };
  }

  await fs.mkdir(BERKAS_DIR, { recursive: true });
  await fs.writeFile(path.join(BERKAS_DIR, namaBerkas), buffer);

  return {
    berkasId: `arsip/${namaBerkas}`,
    penyimpanan: "LOKAL",
    namaAsli,
    format,
    ukuran: buffer.byteLength,
  };
}

/**
 * Ambil isi berkas untuk dilayani endpoint unduh.
 *
 * Mengembalikan `null` kalau berkasnya tidak ada lagi di penyimpanan (mis.
 * berkas lokal yang hilang setelah deploy, atau aset Cloudinary yang sudah
 * dihapus). Pemanggil menerjemahkannya jadi 404 — bukan 500, karena yang salah
 * bukan permintaannya dan admin perlu tahu berkasnya harus diunggah ulang.
 *
 * Untuk Cloudinary dipakai URL bertanda tangan yang hanya hidup sebentar, dan
 * pengambilannya dilakukan **di server** — URL itu tidak boleh sampai ke
 * browser, karena itu jalan pintas melewati pemeriksaan sesi alumni.
 */
export async function bacaBerkasArsip(berkas: {
  berkasId: string;
  penyimpanan: PenyimpananBerkas;
  berkasFormat: string | null;
}): Promise<Buffer | null> {
  if (berkas.penyimpanan === "CLOUDINARY") {
    const url = cloudinary.url(berkas.berkasId, {
      resource_type: "raw",
      type: "authenticated",
      sign_url: true,
    });

    const res = await fetch(url);

    // 404/410 = asetnya memang tidak ada lagi; sisanya masalah penyedia.
    if (res.status === 404 || res.status === 410) return null;
    if (!res.ok) {
      throw new Error(`Gagal mengambil berkas dari Cloudinary (${res.status})`);
    }

    return Buffer.from(await res.arrayBuffer());
  }

  // Cegah path keluar dari folder storage (`../`) kalau data DB tidak wajar.
  const lengkap = path.resolve(AKAR_STORAGE, berkas.berkasId);
  if (lengkap !== AKAR_STORAGE && !lengkap.startsWith(AKAR_STORAGE + path.sep)) {
    throw new Error("Lokasi berkas tidak valid");
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
