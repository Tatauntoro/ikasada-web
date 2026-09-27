import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAlumniAktif } from "@/lib/sesi-alumni";
import { jalankanAksiKoneksi } from "@/lib/connection-aksi";

/**
 * Terima permintaan koneksi (BE-Planning §4.4, §6).
 * Hanya penerima permintaan yang boleh; aturannya ada di `connection-aksi.ts`.
 */
type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const saya = await requireAlumniAktif();
  const { id } = await params;

  return jalankanAksiKoneksi("ACCEPT", id, saya.sub);
}

export const PATCH = apiHandler(handler);
export const dynamic = "force-dynamic";
