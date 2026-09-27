import { z } from "zod";

/**
 * Validasi input koneksi (BE-Planning §4.4, §5).
 *
 * `strictObject` dipakai supaya identitas tidak bisa dititipkan dari client:
 * `requesterAccountId`, `accountId`, atau `status` ditolak `400`. Pengirim
 * selalu diambil dari session.
 */
export const MESSAGE_MAX = 300;

export const connectionCreateSchema = z.strictObject({
  recipientAlumniId: z
    .string({ message: "Alumni tujuan wajib diisi" })
    .trim()
    .min(1, "Alumni tujuan wajib diisi"),
  message: z
    .string({ message: "Pesan harus berupa teks" })
    .trim()
    .max(MESSAGE_MAX, `Pesan maksimal ${MESSAGE_MAX} karakter`)
    .optional(),
});

export type ConnectionCreateInput = z.infer<typeof connectionCreateSchema>;
