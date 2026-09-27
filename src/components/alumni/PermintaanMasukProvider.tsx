"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Angka notifikasi jejaring alumni secara realtime.
 *
 * Ada tiga kelompok, dan ketiganya datang dari satu kanal SSE
 * (`/api/alumni/connections/stream`) supaya badge tidak pernah berbeda angka
 * dengan halaman jejaring:
 * - `belumDibaca`   — permintaan masuk yang belum dibuka penerima;
 * - `belumDiterima` — permintaan yang **kita** kirim lalu diterima, belum dilihat;
 * - `belumDitolak`  — permintaan yang kita kirim lalu ditolak, belum dilihat;
 * - `belumDiputus`  — koneksi kita yang diputus pihak lain, belum kita lihat.
 *
 * Provider ini di-mount di dua tempat karena tidak ada `src/app/alumni/layout.tsx`:
 * di `Navbar` (beranda publik) dan di `RuangAlumni` (shell privat). Hanya satu
 * yang hidup per halaman.
 *
 * `aktif` wajib: pengunjung anonim dan akun `PENDING` tidak boleh membuka
 * koneksi yang pasti ditolak `401`. Akun `PENDING` juga memang tidak bisa
 * menerima permintaan koneksi.
 */

type StatusPermintaan = "menghubungkan" | "tersambung" | "terputus";

export type HitunganJejaringKlien = {
  belumDibaca: number;
  belumDiterima: number;
  belumDitolak: number;
  belumDiputus: number;
};

const HITUNGAN_NOL: HitunganJejaringKlien = {
  belumDibaca: 0,
  belumDiterima: 0,
  belumDitolak: 0,
  belumDiputus: 0,
};

type NilaiPermintaanMasuk = {
  /** Rincian per kelompok; halaman jejaring memakainya untuk angka di tab. */
  hitungan: HitunganJejaringKlien;
  /** Jumlah ketiganya — angka yang ditampilkan badge menu. */
  total: number;
  status: StatusPermintaan;
};

const Konteks = createContext<NilaiPermintaanMasuk | null>(null);

export function usePermintaanMasuk(): NilaiPermintaanMasuk {
  const nilai = useContext(Konteks);
  if (!nilai) {
    throw new Error(
      "usePermintaanMasuk harus dipakai di dalam PermintaanMasukProvider"
    );
  }
  return nilai;
}

/**
 * Sinyal "kelompok notifikasi ini sudah dibuka" dari halaman jejaring.
 *
 * Membawa hitungan terbaru dari server supaya badge di menu shell ikut bersih
 * seketika — tanpa POST kedua dan tanpa memasukkan halaman itu ke dalam context
 * provider. Hitungan dikirim utuh (bukan hanya dinolkan) karena membuka satu tab
 * hanya menghapus kelompoknya sendiri.
 */
export const PERMINTAAN_DIBACA_EVENT = "ikasada:permintaan-dibaca";

export function beritahuPermintaanDibaca(
  hitungan: HitunganJejaringKlien
): void {
  window.dispatchEvent(
    new CustomEvent<HitunganJejaringKlien>(PERMINTAAN_DIBACA_EVENT, {
      detail: hitungan,
    })
  );
}

/** Jeda sebelum membangun ulang stream yang mati (bukan error jaringan biasa). */
const JEDA_COBA_ULANG_MS = 15_000;

export function PermintaanMasukProvider({
  aktif,
  children,
}: {
  aktif: boolean;
  children: ReactNode;
}) {
  const [hitungan, setHitungan] = useState<HitunganJejaringKlien>(HITUNGAN_NOL);
  const [status, setStatus] = useState<StatusPermintaan>("menghubungkan");
  const [cobaUlang, setCobaUlang] = useState(0);

  useEffect(() => {
    if (!aktif) return;

    const sumber = new EventSource("/api/alumni/connections/stream");
    let jadwal: number | undefined;

    const terapkan = (pesan: Event) => {
      try {
        const data = JSON.parse((pesan as MessageEvent).data) as {
          unread?: unknown;
          unreadDiterima?: unknown;
          unreadDitolak?: unknown;
          unreadDiputus?: unknown;
        };

        setHitungan({
          belumDibaca: angka(data.unread),
          belumDiterima: angka(data.unreadDiterima),
          belumDitolak: angka(data.unreadDitolak),
          belumDiputus: angka(data.unreadDiputus),
        });
      } catch {
        // Frame tak dikenal — abaikan, koneksi tetap hidup.
      }
    };

    const saatSnapshot = (pesan: Event) => {
      setStatus("tersambung");
      terapkan(pesan);
    };
    const saatNotifikasi = (pesan: Event) => {
      setStatus("tersambung");
      terapkan(pesan);
    };
    const saatTerbuka = () => setStatus("tersambung");

    const saatError = () => {
      setStatus("terputus");

      /*
       * `CONNECTING` berarti browser akan menyambung ulang sendiri. `CLOSED`
       * (mis. 401 atau bukan `text/event-stream`) tidak dicoba ulang browser,
       * jadi kita jadwalkan satu percobaan tanpa redirect paksa.
       */
      if (sumber.readyState === EventSource.CLOSED) {
        sumber.close();
        jadwal = window.setTimeout(
          () => setCobaUlang((n) => n + 1),
          JEDA_COBA_ULANG_MS
        );
      }
    };

    sumber.addEventListener("snapshot", saatSnapshot);
    sumber.addEventListener("notifikasi", saatNotifikasi);
    sumber.addEventListener("open", saatTerbuka);
    sumber.addEventListener("error", saatError);

    return () => {
      window.clearTimeout(jadwal);
      sumber.removeEventListener("snapshot", saatSnapshot);
      sumber.removeEventListener("notifikasi", saatNotifikasi);
      sumber.removeEventListener("open", saatTerbuka);
      sumber.removeEventListener("error", saatError);
      sumber.close();
    };
  }, [aktif, cobaUlang]);

  useEffect(() => {
    const tangani = (peristiwa: Event) => {
      const detail = (peristiwa as CustomEvent<HitunganJejaringKlien>).detail;
      if (detail) setHitungan(detail);
    };

    window.addEventListener(PERMINTAAN_DIBACA_EVENT, tangani);
    return () => window.removeEventListener(PERMINTAAN_DIBACA_EVENT, tangani);
  }, []);

  return (
    <Konteks.Provider
      value={{
        hitungan,
        total:
          hitungan.belumDibaca +
          hitungan.belumDiterima +
          hitungan.belumDitolak +
          hitungan.belumDiputus,
        status,
      }}
    >
      {children}
    </Konteks.Provider>
  );
}

/** Nilai tak dikenal dianggap nol, supaya badge tidak pernah menampilkan NaN. */
function angka(nilai: unknown): number {
  return typeof nilai === "number" && Number.isFinite(nilai) ? nilai : 0;
}
