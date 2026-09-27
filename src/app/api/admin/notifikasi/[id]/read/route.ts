import { NextRequest } from "next/server";
import { ok, notFound, badRequest } from "@/lib/response";
import { apiHandler } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";
import {
  hitungBelumDibaca,
  tandaiSatuNotifikasiDibaca,
} from "@/lib/notifikasi";

/**
 * Tandai **satu** notifikasi sudah dibaca oleh admin ini.
 *
 * Penandanya adalah baris `NotifikasiDibaca` (per admin per notifikasi), jadi
 * inbox admin lain tidak ikut terpengaruh. Notifikasi yang sudah tercakup
 * penanda "semua" tidak menambah baris baru — hasilnya `read: 0`.
 */
type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handler(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const admin = await requireAdminAktif();
  const { id } = await params;

  if (!id) {
    return badRequest("Id notifikasi wajib diisi");
  }

  const hasil = await tandaiSatuNotifikasiDibaca(admin.sub, id);

  if (!hasil.ada) {
    return notFound("Notifikasi tidak ditemukan");
  }

  return ok({
    read: hasil.berubah,
    belumDibaca: await hitungBelumDibaca(admin.sub),
  });
}

export const POST = apiHandler(handler);
export const dynamic = "force-dynamic";
