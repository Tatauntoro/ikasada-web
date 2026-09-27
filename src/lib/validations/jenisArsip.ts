import { z } from "zod";

export const jenisArsipSchema = z.object({
  nama: z
    .string({ message: "Nama jenis wajib diisi" })
    .min(2, "Nama jenis minimal 2 karakter")
    .max(50, "Nama jenis maksimal 50 karakter"),
});

export type JenisArsipInput = z.infer<typeof jenisArsipSchema>;
