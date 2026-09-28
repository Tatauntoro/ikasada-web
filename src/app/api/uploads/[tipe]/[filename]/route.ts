import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { notFound } from "@/lib/response";
import { isR2Configured } from "@/lib/r2";
import {
  bacaGambar,
  TipeUploadGambar,
  type BackendGambar,
} from "@/lib/upload-gambar";
import { logPeristiwa, requestIdDari } from "@/lib/log";

/**
 * Sisi baca gambar upload (kegiatan/alumni/kerjasama/arsip): route dinamis,
 * bukan file statis — lihat komentar di `upload-gambar.ts` untuk kenapa ini
 * wajib lewat sini (bucket R2 privat / build standalone tidak serve file
 * `public/` yang ditulis saat runtime).
 *
 * Publik (tanpa sesi): gambar sampul memang ditampilkan di halaman publik.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPE_VALID: TipeUploadGambar[] = ["kegiatan", "alumni", "kerjasama", "arsip"];

type RouteParams = {
  params: Promise<{ tipe: string; filename: string }>;
};

/**
 * Penanda backend dari URL (`?b=r2|lokal`). Nilai tak dikenal diperlakukan
 * sebagai legacy (`null`) supaya URL lama tetap dilayani lewat heuristik.
 */
function parseBackend(nilai: string | null): BackendGambar | null {
  return nilai === "r2" || nilai === "lokal" ? nilai : null;
}

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { tipe, filename } = await params;

  if (!TIPE_VALID.includes(tipe as TipeUploadGambar)) {
    return notFound("Gambar tidak ditemukan");
  }

  const backend = parseBackend(req.nextUrl.searchParams.get("b"));

  /*
   * Berkas ditandai tersimpan di R2, tapi server ini tidak punya kredensialnya.
   * Tanpa baris log ini, kegagalannya cuma tampak sebagai 404 biasa — persis
   * yang bikin insiden "aset gagal tampil" sulit dilacak.
   */
  if (backend === "r2" && !isR2Configured()) {
    logPeristiwa("penyimpanan", {
      requestId: requestIdDari(req),
      endpoint: "/api/uploads",
      tipe,
      filename,
      backend,
      alasan: "r2_tanpa_kredensial",
    });
  }

  const hasil = await bacaGambar(tipe as TipeUploadGambar, filename, backend);
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
