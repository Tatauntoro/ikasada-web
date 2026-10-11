import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { SECTION_DEFAULT } from "@/lib/beranda";

/**
 * Pastikan semua section default ada di DB (idempoten).
 *
 * Dipanggil saat halaman **admin** membaca daftar beranda. Section sengaja tidak
 * bisa dihapus (hanya diubah), jadi ini tidak pernah menghidupkan kembali yang
 * terhapus — `deletedAt` di-reset hanya sebagai jaring pengaman. Baris lama yang
 * `konfigurasi`-nya masih kosong (mis. section baru ditambahkan setelah barisnya
 * ada) ikut diisi default-nya, supaya halaman admin tidak menampilkan editor
 * kosong.
 */
export async function pastikanSectionAda(): Promise<void> {
  for (const s of SECTION_DEFAULT) {
    const ada = await prisma.sectionBeranda.findUnique({
      where: { kunci: s.kunci },
    });

    if (!ada) {
      await prisma.sectionBeranda.create({
        data: {
          kunci: s.kunci,
          urutan: s.urutan,
          eyebrow: s.eyebrow ?? null,
          judul: s.judul ?? null,
          deskripsi: s.deskripsi ?? null,
          konfigurasi: s.konfigurasi
            ? (s.konfigurasi as Prisma.InputJsonValue)
            : undefined,
        },
      });
      continue;
    }

    const patch: Prisma.SectionBerandaUpdateInput = {};
    if (ada.deletedAt) patch.deletedAt = null;
    if (ada.konfigurasi === null && s.konfigurasi) {
      patch.konfigurasi = s.konfigurasi as Prisma.InputJsonValue;
    }

    if (Object.keys(patch).length > 0) {
      await prisma.sectionBeranda.update({
        where: { kunci: s.kunci },
        data: patch,
      });
    }
  }
}
