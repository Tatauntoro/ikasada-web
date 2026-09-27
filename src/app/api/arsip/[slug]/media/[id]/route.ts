import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiHandler } from "@/lib/api-handler";
import { notFound } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { alumniAktif } from "@/lib/sesi-alumni";
import { bolehLihatKonten } from "@/lib/akses-arsip";
import { bacaMediaArsip, mimeMediaDariFormat } from "@/lib/simpan-media";

/**
 * Berkas satu media galeri arsip.
 *
 * Media tidak punya URL publik: hak aksesnya mengikuti arsip induknya, jadi
 * semuanya lewat sini. Untuk arsip `KHUSUS_ALUMNI`, pengunjung umum **dan**
 * alumni yang belum aktif ditolak; untuk tingkat lain, pengunjung umum boleh
 * (sesuai makna tingkatnya).
 *
 * Admin selalu boleh mengambil media (termasuk arsip DRAFT) supaya form edit
 * bisa menampilkan pratinjau media yang sudah tersimpan.
 *
 * Mendukung `Range` sederhana supaya video bisa di-seek tanpa mengunduh ulang
 * seluruh berkas.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ slug: string; id: string }>;
};

function potongRange(
  isi: Buffer,
  headerRange: string | null
): { badan: Buffer; status: number; contentRange?: string } {
  if (!headerRange) return { badan: isi, status: 200 };

  const cocok = /^bytes=(\d*)-(\d*)$/.exec(headerRange.trim());
  if (!cocok) return { badan: isi, status: 200 };

  const [, awalTeks, akhirTeks] = cocok;
  const ukuran = isi.byteLength;

  let awal = awalTeks === "" ? null : Number(awalTeks);
  let akhir = akhirTeks === "" ? null : Number(akhirTeks);

  if (awal === null && akhir === null) return { badan: isi, status: 200 };

  // `bytes=-500` = 500 byte terakhir.
  if (awal === null) {
    const panjang = Math.min(akhir as number, ukuran);
    awal = Math.max(0, ukuran - panjang);
    akhir = ukuran - 1;
  } else if (akhir === null || akhir >= ukuran) {
    akhir = ukuran - 1;
  }

  if (awal > akhir || awal >= ukuran) {
    return { badan: Buffer.alloc(0), status: 416 };
  }

  return {
    badan: isi.subarray(awal, akhir + 1),
    status: 206,
    contentRange: `bytes ${awal}-${akhir}/${ukuran}`,
  };
}

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { slug, id } = await params;

  const [media, aktif, sesiAdmin] = await Promise.all([
    prisma.arsipMedia.findFirst({
      where: { id, arsip: { slug } },
      include: { arsip: { select: { status: true, akses: true } } },
    }),
    alumniAktif(),
    getSession(),
  ]);

  if (!media) {
    return notFound("Media tidak ditemukan");
  }

  const admin = Boolean(sesiAdmin);
  const entriTerbit = media.arsip.status === "PUBLISHED";
  const boleh =
    admin ||
    (entriTerbit && bolehLihatKonten(media.arsip.akses, Boolean(aktif)));

  if (!boleh) {
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
    // Privat: jangan disimpan di cache bersama.
    "Cache-Control": "private, max-age=0, must-revalidate",
  };

  if (contentRange) {
    headers["Content-Range"] = contentRange;
  }

  return new Response(new Uint8Array(badan), { status, headers });
}

export const GET = apiHandler(handler);
