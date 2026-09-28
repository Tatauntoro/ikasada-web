import { z } from "zod";
import {
  ProgramStudi,
  StatusAlumni,
} from "@/generated/prisma/enums";
import { normalisasiWhatsapp, normalisasiInstagram } from "@/lib/normalisasi";

const programStudiValues = Object.values(ProgramStudi) as [
  ProgramStudi,
  ...ProgramStudi[]
];
const statusValues = Object.values(StatusAlumni) as [
  StatusAlumni,
  ...StatusAlumni[]
];

function isValidUrlOrUploadPath(val: string | null | undefined): boolean {
  if (!val) return true;
  return (
    val.startsWith("http://") ||
    val.startsWith("https://") ||
    val.startsWith("/api/uploads/")
  );
}

export const alumniBaseSchema = z.object({
  namaLengkap: z
    .string({ message: "Nama lengkap wajib diisi" })
    .min(3, "Nama lengkap minimal 3 karakter")
    .max(120, "Nama lengkap maksimal 120 karakter"),
  gelar: z.string().max(100, "Gelar maksimal 100 karakter").optional().nullable(),
  fotoUrl: z
    .string()
    .refine(isValidUrlOrUploadPath, { message: "URL foto tidak valid" })
    .optional()
    .nullable(),
  angkatan: z.coerce
    .number({ message: "Angkatan wajib diisi" })
    .int("Angkatan harus berupa bilangan bulat")
    .min(1960, "Angkatan minimal 1960")
    .max(new Date().getFullYear(), "Angkatan tidak boleh melebihi tahun berjalan"),
  programStudi: z.enum(programStudiValues, {
    message: "Program studi tidak valid",
  }),
  profesi: z
    .string({ message: "Profesi wajib diisi" })
    .max(150, "Profesi maksimal 150 karakter"),
  instansi: z
    .string()
    .max(200, "Instansi maksimal 200 karakter")
    .optional()
    .nullable(),
  sektorIndustriId: z.string({ message: "Sektor industri wajib dipilih" }),
  /*
   * Form mengirim string kosong (bukan null) saat field dibiarkan kosong.
   * `z.string().email()` menolak "" dengan "Format email tidak valid", sehingga
   * ".optional()" tak pernah berlaku. Email direktori memang opsional (pengurus
   * mungkin belum tahu email alumni), jadi "" dinormalkan ke null lebih dulu.
   */
  email: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().email("Format email tidak valid").nullable().optional()
  ),
  noWhatsapp: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const normalized = normalisasiWhatsapp(val);
        return normalized !== null;
      },
      { message: "Format nomor WhatsApp tidak valid" }
    )
    .optional()
    .nullable(),
  linkInstagram: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        return normalisasiInstagram(val) !== null;
      },
      { message: "Format Instagram tidak valid" }
    )
    .optional()
    .nullable(),
  linkSosmedLain: z
    .array(
      z.object({
        platform: z.string().min(1, "Nama platform wajib diisi"),
        url: z.string().url("URL tidak valid"),
      })
    )
    .optional()
    .nullable(),
  status: z.enum(statusValues, { message: "Status tidak valid" }),
});

export const alumniCreateSchema = alumniBaseSchema;
export const alumniUpdateSchema = alumniCreateSchema;

export type AlumniInput = z.infer<typeof alumniCreateSchema>;
