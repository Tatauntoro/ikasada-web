import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { notFound } from "@/lib/response";
import { bacaObjekR2, infoObjekR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ filename: string }> };
type Range = { header: string; contentRange: string };

function normalisasiRange(header: string, ukuran: number): Range | null | false {
  const cocok = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!cocok || ukuran <= 0) return false;

  let awal: number;
  let akhir: number;
  if (!cocok[1]) {
    const suffix = Number(cocok[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    awal = Math.max(ukuran - suffix, 0);
    akhir = ukuran - 1;
  } else {
    awal = Number(cocok[1]);
    akhir = cocok[2] ? Number(cocok[2]) : ukuran - 1;
    if (
      !Number.isSafeInteger(awal) ||
      !Number.isSafeInteger(akhir) ||
      awal < 0 ||
      akhir < awal ||
      awal >= ukuran
    ) {
      return false;
    }
    akhir = Math.min(akhir, ukuran - 1);
  }

  return {
    header: `bytes=${awal}-${akhir}`,
    contentRange: `bytes ${awal}-${akhir}/${ukuran}`,
  };
}

async function filenameValid(params: RouteParams["params"]): Promise<string | null> {
  const { filename } = await params;
  const match = /^([0-9a-f-]{36})\.(mp4|webm)$/i.exec(filename);
  return match ? `${match[1].toLowerCase()}.${match[2].toLowerCase()}` : null;
}

async function getHandler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const filename = await filenameValid(params);
  if (!filename) return notFound("Video tidak ditemukan");

  const key = `hero-video/${filename}`;
  const rangeHeader = req.headers.get("range");
  const info = rangeHeader ? await infoObjekR2(key) : null;
  if (rangeHeader && !info) return notFound("Video tidak ditemukan");

  const range =
    rangeHeader && info
      ? normalisasiRange(rangeHeader, info.ukuran)
      : null;
  if (range === false) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${info?.ukuran ?? 0}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const result = await bacaObjekR2(key, range?.header);
  if (!result?.stream) return notFound("Video tidak ditemukan");

  const headers = new Headers({
    "Content-Type":
      result.contentType ?? info?.contentType ?? "application/octet-stream",
    "Content-Length": String(result.ukuran),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  if (range) {
    headers.set("Content-Range", result.contentRange ?? range.contentRange);
  }

  return new Response(result.stream, {
    status: range ? 206 : 200,
    headers,
  });
}

async function headHandler(
  _req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const filename = await filenameValid(params);
  if (!filename) return notFound("Video tidak ditemukan");
  const info = await infoObjekR2(`hero-video/${filename}`);
  if (!info) return notFound("Video tidak ditemukan");

  return new Response(null, {
    headers: {
      "Content-Type": info.contentType ?? "application/octet-stream",
      "Content-Length": String(info.ukuran),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export const GET = apiHandler(getHandler);
export const HEAD = apiHandler(headHandler);
