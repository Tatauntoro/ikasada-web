import { NextRequest } from "next/server";
import { forbidden, okPaginated } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAdminAktif } from "@/lib/sesi-admin";
import { parsePagination } from "@/lib/pagination";
import {
  ambilNotifikasiAdmin,
  tipeNotifikasiDiizinkan,
  type TipeNotifikasi,
} from "@/lib/notifikasi";

/**
 * Daftar notifikasi admin (inbox).
 *
 * Item dipetakan dari `AuditLog` (lihat `@/lib/notifikasi`), bukan tabel
 * notifikasi tersendiri. Akses dipecah per kategori (izin modul Inbox), jadi
 * admin hanya menerima tipe yang ia berhak lihat. `meta.belumDibaca` mengikuti
 * tipe yang boleh dilihat, bukan filter `?tipe=`.
 */
async function handler(req: NextRequest): Promise<Response> {
  const admin = await requireAdminAktif();
  const diizinkan = tipeNotifikasiDiizinkan(admin);

  if (diizinkan.length === 0) {
    return forbidden("Anda tidak punya akses ke Inbox.");
  }

  const pagination = parsePagination(req.nextUrl.searchParams);

  const tipeParam = req.nextUrl.searchParams.get("tipe") ?? "";
  const tipe = diizinkan.includes(tipeParam as TipeNotifikasi)
    ? (tipeParam as TipeNotifikasi)
    : undefined;

  const { items, total, belumDibaca } = await ambilNotifikasiAdmin(admin, {
    skip: pagination.skip,
    take: pagination.take,
    tipe,
    tipeDiizinkan: diizinkan,
  });

  return okPaginated(
    items,
    { page: pagination.page, limit: pagination.limit, total },
    { belumDibaca }
  );
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
