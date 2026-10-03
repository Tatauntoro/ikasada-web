import { NextRequest } from "next/server";
import { okPaginated } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { parsePagination } from "@/lib/pagination";
import { daftarBeritaPublik } from "@/lib/berita-publik";

/**
 * `GET /api/public/berita` — daftar berita terbit, berhalaman.
 *
 * Query: `page`, `limit`. Meta membawa `total`/`totalPages` untuk `Pagination`.
 */
async function handler(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);

  const { items, total } = await daftarBeritaPublik({
    page: pagination.page,
    limit: pagination.limit,
  });

  return okPaginated(items, {
    page: pagination.page,
    limit: pagination.limit,
    total,
  });
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
