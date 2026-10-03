import { z } from "zod";
import { StatusBerita } from "@/generated/prisma/enums";

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
    .max(300, "Deskripsi singkat maksimal 300 karakter"),
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
  status: z.enum(statusValues, { message: "Status tidak valid" }),
});

export const beritaCreateSchema = beritaBaseSchema.superRefine((data, ctx) => {
  if (data.status === "PUBLISHED" && !data.gambarUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["gambarUrl"],
      message: "Gambar wajib diisi untuk status Published",
    });
  }
});

export const beritaUpdateSchema = beritaCreateSchema;

export type BeritaInput = z.infer<typeof beritaCreateSchema>;
