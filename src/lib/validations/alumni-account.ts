import { z } from "zod";
import { ProgramStudi } from "@/generated/prisma/enums";

/**
 * Validasi input akun alumni (BE-Planning §3.2, §3.3, §5).
 *
 * Semua aturan di sini adalah pengaman server; validasi di client hanya untuk UX.
 */

const programStudiValues = Object.values(ProgramStudi) as [
  ProgramStudi,
  ...ProgramStudi[],
];

const TAHUN_SEKARANG = new Date().getFullYear();

/** Batas bcrypt: karakter di atas 72 byte dipotong diam-diam, jadi ditolak saja. */
const PASSWORD_MAX = 72;

/** Aturan kata sandi dipakai bersama oleh register dan reset password admin. */
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

/**
 * Hanya menerima path internal. URL absolut, protocol-relative (`//host`),
 * dan backslash-slash ditolak dengan jatuh ke `fallback` (master planning §9).
 */
export function pathInternalAman(
  target: string | null | undefined,
  fallback = "/alumni"
): string {
  if (!target) return fallback;
  const trimmed = target.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  return trimmed;
}

export const alumniRegisterSchema = z.object({
  namaLengkap: z
    .string({ message: "Nama lengkap wajib diisi" })
    .trim()
    .min(3, "Nama lengkap minimal 3 karakter")
    .max(120, "Nama lengkap maksimal 120 karakter"),
  email: emailField,
  angkatan: z.coerce
    .number({ message: "Angkatan wajib diisi" })
    .int("Angkatan harus berupa bilangan bulat")
    .min(1960, "Angkatan minimal 1960")
    .max(TAHUN_SEKARANG, "Angkatan tidak boleh melebihi tahun berjalan"),
  programStudi: z.enum(programStudiValues, {
    message: "Program studi tidak valid",
  }),
  password: kataSandiField,
  consentData: z.literal(true, {
    message: "Persetujuan data diperlukan untuk mendaftar",
  }),
});

export const alumniLoginSchema = z.object({
  email: emailField,
  password: z.string({ message: "Kata sandi wajib diisi" }).min(1, "Kata sandi wajib diisi"),
  /** "Ingat saya" — memperpanjang sesi menjadi 30 hari (cookie persistent). */
  ingatSaya: z.boolean({ message: "Nilai ingat saya harus boolean" }).optional(),
  /** Opsional; hanya path internal yang dipakai, sisanya jatuh ke default. */
  next: z.string().optional(),
});

/** Admin mencocokkan akun pending dengan record `Alumni` yang sudah ada. */
export const alumniApproveSchema = z.object({
  alumniId: z
    .string({ message: "Alumni wajib dipilih" })
    .trim()
    .min(1, "Alumni wajib dipilih"),
  /**
   * Timpa `Alumni.email` dengan email akun pendaftar saat berbeda. Dipakai
   * pengurus ketika email direktori ternyata sudah tidak berlaku, supaya kontak
   * yang tampil di jejaring sama dengan email yang benar-benar dipakai login.
   */
  samakanEmail: z.boolean().optional(),
});

/**
 * Reset password manual oleh admin (fase 1, tanpa self-service).
 *
 * Kata sandi baru ditentukan admin dan **tidak** dikembalikan di response —
 * admin menyampaikannya lewat kanal resmi.
 */
export const alumniResetPasswordSchema = z.object({
  password: kataSandiField,
});

/**
 * Permintaan reset kata sandi mandiri dari halaman publik.
 *
 * Tanpa email provider (fase 1), permintaan ini hanya diteruskan ke pengurus
 * lewat notifikasi in-app. Respons server selalu generik supaya tidak bisa
 * dipakai menebak email terdaftar.
 */
export const alumniLupaPasswordSchema = z.object({
  email: emailField,
});

export type AlumniRegisterInput = z.infer<typeof alumniRegisterSchema>;
export type AlumniLoginInput = z.infer<typeof alumniLoginSchema>;
export type AlumniApproveInput = z.infer<typeof alumniApproveSchema>;
export type AlumniResetPasswordInput = z.infer<typeof alumniResetPasswordSchema>;
export type AlumniLupaPasswordInput = z.infer<typeof alumniLupaPasswordSchema>;

/**
 * Preferensi keterbukaan dan visibilitas kontak (BE-Planning §4.2).
 *
 * `strictObject` dipakai supaya field asing — termasuk `alumniId`, `email`,
 * `status`, dan `passwordHash` — ditolak `400`, bukan diabaikan diam-diam.
 * Semua field opsional karena PATCH parsial (UI mengirim satu switch sekaligus),
 * tetapi minimal satu field harus ada agar permintaan kosong tidak lolos.
 */
export const alumniPreferensiSchema = z
  .strictObject({
    openToCollaboration: z
      .boolean({ message: "Nilai keterbukaan kolaborasi harus boolean" })
      .optional(),
    openToOpportunity: z
      .boolean({ message: "Nilai keterbukaan kesempatan harus boolean" })
      .optional(),
    showEmailToConnections: z
      .boolean({ message: "Visibilitas email harus boolean" })
      .optional(),
    showWhatsappToConnections: z
      .boolean({ message: "Visibilitas WhatsApp harus boolean" })
      .optional(),
    showSocialLinksToConnections: z
      .boolean({ message: "Visibilitas tautan sosial harus boolean" })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Tidak ada preferensi yang dikirim",
  });

export type AlumniPreferensiInput = z.infer<typeof alumniPreferensiSchema>;
