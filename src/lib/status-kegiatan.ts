export type StatusKegiatan =
  | "AKAN_DATANG"
  | "SEDANG_BERLANGSUNG"
  | "SUDAH_BERLANGSUNG";

export function statusKegiatan(
  tanggalMulai: string | Date,
  tanggalSelesai: string | Date | null,
  sekarang = Date.now(),
): StatusKegiatan {
  const mulai = keTimestamp(tanggalMulai);
  if (sekarang < mulai) return "AKAN_DATANG";

  const selesai = tanggalSelesai
    ? keTimestamp(tanggalSelesai)
    : akhirHariWIB(mulai);
  return sekarang <= selesai ? "SEDANG_BERLANGSUNG" : "SUDAH_BERLANGSUNG";
}

function keTimestamp(value: string | Date) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function labelStatusKegiatan(status: StatusKegiatan) {
  switch (status) {
    case "AKAN_DATANG":
      return "Akan datang";
    case "SEDANG_BERLANGSUNG":
      return "Sedang berlangsung";
    case "SUDAH_BERLANGSUNG":
      return "Sudah berlangsung";
  }
}

function akhirHariWIB(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const tahun = parts.find((part) => part.type === "year")?.value;
  const bulan = parts.find((part) => part.type === "month")?.value;
  const hari = parts.find((part) => part.type === "day")?.value;
  return new Date(`${tahun}-${bulan}-${hari}T23:59:59.999+07:00`).getTime();
}
