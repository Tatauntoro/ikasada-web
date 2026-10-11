import { z } from "zod";
import { StatusBerita } from "@/generated/prisma/enums";
import {
  MAX_MEDIA_PER_ENTRI,
  mediaSchema,
} from "@/lib/validations/media";

const statusValues = Object.values(StatusBerita) as [
  StatusBerita,
  ...StatusBerita[]
];

export const beritaBaseSchema = z.object({
  judul: z
    .string({ message: "Judul wajib diisi" })
    .min(3, "Judul minimal 3 karakter")
    .max(150, "Judul maksimal 150 karakter"),
  jenisBeritaId: z
    .string({ message: "Tipe berita wajib dipilih" })
    .min(1, "Tipe berita wajib dipilih"),
  tanggal: z.coerce.date({ message: "Tanggal wajib diisi" }),
  deskripsiSingkat: z
    .string({ message: "Deskripsi singkat wajib diisi" })
    .max(500, "Deskripsi singkat maksimal 500 karakter"),
  deskripsiLengkap: z
    .string()
    .max(20000, "Deskripsi lengkap maksimal 20000 karakter")
    .optional()
    .nullable(),
  gambarUrl: z
    .string()
    .refine(
      (val) =>
        !val ||
        val.startsWith("http://") ||
        val.startsWith("https://") ||
        val.startsWith("/api/uploads/"),
      { message: "URL gambar tidak valid" }
    )
    .optional()
    .nullable(),
  media: z
    .array(mediaSchema)
    .max(
      MAX_MEDIA_PER_ENTRI,
      `Maksimal ${MAX_MEDIA_PER_ENTRI} media per berita`
    )
    .optional(),
  status: z.enum(statusValues, { message: "Status tidak valid" }),
});

export const beritaCreateSchema = beritaBaseSchema;

export const beritaUpdateSchema = beritaCreateSchema;

export type BeritaInput = z.infer<typeof beritaCreateSchema>;
