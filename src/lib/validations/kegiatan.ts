import { z } from "zod";
import { StatusKegiatan } from "@/generated/prisma/enums";
import { isValidYoutubeUrl } from "@/lib/youtube";
import {
  MAX_MEDIA_PER_ENTRI,
  mediaSchema,
} from "@/lib/validations/media";

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
    .max(500, "Deskripsi singkat maksimal 500 karakter"),
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
  /*
   * URL YouTube opsional — string kosong dari form harus lolos. Karena itu
   * `.url()` tidak dipakai (`.url()` menolak ""); validasinya lewat refine yang
   * menerima nilai kosong.
   */
  videoYoutubeUrl: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || isValidYoutubeUrl(val), {
      message: "URL YouTube tidak valid",
    }),
  linkPendaftaran: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || /^https?:\/\//.test(val), {
      message: "URL tidak valid",
    }),
  gambarThumbnailUrl: z
    .string()
    .refine(
      (val) =>
        !val ||
        val.startsWith("http://") ||
        val.startsWith("https://") ||
        val.startsWith("/api/uploads/"),
      { message: "URL thumbnail tidak valid" }
    )
    .optional()
    .nullable(),
  media: z
    .array(mediaSchema)
    .max(
      MAX_MEDIA_PER_ENTRI,
      `Maksimal ${MAX_MEDIA_PER_ENTRI} media per kegiatan`
    )
    .optional(),
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
  }
);

export const kegiatanUpdateSchema = kegiatanCreateSchema;

export type KegiatanInput = z.infer<typeof kegiatanCreateSchema>;
