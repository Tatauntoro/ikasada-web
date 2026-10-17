import { z } from "zod";

/**
 * Validasi input Kelola Beranda (server).
 *
 * `judul`/`eyebrow`/`deskripsi` boleh `null` untuk mengosongkan (kembali ke
 * default tampilan), atau `undefined` untuk membiarkan apa adanya.
 */
const teksOpsional = (maks: number, pesan: string) =>
  z
    .string({ message: pesan })
    .trim()
    .max(maks, `Maksimal ${maks} karakter`)
    .nullable()
    .optional();

/**
 * Warna hex opsional untuk judul/eyebrow.
 *
 * Ketat ke bentuk hex (`#RGB`/`#RRGGBB`) karena nilainya dipakai langsung sebagai
 * inline `style` di beranda — bentuk bebas bisa menyelipkan CSS lain.
 */
const warnaOpsional = z
  .string({ message: "Warna tidak valid" })
  .trim()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "Format warna harus hex, mis. #f4c430"
  )
  .nullable()
  .optional();

/**
 * Ukuran relatif (persen) judul/eyebrow. `100`/`null` = ukuran bawaan; nilainya
 * dipakai sebagai pengali `font-size` di beranda (mis. `140` → 1,4×).
 */
const ukuranOpsional = z
  .coerce
  .number({ message: "Ukuran harus angka" })
  .int("Ukuran harus bilangan bulat")
  .min(50, "Ukuran minimal 50%")
  .max(200, "Ukuran maksimal 200%")
  .nullable()
  .optional();

export const sectionUpdateSchema = z
  .object({
    aktif: z.boolean({ message: "Penanda aktif harus boolean" }).optional(),
    urutan: z.coerce
      .number({ message: "Urutan harus angka" })
      .int("Urutan harus bilangan bulat")
      .min(0, "Urutan minimal 0")
      .max(999, "Urutan maksimal 999")
      .optional(),
    judul: teksOpsional(160, "Judul tidak valid"),
    eyebrow: teksOpsional(60, "Eyebrow tidak valid"),
    deskripsi: teksOpsional(500, "Deskripsi tidak valid"),
    warnaJudul: warnaOpsional,
    warnaEyebrow: warnaOpsional,
    ukuranJudul: ukuranOpsional,
    ukuranEyebrow: ukuranOpsional,
    /** Data khas section; bentuknya divalidasi per-kunci di route. */
    konfigurasi: z.unknown().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Tidak ada perubahan yang dikirim",
  });

/** Konfigurasi section "lima-cara": daftar poin (judul + deskripsi). */
export const limaCaraKonfigSchema = z.object({
  items: z
    .array(
      z.object({
        judul: z
          .string({ message: "Judul wajib diisi" })
          .trim()
          .min(1, "Judul wajib diisi")
          .max(120, "Judul maksimal 120 karakter"),
        deskripsi: z
          .string({ message: "Deskripsi tidak valid" })
          .trim()
          .max(400, "Deskripsi maksimal 400 karakter")
          .default(""),
      })
    )
    .max(10, "Maksimal 10 poin"),
});

/** Konfigurasi section "kontak": email kanal resmi (boleh dikosongkan). */
export const kontakKonfigSchema = z.object({
  email: z
    .string({ message: "Email tidak valid" })
    .trim()
    .max(160, "Email maksimal 160 karakter")
    .email("Format email tidak valid")
    .or(z.literal("")),
});

/** Konfigurasi section "sebaran-geografis": titik asal busur peta. */
export const sebaranKonfigSchema = z.object({
  asal: z.object({
    nama: z
      .string({ message: "Nama asal wajib diisi" })
      .trim()
      .min(1, "Nama asal wajib diisi")
      .max(120, "Nama asal maksimal 120 karakter"),
    lat: z.coerce
      .number({ message: "Latitude harus angka" })
      .min(-90, "Latitude minimal -90")
      .max(90, "Latitude maksimal 90"),
    lng: z.coerce
      .number({ message: "Longitude harus angka" })
      .min(-180, "Longitude minimal -180")
      .max(180, "Longitude maksimal 180"),
  }),
});

/** Skema konfigurasi untuk satu kunci section, atau `null` bila tidak ada. */
export function skemaKonfigurasi(kunci: string): z.ZodTypeAny | null {
  if (kunci === "lima-cara") return limaCaraKonfigSchema;
  if (kunci === "kontak") return kontakKonfigSchema;
  if (kunci === "sebaran-geografis") return sebaranKonfigSchema;
  return null;
}

export const titikSebaranSchema = z.object({
  nama: z
    .string({ message: "Nama wajib diisi" })
    .trim()
    .min(1, "Nama wajib diisi")
    .max(120, "Nama maksimal 120 karakter"),
  lat: z.coerce
    .number({ message: "Latitude harus angka" })
    .min(-90, "Latitude minimal -90")
    .max(90, "Latitude maksimal 90"),
  lng: z.coerce
    .number({ message: "Longitude harus angka" })
    .min(-180, "Longitude minimal -180")
    .max(180, "Longitude maksimal 180"),
  keterangan: teksOpsional(300, "Keterangan tidak valid"),
  urutan: z.coerce
    .number({ message: "Urutan harus angka" })
    .int("Urutan harus bilangan bulat")
    .min(0, "Urutan minimal 0")
    .max(999, "Urutan maksimal 999")
    .optional(),
  aktif: z.boolean({ message: "Penanda aktif harus boolean" }).optional(),
});

export const titikSebaranUpdateSchema = titikSebaranSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Tidak ada perubahan yang dikirim",
  });

export type SectionUpdateInput = z.infer<typeof sectionUpdateSchema>;
export type TitikSebaranInput = z.infer<typeof titikSebaranSchema>;
export type TitikSebaranUpdateInput = z.infer<typeof titikSebaranUpdateSchema>;
