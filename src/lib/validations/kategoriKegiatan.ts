import { z } from "zod";

export const kategoriKegiatanSchema = z.object({
  namaKategori: z
    .string({ message: "Nama kategori wajib diisi" })
    .min(2, "Nama kategori minimal 2 karakter")
    .max(100, "Nama kategori maksimal 100 karakter"),
});

export type KategoriKegiatanInput = z.infer<typeof kategoriKegiatanSchema>;
