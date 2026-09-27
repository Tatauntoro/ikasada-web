import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAlumniAktif } from "@/lib/sesi-alumni";
import { jalankanAksiKoneksi } from "@/lib/connection-aksi";

/**
 * Putuskan koneksi yang sudah `ACCEPTED` (BE-Planning §4.4, Task 20).
 *
 * Semantiknya diputuskan di Task 20: `DELETE` di sini **tidak** menghapus baris
 * — `Connection` tidak punya `deletedAt`, dan aturan project melarang hard
 * delete — melainkan mengubah statusnya menjadi `REVOKED`. Efeknya sama dengan
 * yang diharapkan user: kontak langsung tertutup (hanya `ACCEPTED` yang membuka
 * kontak), kartu direktori kembali menawarkan "Hubungkan", dan pasangan itu bisa
 * mencoba lagi nanti lewat jalur hidup-ulang yang sudah ada sejak Task 8.
 *
 * Pembatalan permintaan yang masih `PENDING` bukan di sini, melainkan
 * `PATCH /:id/cancel` — dipisah supaya "batalkan" dan "putuskan" tidak
 * tertukar. Boleh dipanggil oleh kedua pihak, dan hanya berlaku untuk
 * `ACCEPTED`; status lain dijawab `409` beserta status terkini.
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

  return jalankanAksiKoneksi("REVOKE", id, saya.sub);
}

export const DELETE = apiHandler(handler);
export const dynamic = "force-dynamic";
