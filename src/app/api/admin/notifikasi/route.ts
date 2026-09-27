import { NextRequest } from "next/server";
import { okPaginated } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { parsePagination } from "@/lib/pagination";
import { ambilNotifikasiAdmin, type TipeNotifikasi } from "@/lib/notifikasi";

const TIPE = ["PENDAFTARAN", "KONEKSI", "AKUN"] as const;

/**
 * Daftar notifikasi admin (inbox).
 *
 * Item dipetakan dari `AuditLog` (lihat `@/lib/notifikasi`), bukan tabel
 * notifikasi tersendiri. `meta.belumDibaca` ikut dikirim lewat kanal `tambahan`
 * `okPaginated` supaya badge lonceng tidak butuh request kedua — dan nilainya
 * selalu menghitung semua tipe, tidak terpengaruh filter `?tipe=`.
 */
async function handler(req: NextRequest): Promise<Response> {
  const admin = await requirePermission(MODUL.INBOX, AKSI.LIHAT);
  const pagination = parsePagination(req.nextUrl.searchParams);

  const tipeParam = req.nextUrl.searchParams.get("tipe") ?? "";
  const tipe = (TIPE as readonly string[]).includes(tipeParam)
    ? (tipeParam as TipeNotifikasi)
    : undefined;

  const { items, total, belumDibaca } = await ambilNotifikasiAdmin(admin.sub, {
    skip: pagination.skip,
    take: pagination.take,
    tipe,
  });

  return okPaginated(
    items,
    { page: pagination.page, limit: pagination.limit, total },
    { belumDibaca }
  );
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
