import { NextRequest } from "next/server";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import {
  bolehLihatSemuaDivisi,
  requirePermission,
} from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { StatusVerifikasiKonten } from "@/generated/prisma/enums";
import {
  daftarVerifikasi,
  entitasValid,
  type EntitasVerifikasi,
} from "@/lib/verifikasi-konten";

/**
 * Antrean verifikasi konten.
 *
 * `?status=` (default `MENUNGGU`) dan `?entitas=` (opsional) menyaring daftar.
 * Hanya admin dengan izin `verifikasi-konten:lihat` yang boleh membuka. Bila
 * akunnya tidak lintas divisi, ia hanya melihat antrean divisinya sendiri.
 */
async function handler(req: NextRequest): Promise<Response> {
  const sesi = await requirePermission(MODUL.VERIFIKASI_KONTEN, AKSI.LIHAT);

  const { searchParams } = req.nextUrl;

  const nilaiStatus = searchParams.get("status") ?? "MENUNGGU";
  const status = (
    Object.values(StatusVerifikasiKonten) as string[]
  ).includes(nilaiStatus)
    ? (nilaiStatus as StatusVerifikasiKonten)
    : StatusVerifikasiKonten.MENUNGGU;

  const nilaiEntitas = searchParams.get("entitas");
  const entitas: EntitasVerifikasi | undefined =
    nilaiEntitas && entitasValid(nilaiEntitas) ? nilaiEntitas : undefined;

  let items = await daftarVerifikasi(status, { entitas });

  if (!bolehLihatSemuaDivisi(sesi)) {
    items = items.filter(
      (i) => i.divisiId === null || i.divisiId === sesi.divisi?.id
    );
  }

  return ok(items);
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
