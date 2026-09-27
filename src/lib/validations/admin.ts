import { z } from "zod";
import { RoleAdmin } from "@/generated/prisma/enums";
import { AKSI_SLUGS } from "@/lib/permission";

/**
 * Validasi akun admin (Kelola Admin).
 *
 * Semua aturan adalah pengaman server; validasi klien hanya untuk UX.
 */

const roleValues = Object.values(RoleAdmin) as [RoleAdmin, ...RoleAdmin[]];

/** Batas bcrypt: karakter di atas 72 byte dipotong diam-diam, jadi ditolak saja. */
const PASSWORD_MAX = 72;

const kataSandiField = z
  .string({ message: "Kata sandi wajib diisi" })
  .min(8, "Kata sandi minimal 8 karakter")
  .max(PASSWORD_MAX, `Kata sandi maksimal ${PASSWORD_MAX} karakter`);

const emailField = z
  .string({ message: "Email wajib diisi" })
  .trim()
  .toLowerCase()
  .email("Format email tidak valid")
  .max(160, "Email maksimal 160 karakter");

const namaField = z
  .string({ message: "Nama wajib diisi" })
  .trim()
  .min(3, "Nama minimal 3 karakter")
  .max(120, "Nama maksimal 120 karakter");

/**
 * Izin: peta modul → daftar aksi. Kunci modul sengaja tidak dibatasi di sini
 * (Zod 4 `z.record` dengan enum menuntut semua key); `normalisasiIzin()` yang
 * membuang modul/aksi tak dikenal sebelum disimpan.
 */
const izinField = z.record(z.string(), z.array(z.enum(AKSI_SLUGS)));

export const adminCreateSchema = z.object({
  nama: namaField,
  email: emailField,
  password: kataSandiField,
});

export const adminUpdateSchema = z
  .object({
    nama: namaField.optional(),
    /** Email login admin — hanya superadmin yang boleh mengubah (route-nya superadmin-only). */
    email: emailField.optional(),
    role: z.enum(roleValues, { message: "Role tidak valid" }).optional(),
    isAktif: z.boolean({ message: "Status aktif harus boolean" }).optional(),
    permissions: izinField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Tidak ada perubahan yang dikirim",
  });

export const adminResetPasswordSchema = z.object({
  password: kataSandiField,
});

export type AdminCreateInput = z.infer<typeof adminCreateSchema>;
export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
