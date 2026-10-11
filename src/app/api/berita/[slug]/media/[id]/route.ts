import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiHandler } from "@/lib/api-handler";
import { notFound } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { bacaMediaArsip, mimeMediaDariFormat } from "@/lib/simpan-media";
import { potongRange } from "@/lib/range-http";

/**
 * Berkas satu media galeri berita.
 *
 * Berita bersifat publik (tidak punya tingkatan akses seperti arsip), jadi
 * media entri `PUBLISHED` boleh diambil siapa saja. Admin tetap boleh mengambil
 * media berita DRAFT supaya form edit bisa menampilkan pratinjaunya.
 *
 * Mendukung `Range` supaya video bisa di-seek.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ slug: string; id: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { slug, id } = await params;

  const [media, sesiAdmin] = await Promise.all([
    prisma.beritaMedia.findFirst({
      where: { id, berita: { slug } },
      include: { berita: { select: { status: true } } },
    }),
    getSession(),
  ]);

  if (!media) {
    return notFound("Media tidak ditemukan");
  }

  const admin = Boolean(sesiAdmin);
  const entriTerbit = media.berita.status === "PUBLISHED";

  if (!admin && !entriTerbit) {
    return notFound("Media tidak ditemukan");
  }

  const isi = await bacaMediaArsip({
    berkasId: media.berkasId,
    penyimpanan: media.penyimpanan,
    jenis: media.jenis,
  });

  if (!isi) {
    return notFound(
      "Berkas media ini tidak ditemukan di penyimpanan. Hubungi pengurus untuk mengunggahnya kembali."
    );
  }

  const { badan, status, contentRange } = potongRange(
    isi,
    req.headers.get("range")
  );

  const headers: Record<string, string> = {
    "Content-Type": mimeMediaDariFormat(media.format),
    "Content-Length": String(badan.byteLength),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  };

  if (contentRange) {
    headers["Content-Range"] = contentRange;
  }

  return new Response(new Uint8Array(badan), { status, headers });
}

export const GET = apiHandler(handler);
