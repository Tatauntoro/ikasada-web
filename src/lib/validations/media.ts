import { z } from "zod";
import { JenisMedia, PenyimpananBerkas } from "@/generated/prisma/enums";
import { MAX_MEDIA_PER_ARSIP } from "@/lib/batas-media";

/**
 * Skema satu media galeri (foto/video) yang dipakai bersama oleh Arsip, Berita,
 * dan Kegiatan. Sebelumnya tinggal di `validations/arsip.ts`; diangkat ke sini
 * supaya ketiganya memakai aturan yang sama tanpa salinan.
 *
 * Media disimpan sebagai **identitas berkas**, bukan URL — isinya dilayani
 * endpoint berpenjaga per entri.
 */

const penyimpananValues = Object.values(PenyimpananBerkas) as [
  PenyimpananBerkas,
  ...PenyimpananBerkas[],
];

const jenisMediaValues = Object.values(JenisMedia) as [
  JenisMedia,
  ...JenisMedia[],
];

/** Batas jumlah media per entri (dipakai arsip, berita, dan kegiatan). */
export const MAX_MEDIA_PER_ENTRI = MAX_MEDIA_PER_ARSIP;

export const mediaSchema = z.object({
  jenis: z.enum(jenisMediaValues, { message: "Jenis media tidak valid" }),
  berkasId: z
    .string({ message: "Berkas media belum diunggah" })
    .min(1, "Berkas media belum diunggah")
    .max(255),
  penyimpanan: z.enum(penyimpananValues, { message: "Penyimpanan tidak valid" }),
  namaAsli: z.string().max(255).optional().nullable(),
  format: z.string().max(10).optional().nullable(),
  ukuran: z.coerce.number().int().min(0).optional().nullable(),
  caption: z
    .string()
    .max(200, "Keterangan maksimal 200 karakter")
    .optional()
    .nullable(),
});

export type MediaInput = z.infer<typeof mediaSchema>;
