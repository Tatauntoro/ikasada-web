/**
 * Penanda "Diubah" untuk field yang berbeda dari versi terverifikasi.
 *
 * Dipakai di form saat mode tinjau (`?tinjau=1`) supaya verifikator langsung
 * melihat bagian mana yang berubah sejak keputusan verifikasi terakhir. Konten
 * yang benar-benar baru tidak memakai penanda ini (cukup badge "Konten baru").
 */
export function ChipBerubah({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white ${className}`}
    >
      Diubah
    </span>
  );
}

/** Kelas kotak merah untuk membungkus satu field yang berubah (mode tinjau). */
export const KELAS_FIELD_BERUBAH =
  "rounded-2xl bg-red-50 p-3 ring-2 ring-red-400";
