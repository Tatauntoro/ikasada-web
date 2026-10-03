import { NextRequest } from "next/server";
import { ok, notFound } from "@/lib/response";
import { apiHandler } from "@/lib/api-handler";
import { ambilBeritaPublik } from "@/lib/berita-publik";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/** `GET /api/public/berita/[slug]` — satu berita terbit. */
async function handler(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { slug } = await params;

  const berita = await ambilBeritaPublik(slug);
  if (!berita) {
    return notFound("Berita tidak ditemukan");
  }

  return ok(berita);
}

export const GET = apiHandler(handler);
export const dynamic = "force-dynamic";
