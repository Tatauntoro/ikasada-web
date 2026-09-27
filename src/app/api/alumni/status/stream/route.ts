import { NextRequest } from "next/server";
import {
  AlumniUnauthorizedError,
  requireAlumniSession,
} from "@/lib/auth-alumni";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/response";
import { buatStreamHitungan } from "@/lib/sse";
import { KODE_STATUS_TIDAK_DIKENAL, kodeDariStatus } from "@/lib/status-akun";

/**
 * Kanal realtime status akun alumni (Server-Sent Events).
 *
 * Berbeda dari `/api/alumni/connections/stream` yang menuntut akun `ACTIVE`,
 * kanal ini justru dibuka untuk **semua akun yang boleh login** — termasuk
 * `PENDING` — karena pendaftar yang sedang menunggu verifikasi-lah yang paling
 * butuh tahu begitu pengurus menyetujui (atau menolak) akunnya.
 *
 * Sinyalnya datang dari bus in-process yang dipicu route approve/reject/suspend
 * admin, dengan re-cek database berkala (jaring pengaman) dari `@/lib/sse`.
 * Yang dikirim hanya kode status akun pemanggil sendiri — tidak ada data lain.
 *
 * Handler ini **tidak** dibungkus `apiHandlerWithoutParams`: pembungkus itu
 * menambah header pada `Response` streaming. Penjagaannya manual.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  let accountId: string;
  try {
    const sesi = await requireAlumniSession();
    accountId = sesi.sub;
  } catch (error) {
    if (error instanceof AlumniUnauthorizedError) {
      return unauthorized(error.message);
    }
    throw error;
  }

  return buatStreamHitungan(
    async () => {
      const akun = await prisma.alumniAccount.findUnique({
        where: { id: accountId },
        select: { status: true },
      });

      return {
        statusKode: akun
          ? kodeDariStatus(akun.status)
          : KODE_STATUS_TIDAK_DIKENAL,
      };
    },
    req.signal,
    { label: "Status akun alumni" }
  );
}
