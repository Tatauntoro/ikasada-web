import { NextRequest } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth";
import { requireAdminAktif } from "@/lib/sesi-admin";
import { forbidden, unauthorized } from "@/lib/response";
import { hitungBelumDibaca } from "@/lib/notifikasi";
import { buatStreamHitungan } from "@/lib/sse";

/**
 * Kanal realtime badge notifikasi admin (Server-Sent Events).
 *
 * Satu koneksi panjang per admin; plumbing-nya ada di `@/lib/sse`. Sinyal instan
 * datang dari bus in-process yang dipicu route koneksi/register, dengan re-cek
 * database berkala sebagai jaring pengaman.
 *
 * Handler ini sengaja **tidak** dibungkus `apiHandlerWithoutParams`: pembungkus
 * itu menambah header `x-request-id` pada objek `Response`, dan pada body
 * streaming hal seperti itu sebaiknya dihindari. Pesan unauthorized dipetakan
 * manual.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  let adminId: string;
  try {
    const admin = await requireAdminAktif();
    adminId = admin.sub;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return unauthorized(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbidden(error.message);
    }
    throw error;
  }

  return buatStreamHitungan(
    async () => ({ belumDibaca: await hitungBelumDibaca(adminId) }),
    req.signal,
    { label: "Notifikasi admin" }
  );
}
