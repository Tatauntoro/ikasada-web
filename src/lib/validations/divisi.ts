import { z } from "zod";
import { izinField } from "@/lib/validations/admin";

/**
 * Validasi master data Divisi (Kelola Divisi di Portal Admin).
 *
 * `permissions` di sini adalah **template**: saat admin ditempatkan di divisi
 * ini, matriks izinnya diisi dari nilai ini (tetap bisa diubah per-admin).
 */
export const divisiCreateSchema = z.object({
  nama: z
    .string({ message: "Nama divisi wajib diisi" })
    .trim()
    .min(2, "Nama divisi minimal 2 karakter")
    .max(100, "Nama divisi maksimal 100 karakter"),
  urutan: z.coerce
    .number()
    .int("Urutan harus bilangan bulat")
    .min(0, "Urutan minimal 0")
    .max(999, "Urutan maksimal 999")
    .optional(),
  lintasDivisi: z.boolean({ message: "Penanda lintas divisi harus boolean" }).optional(),
  permissions: izinField.optional(),
});

export const divisiUpdateSchema = divisiCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Tidak ada perubahan yang dikirim",
  });

export type DivisiCreateInput = z.infer<typeof divisiCreateSchema>;
export type DivisiUpdateInput = z.infer<typeof divisiUpdateSchema>;
