"use client";

import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import {
  usePermintaanMasuk,
  type HitunganJejaringKlien,
} from "./PermintaanMasukProvider";

/**
 * Tautan diarahkan ke tab yang benar-benar memuat notifikasinya, supaya klik
 * dari navbar tidak mendarat di daftar kosong: permintaan masuk → tab "Permintaan
 * Masuk", jawaban diterima atau koneksi diputus → tab "Terhubung", jawaban
 * ditolak → tab "Terkirim".
 */
function tautanJejaring(hitungan: HitunganJejaringKlien): string {
  if (hitungan.belumDibaca > 0) return "/alumni/jejaring?tab=incoming";
  if (hitungan.belumDiterima > 0 || hitungan.belumDiputus > 0) {
    return "/alumni/jejaring?tab=accepted";
  }
  return "/alumni/jejaring?tab=outgoing";
}

const angkaTampil = (n: number) => (n > 99 ? "99+" : String(n));

/**
 * Penanda notifikasi jejaring: permintaan masuk yang belum dibaca **plus**
 * jawaban atas permintaan kita sendiri (diterima/ditolak) yang belum dilihat.
 * Tidak merender apa pun saat nol, supaya tidak menambah kebisingan visual.
 */
export function BadgePermintaanMasuk({
  variant = "pill",
  tone = "biru",
}: {
  variant?: "pill" | "overlay";
  /**
   * Warna pil. `putih` dipakai di atas header biru ruang alumni supaya angkanya
   * tetap terbaca; `biru` (bawaan) untuk latar terang seperti dropdown Navbar.
   */
  tone?: "biru" | "putih";
}) {
  const { total } = usePermintaanMasuk();

  if (total <= 0) return null;

  const angka = angkaTampil(total);

  if (variant === "overlay") {
    return (
      <span
        aria-hidden="true"
        className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#0071e3] px-1 text-[10px] font-bold leading-[18px] text-white"
      >
        {angka}
      </span>
    );
  }

  const warnaPil =
    tone === "putih" ? "bg-white text-[#0071e3]" : "bg-[#0071e3] text-white";

  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-[6px] text-[11px] font-medium leading-5 ${warnaPil}`}
    >
      {angka}
      <span className="sr-only"> notifikasi jejaring belum dibaca</span>
    </span>
  );
}

/**
 * Tombol menuju halaman jejaring. Muncul hanya saat ada notifikasi, jadi alumni
 * tanpa notifikasi tidak melihat elemen tambahan sama sekali.
 *
 * - `navbar` — tombol bulat di kluster kanan Navbar publik (ikon lonceng +
 *   angka overlay).
 * - `menu` — pil di dalam dropdown mobile (ikon lonceng + angka di sampingnya),
 *   karena di sana latarnya sudah solid dan bukan permukaan Augens.
 */
export function TombolPermintaanMasuk({
  variant = "navbar",
  onKlik,
}: {
  variant?: "navbar" | "menu";
  onKlik?: () => void;
}) {
  const { total, hitungan } = usePermintaanMasuk();

  if (total <= 0) return null;

  const label = `${total} notifikasi jejaring belum dibaca`;
  const tautan = tautanJejaring(hitungan);

  if (variant === "menu") {
    return (
      <Link
        href={tautan}
        onClick={onKlik}
        aria-label={label}
        title="Notifikasi jejaring"
        className="inline-flex min-h-11 flex-none items-center justify-center gap-2 rounded-[10px] border border-black/10 px-3 text-[#0f1012] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
      >
        <Bell weight="regular" className="text-[20px]" aria-hidden="true" />
        <BadgePermintaanMasuk variant="pill" />
      </Link>
    );
  }

  return (
    <Link
      href={tautan}
      aria-label={label}
      title="Notifikasi jejaring"
      className="augen-nav-surface pointer-events-auto relative grid h-11 w-11 place-items-center rounded-full text-[#0f1012] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
    >
      <Bell weight="regular" className="text-[18px]" aria-hidden="true" />
      <BadgePermintaanMasuk variant="overlay" />
    </Link>
  );
}
