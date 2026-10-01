import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { notFound } from "@/lib/response";
import { isR2Configured } from "@/lib/r2";
import { bacaGambar, TipeUploadGambar } from "@/lib/upload-gambar";
import { logPeristiwa, requestIdDari } from "@/lib/log";

/**
 * Sisi baca gambar upload (kegiatan/alumni/kerjasama/arsip): route dinamis
 * yang membaca dari R2 (bucket privat). Query `?b=` pada URL lama diabaikan.
 *
 * Publik (tanpa sesi): gambar sampul memang ditampilkan di halaman publik.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPE_VALID: TipeUploadGambar[] = ["kegiatan", "alumni", "kerjasama", "arsip"];

type RouteParams = {
  params: Promise<{ tipe: string; filename: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { tipe, filename } = await params;

  if (!TIPE_VALID.includes(tipe as TipeUploadGambar)) {
    return notFound("Gambar tidak ditemukan");
  }

  if (!isR2Configured()) {
    logPeristiwa("penyimpanan", {
      requestId: requestIdDari(req),
      endpoint: "/api/uploads",
      tipe,
      filename,
      alasan: "r2_tanpa_kredensial",
    });
  }

  const hasil = await bacaGambar(tipe as TipeUploadGambar, filename);
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
