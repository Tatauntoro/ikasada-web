import { NextRequest } from "next/server";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";
import {
  hitungBelumDibaca,
  tandaiSemuaNotifikasiDibaca,
} from "@/lib/notifikasi";

/**
 * Tandai **semua** notifikasi admin ini sudah dibaca.
 *
 * Cukup menggeser satu penanda waktu (`AdminUser.notifikasiDibacaAt`), bukan
 * menulis satu baris per notifikasi. Penanda per item yang jadi usang
 * dibersihkan sekalian (lihat `tandaiSemuaNotifikasiDibaca`).
 *
 * Idempoten, dan tidak menulis `AuditLog` — sama seperti
 * `POST /api/alumni/connections/read`, ini penanda baca, bukan tindakan yang
 * perlu dijejaki. Hitungan terbaru dikembalikan supaya badge bisa disinkronkan
 * tanpa permintaan tambahan.
 */
async function handler(req: NextRequest): Promise<Response> {
  void req;
  const admin = await requireAdminAktif();

  await tandaiSemuaNotifikasiDibaca(admin.sub);

  return ok({ belumDibaca: await hitungBelumDibaca(admin.sub) });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
