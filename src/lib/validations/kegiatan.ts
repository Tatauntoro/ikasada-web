import { z } from "zod";
import { StatusKegiatan } from "@/generated/prisma/enums";
import { isValidYoutubeUrl } from "@/lib/youtube";

const statusValues = Object.values(StatusKegiatan) as [
  StatusKegiatan,
  ...StatusKegiatan[]
];

export const kegiatanBaseSchema = z.object({
  judul: z
    .string({ message: "Judul wajib diisi" })
    .min(3, "Judul minimal 3 karakter")
    .max(150, "Judul maksimal 150 karakter"),
  deskripsiSingkat: z
    .string({ message: "Deskripsi singkat wajib diisi" })
    .max(300, "Deskripsi singkat maksimal 300 karakter"),
  deskripsiLengkap: z
    .string()
    .max(5000, "Deskripsi lengkap maksimal 5000 karakter")
    .optional()
    .nullable(),
  tanggalMulai: z.coerce.date({ message: "Tanggal mulai wajib diisi" }),
  tanggalSelesai: z.coerce.date().optional().nullable(),
  lokasi: z
    .string({ message: "Lokasi wajib diisi" })
    .max(200, "Lokasi maksimal 200 karakter"),
  kategori: z
    .string({ message: "Kategori wajib dipilih" })
    .min(1, "Kategori wajib dipilih"),
  videoYoutubeUrl: z
    .string()
    .url("URL tidak valid")
    .refine((val) => !val || isValidYoutubeUrl(val), {
      message: "URL YouTube tidak valid",
    })
    .optional()
    .nullable(),
  linkPendaftaran: z
    .string()
    .url("URL tidak valid")
    .optional()
    .nullable(),
  gambarThumbnailUrl: z
    .string()
    .refine(
      (val) =>
        !val ||
        val.startsWith("http://") ||
        val.startsWith("https://") ||
        val.startsWith("/uploads/"),
      { message: "URL thumbnail tidak valid" }
    )
    .optional()
    .nullable(),
  status: z.enum(statusValues, { message: "Status tidak valid" }),
});

export const kegiatanCreateSchema = kegiatanBaseSchema.superRefine(
  (data, ctx) => {
    if (
      data.tanggalSelesai &&
      data.tanggalMulai &&
      data.tanggalSelesai < data.tanggalMulai
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tanggalSelesai"],
        message: "Tanggal selesai harus setelah atau sama dengan tanggal mulai",
      });
    }

    if (data.status === "PUBLISHED" && !data.gambarThumbnailUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gambarThumbnailUrl"],
        message: "Thumbnail wajib diisi untuk status Published",
      });
    }
  }
);

export const kegiatanUpdateSchema = kegiatanCreateSchema;

export type KegiatanInput = z.infer<typeof kegiatanCreateSchema>;
