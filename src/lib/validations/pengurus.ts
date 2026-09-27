import { z } from "zod";

function isValidUrlOrUploadPath(val: string | null | undefined): boolean {
  if (!val) return true;
  return (
    val.startsWith("http://") ||
    val.startsWith("https://") ||
    val.startsWith("/uploads/")
  );
}

export const pengurusSchema = z.object({
  nama: z
    .string({ message: "Nama wajib diisi" })
    .min(3, "Nama minimal 3 karakter")
    .max(120, "Nama maksimal 120 karakter"),
  jabatan: z
    .string({ message: "Jabatan wajib diisi" })
    .min(2, "Jabatan minimal 2 karakter")
    .max(150, "Jabatan maksimal 150 karakter"),
  angkatan: z
    .string()
    .max(100, "Angkatan maksimal 100 karakter")
    .optional()
    .nullable(),
  ket: z
    .string()
    .max(200, "Keterangan maksimal 200 karakter")
    .optional()
    .nullable(),
  fotoUrl: z
    .string()
    .refine(isValidUrlOrUploadPath, { message: "URL foto tidak valid" })
    .optional()
    .nullable(),
  urutan: z.coerce
    .number({ message: "Urutan harus berupa angka" })
    .int("Urutan harus bilangan bulat")
    .default(0),
});

export const pengurusCreateSchema = pengurusSchema;
export const pengurusUpdateSchema = pengurusSchema;

export type PengurusInput = z.infer<typeof pengurusCreateSchema>;
