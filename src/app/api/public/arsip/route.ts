import { NextRequest } from "next/server";
import { okPaginated } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { parsePagination } from "@/lib/pagination";
import { alumniAktif } from "@/lib/sesi-alumni";
import {
  daftarArsipPublik,
  tahunArsipTersedia,
} from "@/lib/arsip-publik";

/**
 * Daftar arsip terbit untuk halaman `/arsip` dan section beranda.
 *
 * Semua tingkat akses ikut terdaftar; arsip `KHUSUS_ALUMNI` dikirim dengan
 * `terkunci: true` untuk pengunjung yang bukan alumni aktif, sehingga UI bisa
 * menampilkannya dalam mode terkunci (bukan disembunyikan).
 *
 * `meta.tahunTersedia` ikut dikirim lewat kanal `tambahan` `okPaginated`
 * (pola yang sama dengan `meta.belumDibaca` di inbox admin) supaya dropdown
 * tahun tidak perlu request terpisah.
 */
async function handler(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);

  const { items, total } = await daftarArsipPublik({
    search: searchParams.get("search"),
    jenisId: searchParams.get("jenisId"),
    tahun: searchParams.get("tahun"),
    page: pagination.page,
    limit: pagination.limit,
    alumniAktif: Boolean(await alumniAktif()),
  });

  return okPaginated(
    items,
    { page: pagination.page, limit: pagination.limit, total },
    { tahunTersedia: await tahunArsipTersedia() }
  );
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
