import { z } from "zod";

export const sektorIndustriSchema = z.object({
  namaSektor: z
    .string({ message: "Nama sektor wajib diisi" })
    .min(2, "Nama sektor minimal 2 karakter")
    .max(100, "Nama sektor maksimal 100 karakter"),
});

export type SektorIndustriInput = z.infer<typeof sektorIndustriSchema>;
