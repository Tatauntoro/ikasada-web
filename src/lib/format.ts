export function formatTanggalWIB(
  value: string | Date | null | undefined
): string {
  if (!value) return "-";

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getInitials(nama: string): string {
  return nama
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Periode kegiatan sebuah arsip.
 *
 * Rentang lintas tahun dibaca sebagai tahun saja ("2019–2023") karena itu yang
 * paling masuk akal untuk kumpulan kegiatan; dalam tahun yang sama, tanggalnya
 * ditulis lengkap. Satu hari → satu tanggal.
 */
export function formatPeriodeKegiatan(
  mulai: string | Date | null | undefined,
  selesai?: string | Date | null
): string {
  if (!mulai) return "-";

  const awal = typeof mulai === "string" ? new Date(mulai) : mulai;
  const akhir = selesai
    ? typeof selesai === "string"
      ? new Date(selesai)
      : selesai
    : awal;

  if (Number.isNaN(awal.getTime()) || Number.isNaN(akhir.getTime())) return "-";

  const tahunAwal = awal.getUTCFullYear();
  const tahunAkhir = akhir.getUTCFullYear();

  if (tahunAwal !== tahunAkhir) return `${tahunAwal}–${tahunAkhir}`;

  const teksAwal = formatTanggalWIB(awal);
  const teksAkhir = formatTanggalWIB(akhir);

  return teksAwal === teksAkhir ? teksAwal : `${teksAwal} – ${teksAkhir}`;
}

/** Ukuran berkas dalam satuan yang enak dibaca, mis. "1,4 MB". */
export function formatUkuranBerkas(byte: number | null | undefined): string {
  if (byte === null || byte === undefined || byte < 0) return "-";
  if (byte < 1024) return `${byte} B`;

  const kb = byte / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;

  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}
