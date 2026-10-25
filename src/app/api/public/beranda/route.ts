import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { SECTION_DEFAULT } from "@/lib/beranda";

/**
 * Konfigurasi beranda untuk halaman publik (read-only).
 *
 * Hanya mengembalikan section yang **aktif** dan titik sebaran yang aktif &
 * belum dihapus. Kalau tabel section masih kosong (belum di-seed), dipakai
 * default dari `SECTION_DEFAULT` — jadi beranda tidak pernah kosong dan endpoint
 * ini murni baca (tidak menulis).
 */
async function handler(req: NextRequest): Promise<Response> {
  void req;

  const [section, sebaran] = await Promise.all([
    prisma.sectionBeranda.findMany({
      where: { deletedAt: null },
      orderBy: [{ urutan: "asc" }, { kunci: "asc" }],
    }),
    prisma.titikSebaran.findMany({
      where: { deletedAt: null, aktif: true },
      orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
      select: { nama: true, lat: true, lng: true },
    }),
  ]);

  const sectionsAda =
    section.length > 0
      ? section.map((s) => ({
          kunci: s.kunci,
          aktif: s.aktif,
          urutan: s.urutan,
          judul: s.judul,
          eyebrow: s.eyebrow,
          deskripsi: s.deskripsi,
          warnaJudul: s.warnaJudul,
          warnaEyebrow: s.warnaEyebrow,
          warnaBackground: s.warnaBackground,
          ukuranJudul: s.ukuranJudul,
          ukuranEyebrow: s.ukuranEyebrow,
          konfigurasi: s.konfigurasi,
        }))
      : SECTION_DEFAULT.map((s) => ({
          kunci: s.kunci,
          aktif: true,
          urutan: s.urutan,
          judul: s.judul ?? null,
          eyebrow: s.eyebrow ?? null,
          deskripsi: s.deskripsi ?? null,
          warnaJudul: null,
          warnaEyebrow: null,
          warnaBackground: null,
          ukuranJudul: null,
          ukuranEyebrow: null,
          konfigurasi: s.konfigurasi ?? null,
        }));

  const defaultHero = SECTION_DEFAULT.find((s) => s.kunci === "hero");
  const sections =
    sectionsAda.some((s) => s.kunci === "hero") || !defaultHero
      ? sectionsAda
      : [
          ...sectionsAda,
          {
            kunci: "hero",
            aktif: true,
            urutan: defaultHero.urutan,
            judul: defaultHero.judul ?? null,
            eyebrow: defaultHero.eyebrow ?? null,
            deskripsi: defaultHero.deskripsi ?? null,
            warnaJudul: null,
            warnaEyebrow: null,
            warnaBackground: null,
            ukuranJudul: null,
            ukuranEyebrow: null,
            konfigurasi: defaultHero.konfigurasi ?? null,
          },
        ];

  return ok({ sections, sebaran });
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
