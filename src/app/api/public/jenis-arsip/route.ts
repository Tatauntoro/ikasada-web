import { NextRequest } from "next/server";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { jenisArsipTerpakai } from "@/lib/arsip-publik";

/**
 * Jenis arsip untuk filter halaman publik.
 *
 * Hanya jenis yang dipakai minimal satu arsip terbit (`jenisArsipTerpakai`),
 * supaya filter tidak menawarkan pilihan yang pasti kosong. Arsip `KHUSUS_ALUMNI`
 * ikut dihitung karena tetap tampil di daftar publik (mode terkunci).
 */
async function handler(req: NextRequest): Promise<Response> {
  void req;
  return ok(await jenisArsipTerpakai());
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
