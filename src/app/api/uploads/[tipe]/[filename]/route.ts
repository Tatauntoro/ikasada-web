import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { notFound } from "@/lib/response";
import { bacaGambarLokal, TipeUploadLokal } from "@/lib/upload-lokal";

/**
 * Sisi baca gambar upload lokal (kegiatan/alumni/kerjasama/arsip): route
 * dinamis, bukan file statis — lihat komentar `UPLOAD_DIR` di
 * `upload-lokal.ts` untuk kenapa ini wajib lewat sini, bukan `public/`.
 *
 * Publik (tanpa sesi): gambar sampul memang ditampilkan di halaman publik.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPE_VALID: TipeUploadLokal[] = ["kegiatan", "alumni", "kerjasama", "arsip"];

type RouteParams = {
  params: Promise<{ tipe: string; filename: string }>;
};

async function handler(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { tipe, filename } = await params;

  if (!TIPE_VALID.includes(tipe as TipeUploadLokal)) {
    return notFound("Gambar tidak ditemukan");
  }

  const hasil = await bacaGambarLokal(tipe as TipeUploadLokal, filename);
  if (!hasil) {
    return notFound("Gambar tidak ditemukan");
  }

  return new Response(new Uint8Array(hasil.buffer), {
    status: 200,
    headers: {
      "Content-Type": hasil.mimeType,
      "Content-Length": String(hasil.buffer.byteLength),
      // Publik & immutable: nama file pakai UUID acak, jadi aman di-cache lama.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export const GET = apiHandler(handler);
