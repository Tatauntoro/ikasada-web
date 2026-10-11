import { z } from "zod";
import { StatusKerjasama } from "@/generated/prisma/enums";
import { normalisasiInstagram, normalisasiTiktok } from "@/lib/normalisasi";

const statusValues = Object.values(StatusKerjasama) as [
  StatusKerjasama,
  ...StatusKerjasama[],
];

export const kerjasamaBaseSchema = z.object({
  organisasi: z
    .string({ message: "Nama organisasi wajib diisi" })
    .min(2, "Nama organisasi minimal 2 karakter")
    .max(150, "Nama organisasi maksimal 150 karakter"),
  programUtama: z
    .string({ message: "Program utama wajib diisi" })
    .min(2, "Program utama minimal 2 karakter")
    .max(200, "Program utama maksimal 200 karakter"),
  profil: z
    .string({ message: "Profil wajib diisi" })
    .min(10, "Profil minimal 10 karakter")
    .max(2000, "Profil maksimal 2000 karakter"),
  contohKegiatan: z
    .array(
      z
        .string()
        .trim()
        .min(3, "Contoh kegiatan minimal 3 karakter")
        .max(200, "Contoh kegiatan maksimal 200 karakter")
    )
    .min(1, "Minimal satu contoh kegiatan")
    .max(10, "Maksimal 10 contoh kegiatan"),
  imageUrl: z
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
  /*
   * Teks alternatif opsional: gambar sendiri opsional, jadi entri tanpa gambar
   * tetap harus bisa disimpan. Panjang tetap dibatasi.
   */
  alt: z
    .string()
    .max(200, "Teks alternatif maksimal 200 karakter")
    .optional()
    .nullable(),
  linkInstagram: z
    .string()
    .refine((val) => !val || normalisasiInstagram(val) !== null, {
      message: "Format Instagram tidak valid",
    })
    .optional()
    .nullable(),
  linkTiktok: z
    .string()
    .refine((val) => !val || normalisasiTiktok(val) !== null, {
      message: "Format TikTok tidak valid",
    })
    .optional()
    .nullable(),
  /*
   * Opsional; `.email()` tidak dipakai langsung karena menolak string kosong
   * yang dikirim form saat dibiarkan kosong.
   */
  email: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Format email tidak valid",
    }),
  urutan: z.coerce
    .number({ message: "Urutan wajib diisi" })
    .int("Urutan harus bilangan bulat")
    .min(0, "Urutan minimal 0")
    .max(999, "Urutan maksimal 999"),
  status: z.enum(statusValues, { message: "Status tidak valid" }),
});

export const kerjasamaCreateSchema = kerjasamaBaseSchema;

export const kerjasamaUpdateSchema = kerjasamaCreateSchema;

export type KerjasamaInput = z.infer<typeof kerjasamaCreateSchema>;
