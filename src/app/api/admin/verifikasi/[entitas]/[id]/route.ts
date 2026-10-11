import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, ok, validationError } from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { bolehLihatSemuaDivisi, requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { publikasiNotifikasi } from "@/lib/notifikasi-events";
import { verifikasiAksiSchema } from "@/lib/validations/verifikasi";
import { bikinSnapshot } from "@/lib/verifikasi-diff";
import {
  ambilBarisVerifikasi,
  ambilKontenLengkap,
  entitasValid,
  ENTITAS_VERIFIKASI,
  tulisSnapshot,
  tulisVerifikasi,
} from "@/lib/verifikasi-konten";

/**
 * Aksi verifikasi konten.
 *
 * - `ajukan`  : divisi pemilik konten (izin `ubah` modulnya) → `MENUNGGU`.
 * - `verifikasi` / `tolak` : pemegang izin `verifikasi-konten` → `DISETUJUI` /
 *   `DITOLAK`. Hanya transisi dari `MENUNGGU` yang sah (selain itu `409`).
 */
type RouteParams = {
  params: Promise<{ entitas: string; id: string }>;
};

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { entitas, id } = await params;
  if (!entitasValid(entitas)) {
    return notFound("Entitas tidak dikenal");
  }

  const info = ENTITAS_VERIFIKASI[entitas];
  const body = await readJsonBody(req);
  const parsed = verifikasiAksiSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const { aksi, catatan } = parsed.data;

  const baris = await ambilBarisVerifikasi(entitas, id);
  if (!baris) {
    return notFound("Konten tidak ditemukan");
  }

  if (aksi === "ajukan") {
    const sesi = await requirePermission(info.modul, AKSI.UBAH);

    // Batas divisi: staf hanya boleh mengajukan konten divisinya.
    if (
      !bolehLihatSemuaDivisi(sesi) &&
      baris.divisiId !== null &&
      baris.divisiId !== sesi.divisi?.id
    ) {
      return notFound("Konten tidak ditemukan");
    }

    if (baris.status === "PUBLISHED") {
      return conflict("Konten sudah terbit.");
    }
    if (baris.verifikasi === "MENUNGGU") {
      return conflict("Konten sudah menunggu verifikasi.");
    }
    if (baris.verifikasi === "DISETUJUI") {
      return conflict("Konten sudah diverifikasi.");
    }

    await prisma.$transaction(async (tx) => {
      await tulisVerifikasi(
        entitas,
        id,
        {
          verifikasi: "MENUNGGU",
          diverifikasiOleh: null,
          diverifikasiAt: null,
          catatanVerifikasi: catatan ?? null,
        },
        tx
      );
      await catatAudit(tx, {
        adminId: sesi.sub,
        aksi: "KONTEN_AJUKAN",
        entitas: info.label,
        entitasId: id,
      });
    });

    publikasiNotifikasi({ aksi: "KONTEN_AJUKAN", entitasId: id });
    return ok({ message: "Konten diajukan untuk verifikasi." });
  }

  // verifikasi / tolak
  const sesi = await requirePermission(
    MODUL.VERIFIKASI_KONTEN,
    AKSI.UBAH
  );

  if (baris.verifikasi !== "MENUNGGU") {
    return conflict("Konten tidak sedang menunggu verifikasi.");
  }

  const baru = aksi === "verifikasi" ? "DISETUJUI" : "DITOLAK";

  /*
   * Simpan snapshot isi konten saat keputusan ini. Saat konten diajukan ulang
   * nanti, snapshot dipakai untuk menandai bagian yang berubah — dan
   * keberadaannya menandai konten itu "revisi" (bukan baru).
   */
  const lengkap = await ambilKontenLengkap(entitas, id);
  const snapshot = lengkap ? bikinSnapshot(entitas, lengkap) : null;

  await prisma.$transaction(async (tx) => {
    await tulisVerifikasi(
      entitas,
      id,
      {
        verifikasi: baru,
        diverifikasiOleh: sesi.sub,
        diverifikasiAt: new Date(),
        catatanVerifikasi: catatan ?? null,
      },
      tx
    );

    if (snapshot) {
      await tulisSnapshot(
        entitas,
        id,
        snapshot as Prisma.InputJsonValue,
        tx
      );
    }

    await catatAudit(tx, {
      adminId: sesi.sub,
      aksi: aksi === "verifikasi" ? "KONTEN_VERIFIKASI" : "KONTEN_TOLAK",
      entitas: info.label,
      entitasId: id,
      detailPerubahan: diffPerubahan(
        { verifikasi: baris.verifikasi },
        { verifikasi: baru }
      ),
    });
  });

  publikasiNotifikasi({
    aksi: aksi === "verifikasi" ? "KONTEN_VERIFIKASI" : "KONTEN_TOLAK",
    entitasId: id,
  });

  return ok({
    message:
      aksi === "verifikasi"
        ? "Konten berhasil diverifikasi."
        : "Verifikasi konten ditolak.",
  });
}

export const POST = apiHandler(handler);
export const dynamic = "force-dynamic";
