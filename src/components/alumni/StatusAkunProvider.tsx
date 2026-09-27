"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { KODE_STATUS_AKUN, KODE_STATUS_TIDAK_DIKENAL } from "@/lib/status-akun";

/**
 * Pemberitahuan realtime perubahan status akun alumni.
 *
 * Dibuka untuk **semua akun yang login** (termasuk `PENDING`), karena pendaftar
 * yang menunggu verifikasi-lah yang butuh tahu begitu pengurus menyetujui.
 * Kanalnya `/api/alumni/status/stream`; yang dikirim hanya status si pemanggil.
 *
 * Saat status berubah dari keadaan sebelumnya:
 * - `router.refresh()` merender ulang halaman server (mis. `/alumni/status`),
 * - `SESI_BERUBAH_EVENT` memberi tahu Navbar agar memuat ulang `/me` (avatar &
 *   tautan profil PENDING → ACTIVE ikut berubah tanpa reload),
 * - banner muncul sebagai penanda yang terlihat.
 *
 * Frame **pertama** hanya jadi acuan, sehingga akun `ACTIVE` yang baru membuka
 * halaman tidak melihat banner "akun aktif" palsu.
 */

/** Beri tahu komponen lain (Navbar) bahwa sesi perlu dimuat ulang. */
export const SESI_BERUBAH_EVENT = "ikasada:sesi-berubah";

/** Jeda sebelum membangun ulang stream yang mati (bukan error jaringan biasa). */
const JEDA_COBA_ULANG_MS = 15_000;

type Pemberitahuan = {
  jenis: "aktif" | "nonaktif";
  teks: string;
  /** Halaman lanjutan; hanya untuk status aktif. */
  tautan?: string;
};

export function StatusAkunProvider({ aktif }: { aktif: boolean }) {
  const router = useRouter();
  const [pemberitahuan, setPemberitahuan] = useState<Pemberitahuan | null>(null);
  const [cobaUlang, setCobaUlang] = useState(0);

  useEffect(() => {
    if (!aktif) return;

    const sumber = new EventSource("/api/alumni/status/stream");
    let jadwal: number | undefined;
    /** `null` = belum ada acuan; frame pertama tidak memicu banner. */
    let kodeTerakhir: number | null = null;

    const terapkan = (pesan: Event) => {
      let kode: number | null = null;
      try {
        const data = JSON.parse((pesan as MessageEvent).data) as {
          statusKode?: unknown;
        };
        kode = typeof data.statusKode === "number" ? data.statusKode : null;
      } catch {
        // Frame tak dikenal — abaikan, koneksi tetap hidup.
        return;
      }
      if (kode === null) return;

      const sebelumnya = kodeTerakhir;
      kodeTerakhir = kode;

      if (sebelumnya === null || sebelumnya === kode) return;

      if (kode === KODE_STATUS_AKUN.ACTIVE) {
        setPemberitahuan({
          jenis: "aktif",
          teks: "Akun Anda sudah aktif. Anda kini bisa mengatur profil dan mulai terhubung dengan alumni lain.",
          tautan: "/alumni/profil",
        });
      } else if (kode === KODE_STATUS_AKUN.SUSPENDED) {
        setPemberitahuan({
          jenis: "nonaktif",
          teks: "Akun Anda sedang ditangguhkan. Hubungi pengurus IKASADA.",
        });
      } else if (kode === KODE_STATUS_TIDAK_DIKENAL) {
        setPemberitahuan({
          jenis: "nonaktif",
          teks: "Sesi akun Anda tidak lagi berlaku. Silakan masuk kembali.",
        });
      } else {
        setPemberitahuan({
          jenis: "nonaktif",
          teks: "Pendaftaran akun Anda tidak disetujui pengurus.",
        });
      }

      router.refresh();
      window.dispatchEvent(new Event(SESI_BERUBAH_EVENT));
    };

    const saatError = () => {
      /*
       * `CONNECTING` berarti browser menyambung ulang sendiri. `CLOSED`
       * (mis. 401 atau bukan `text/event-stream`) tidak, jadi dijadwalkan manual.
       */
      if (sumber.readyState === EventSource.CLOSED) {
        sumber.close();
        jadwal = window.setTimeout(
          () => setCobaUlang((n) => n + 1),
          JEDA_COBA_ULANG_MS
        );
      }
    };

    sumber.addEventListener("snapshot", terapkan);
    sumber.addEventListener("notifikasi", terapkan);
    sumber.addEventListener("error", saatError);

    return () => {
      window.clearTimeout(jadwal);
      sumber.removeEventListener("snapshot", terapkan);
      sumber.removeEventListener("notifikasi", terapkan);
      sumber.removeEventListener("error", saatError);
      sumber.close();
    };
  }, [aktif, cobaUlang, router]);

  if (!pemberitahuan) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-5 z-[70] mx-auto flex max-w-[440px] items-start gap-3 rounded-[18px] border border-black/[0.08] bg-[#fdfdfd] p-4 shadow-[0_18px_40px_-16px_rgba(15,16,18,0.28)]"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full ${
          pemberitahuan.jenis === "aktif"
            ? "bg-[#eef5ff] text-[#0071e3]"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {pemberitahuan.jenis === "aktif" ? (
          <CheckCircle weight="regular" />
        ) : (
          <WarningCircle weight="regular" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[1.45] tracking-[-0.02em] text-[#0f1012]">
          {pemberitahuan.teks}
        </p>
        {pemberitahuan.tautan && (
          <Link
            href={pemberitahuan.tautan}
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0071e3] hover:underline"
          >
            Buka profil
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPemberitahuan(null)}
        aria-label="Tutup notifikasi"
        className="grid h-8 w-8 flex-none place-items-center rounded-full text-[#8f8f8f] transition-colors hover:bg-black/[0.05] hover:text-[#0f1012] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
      >
        <X weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
