"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { panggilApi } from "@/lib/api-client";
import { MODUL } from "@/lib/permission";
import { useIzin } from "./IzinProvider";

/**
 * Satu koneksi SSE per admin, dipakai bersama oleh lonceng dan halaman inbox.
 *
 * Menjaga `EventSource` tetap satu-satunya sumber angka `belumDibaca` membuat
 * badge di header dan daftar di inbox tidak pernah berbeda angka. `versi` naik
 * setiap ada notifikasi baru, dan halaman inbox memakainya sebagai pemicu
 * memuat ulang daftar.
 */

type StatusNotifikasi = "menghubungkan" | "tersambung" | "terputus";

type NilaiNotifikasi = {
  belumDibaca: number;
  versi: number;
  status: StatusNotifikasi;
  /** Tandai **semua** notifikasi sudah dibaca (satu penanda waktu). */
  tandaiDibaca: () => Promise<void>;
  /** Tandai **satu** notifikasi sudah dibaca. `true` bila server menerimanya. */
  tandaiSatuDibaca: (id: string) => Promise<boolean>;
};

const Konteks = createContext<NilaiNotifikasi | null>(null);

export function useNotifikasi(): NilaiNotifikasi {
  const nilai = useContext(Konteks);
  if (!nilai) {
    throw new Error("useNotifikasi harus dipakai di dalam NotifikasiProvider");
  }
  return nilai;
}

/** Jeda sebelum mencoba membangun ulang stream yang mati (bukan error jaringan biasa). */
const JEDA_COBA_ULANG_MS = 15_000;

export function NotifikasiProvider({ children }: { children: ReactNode }) {
  const { boleh } = useIzin();
  const bolehInbox = boleh(MODUL.INBOX, "lihat");

  const [belumDibaca, setBelumDibaca] = useState(0);
  const [versi, setVersi] = useState(0);
  const [status, setStatus] = useState<StatusNotifikasi>(() =>
    bolehInbox ? "menghubungkan" : "terputus"
  );
  const [cobaUlang, setCobaUlang] = useState(0);

  useEffect(() => {
    // Tanpa izin inbox, jangan buka SSE: server menolaknya (403) dan hanya
    // memicu percobaan ulang yang sia-sia.
    if (!bolehInbox) return;

    const sumber = new EventSource("/api/admin/notifikasi/stream");
    let jadwal: number | undefined;

    const terapkan = (pesan: MessageEvent) => {
      try {
        const data = JSON.parse(pesan.data) as { belumDibaca?: unknown };
        if (typeof data.belumDibaca === "number") {
          setBelumDibaca(data.belumDibaca);
        }
      } catch {
        // Frame tak dikenal — abaikan, koneksi tetap hidup.
      }
    };

    const saatSnapshot = (pesan: Event) => {
      setStatus("tersambung");
      terapkan(pesan as MessageEvent);
    };

    const saatNotifikasi = (pesan: Event) => {
      setStatus("tersambung");
      terapkan(pesan as MessageEvent);
      // Pemicu muat ulang daftar di halaman inbox.
      setVersi((n) => n + 1);
    };

    const saatTerbuka = () => setStatus("tersambung");

    const saatError = () => {
      setStatus("terputus");

      /*
       * `CONNECTING` berarti browser akan menyambung ulang sendiri (koneksi
       * putus biasa). `CLOSED` berarti kegagalan yang tidak dicoba ulang —
       * mis. respons 401 atau bukan `text/event-stream` — jadi kita jadwalkan
       * satu percobaan ulang, tanpa mengganggu admin dengan redirect paksa.
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
  }, [cobaUlang, bolehInbox]);

  const tandaiDibaca = useCallback(async () => {
    // Optimistis: badge langsung bersih, server menyusul. Angka dari server
    // tetap dipakai supaya badge tidak berbohong kalau ada notifikasi baru
    // yang masuk bersamaan.
    setBelumDibaca(0);

    const hasil = await panggilApi<{ belumDibaca: number }>(
      "/api/admin/notifikasi/read",
      { method: "POST" }
    );

    if (hasil.ok) setBelumDibaca(hasil.data.belumDibaca);
  }, []);

  const tandaiSatuDibaca = useCallback(async (id: string) => {
    const hasil = await panggilApi<{ read: number; belumDibaca: number }>(
      `/api/admin/notifikasi/${id}/read`,
      { method: "POST" }
    );

    if (!hasil.ok) return false;

    setBelumDibaca(hasil.data.belumDibaca);
    return true;
  }, []);

  return (
    <Konteks.Provider
      value={{ belumDibaca, versi, status, tandaiDibaca, tandaiSatuDibaca }}
    >
      {children}
    </Konteks.Provider>
  );
}
