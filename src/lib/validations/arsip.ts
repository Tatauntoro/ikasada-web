import { z } from "zod";
import {
  AksesArsip,
  JenisMedia,
  PenyimpananBerkas,
  StatusArsip,
} from "@/generated/prisma/enums";
import { MAX_MEDIA_PER_ARSIP } from "@/lib/batas-media";

const statusValues = Object.values(StatusArsip) as [
  StatusArsip,
  ...StatusArsip[],
];

const aksesValues = Object.values(AksesArsip) as [AksesArsip, ...AksesArsip[]];

const penyimpananValues = Object.values(PenyimpananBerkas) as [
  PenyimpananBerkas,
  ...PenyimpananBerkas[],
];

const jenisMediaValues = Object.values(JenisMedia) as [
  JenisMedia,
  ...JenisMedia[],
];

/** Satu foto/video galeri. Disimpan sebagai identitas berkas, bukan URL. */
export const mediaArsipSchema = z.object({
  jenis: z.enum(jenisMediaValues, { message: "Jenis media tidak valid" }),
  berkasId: z
    .string({ message: "Berkas media belum diunggah" })
    .min(1, "Berkas media belum diunggah")
    .max(255),
  penyimpanan: z.enum(penyimpananValues, { message: "Penyimpanan tidak valid" }),
  namaAsli: z.string().max(255).optional().nullable(),
  format: z.string().max(10).optional().nullable(),
  ukuran: z.coerce.number().int().min(0).optional().nullable(),
  caption: z.string().max(200, "Keterangan maksimal 200 karakter").optional().nullable(),
});

export type MediaArsipInput = z.infer<typeof mediaArsipSchema>;

export const arsipBaseSchema = z.object({
  judul: z
    .string({ message: "Judul wajib diisi" })
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  jenisArsipId: z
    .string({ message: "Jenis dokumen wajib dipilih" })
    .min(1, "Jenis dokumen wajib dipilih"),
  tanggalUpload: z.coerce.date({ message: "Tanggal upload wajib diisi" }),
  tanggalKegiatanMulai: z.coerce.date({
    message: "Tanggal kegiatan wajib diisi",
  }),
  tanggalKegiatanSelesai: z.coerce.date().optional().nullable(),
  deskripsiSingkat: z
    .string({ message: "Deskripsi singkat wajib diisi" })
    .min(10, "Deskripsi singkat minimal 10 karakter")
    .max(300, "Deskripsi singkat maksimal 300 karakter"),
  deskripsiLengkap: z
    .string()
    .max(5000, "Deskripsi lengkap maksimal 5000 karakter")
    .optional()
    .nullable(),
  gambarSampulUrl: z
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
  alt: z
    .string()
    .max(200, "Teks alternatif maksimal 200 karakter")
    .optional()
    .nullable(),
  /*
   * Metadata berkas diisi oleh endpoint upload (`/api/admin/upload/berkas`),
   * lalu diteruskan form sebagai bagian body simpan. Tidak ada URL di sini:
   * berkasnya hanya bisa keluar lewat `/api/arsip/[slug]/unduh`.
   */
  berkasId: z
    .string()
    .max(255, "ID berkas maksimal 255 karakter")
    .optional()
    .nullable(),
  berkasPenyimpanan: z
    .enum(penyimpananValues, { message: "Penyimpanan berkas tidak valid" })
    .optional()
    .nullable(),
  berkasNama: z
    .string()
    .max(255, "Nama berkas maksimal 255 karakter")
    .optional()
    .nullable(),
  berkasFormat: z
    .string()
    .max(10, "Format maksimal 10 karakter")
    .optional()
    .nullable(),
  berkasUkuran: z.coerce
    .number()
    .int("Ukuran berkas harus bilangan bulat")
    .min(0, "Ukuran berkas tidak valid")
    .optional()
    .nullable(),
  media: z
    .array(mediaArsipSchema)
    .max(
      MAX_MEDIA_PER_ARSIP,
      `Maksimal ${MAX_MEDIA_PER_ARSIP} media per arsip`
    )
    .optional(),
  status: z.enum(statusValues, { message: "Status tidak valid" }),
  /*
   * Siapa yang boleh melihat dan mengunduh entri ini. `status` tetap mengatur
   * terbit/belum; `akses` mengatur audiensnya.
   */
  akses: z.enum(aksesValues, { message: "Akses tidak valid" }),
});

export const arsipCreateSchema = arsipBaseSchema.superRefine((data, ctx) => {
  if (data.gambarSampulUrl && !data.alt?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["alt"],
      message: "Teks alternatif wajib diisi bila ada gambar sampul",
    });
  }

  if (data.berkasId && !data.berkasPenyimpanan) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["berkasPenyimpanan"],
      message: "Metadata penyimpanan berkas tidak lengkap",
    });
  }

  // Rentang kegiatan boleh satu hari (selesai kosong), tapi tidak boleh mundur.
  if (
    data.tanggalKegiatanSelesai &&
    data.tanggalKegiatanSelesai < data.tanggalKegiatanMulai
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tanggalKegiatanSelesai"],
      message: "Tanggal kegiatan selesai harus setelah tanggal mulai",
    });
  }

  /*
   * Arsip terbit wajib menyebut formatnya. Berkasnya sendiri boleh belum
   * diunggah (data lama memang begitu), asalkan formatnya jelas — halaman
   * detail akan menampilkan placeholder, bukan tombol unduh yang rusak.
   */
  if (data.status === "PUBLISHED" && !data.berkasFormat?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["berkasFormat"],
      message: "Format dokumen wajib diisi untuk status Published",
    });
  }
});

export const arsipUpdateSchema = arsipCreateSchema;

export type ArsipInput = z.infer<typeof arsipCreateSchema>;
