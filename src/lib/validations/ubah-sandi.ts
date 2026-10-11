import { z } from "zod";

/**
 * Ganti kata sandi mandiri (admin & alumni).
 *
 * Dipakai dua endpoint: `/api/auth/change-password` (admin) dan
 * `/api/auth/alumni/change-password` (alumni). Server hanya butuh kata sandi
 * lama (untuk diverifikasi) dan kata sandi baru (untuk disimpan); kolom
 * `konfirmasi` cukup divalidasi di klien.
 */

/** Batas bcrypt: karakter di atas 72 byte dipotong diam-diam, jadi ditolak saja. */
const PASSWORD_MAX = 72;

const sandiLamaField = z
  .string({ message: "Kata sandi lama wajib diisi" })
  .min(1, "Kata sandi lama wajib diisi")
  .max(PASSWORD_MAX, `Kata sandi maksimal ${PASSWORD_MAX} karakter`);

const sandiBaruField = z
  .string({ message: "Kata sandi baru wajib diisi" })
  .min(8, "Kata sandi baru minimal 8 karakter")
  .max(PASSWORD_MAX, `Kata sandi maksimal ${PASSWORD_MAX} karakter`);

export const ubahSandiSchema = z
  .object({
    sandiLama: sandiLamaField,
    sandiBaru: sandiBaruField,
  })
  .refine((data) => data.sandiLama !== data.sandiBaru, {
    message: "Kata sandi baru harus berbeda dari kata sandi lama",
    path: ["sandiBaru"],
  });

export type UbahSandiInput = z.infer<typeof ubahSandiSchema>;
