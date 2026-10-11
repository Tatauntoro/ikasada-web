import { z } from "zod";

/**
 * Aksi verifikasi konten.
 *
 * `ajukan` dilakukan divisi pemilik konten; `verifikasi`/`tolak` dilakukan
 * verifikator (mis. Ketua Umum). `catatan` dipakai untuk alasan penolakan.
 */
export const verifikasiAksiSchema = z.object({
  aksi: z.enum(["ajukan", "verifikasi", "tolak"], {
    message: "Aksi verifikasi tidak valid",
  }),
  catatan: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .nullable(),
});

export type VerifikasiAksiInput = z.infer<typeof verifikasiAksiSchema>;
