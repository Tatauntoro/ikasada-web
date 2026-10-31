"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pulihkanGulir, catatJangkarGulir, tujuanGulirTersimpan } from "@/lib/scroll-return";

/**
 * Memulihkan posisi gulir saat tombol back/forward browser ditekan.
 *
 * Tanpa ini, kembali ke beranda selalu mendarat di puncak. Next 16 (App Router)
 * tidak mengelola pemulihan posisi sama sekali — yang tersisa hanya pemulihan
 * bawaan browser, dan itu kalah cepat oleh render ulang route: dokumen sempat
 * menyusut sebelum kontennya tersusun, sehingga posisi yang dipulihkan
 * terpotong ke atas.
 *
 * Posisinya dicatat per alamat halaman di `sessionStorage`, lalu dipasang
 * kembali ke elemen dan offset tersimpan ketika layout siap.
 */

const KUNCI_SIMPAN = "ikasada:posisi-gulir";
const KUNCI_RUTE_AKTIF = "ikasada:rute-aktif";
const KUNCI_RUTE_SEBELUMNYA = "ikasada:rute-sebelumnya";
const DURASI_PEMULIHAN_MS = 1200;


type PetaPosisi = Record<string, number>;

/*
 * Dicatat per alamat, bukan per entri riwayat: state riwayat Next tidak
 * menyimpan kunci per entri (`history.state` cuma berisi pohon internalnya).
 */
function kunciHalaman(): string {
  return (
    window.location.pathname + window.location.search + window.location.hash
  );
}

function bacaPeta(): PetaPosisi {
  try {
    const mentah = window.sessionStorage.getItem(KUNCI_SIMPAN);
    return mentah ? (JSON.parse(mentah) as PetaPosisi) : {};
  } catch {
    return {};
  }
}

/** `reload`/`navigate` pada pemuatan pertama, `back_forward` saat kembali. */
function kembaliDariRiwayat(): boolean {
  const entri = window.performance?.getEntriesByType?.("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return entri?.type === "back_forward";
}

export default function ScrollRestoration() {
  const pathname = usePathname();
  const firstPath = useRef(true);

  useEffect(() => {
    if (!pathname) return;

    try {
      const ruteAktif = window.sessionStorage.getItem(KUNCI_RUTE_AKTIF);
      const tipeNavigasi = (
        window.performance?.getEntriesByType?.("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined
      )?.type;

      if (firstPath.current) {
        firstPath.current = false;

        if (tipeNavigasi === "reload" && ruteAktif === pathname) return;

        const perujuk = document.referrer ? new URL(document.referrer) : null;
        if (perujuk?.origin === window.location.origin) {
          window.sessionStorage.setItem(
            KUNCI_RUTE_SEBELUMNYA,
            perujuk.pathname
          );
        } else {
          window.sessionStorage.removeItem(KUNCI_RUTE_SEBELUMNYA);
        }

        window.sessionStorage.setItem(KUNCI_RUTE_AKTIF, pathname);
        return;
      }

      if (ruteAktif !== pathname) {
        if (ruteAktif) {
          window.sessionStorage.setItem(KUNCI_RUTE_SEBELUMNYA, ruteAktif);
        }
        window.sessionStorage.setItem(KUNCI_RUTE_AKTIF, pathname);
      }
    } catch {
      // Penyimpanan diblokir: tombol Kembali akan memakai rute cadangan.
    }
  }, [pathname]);

  useEffect(() => {
    const peta = bacaPeta();
    const scrollRestorationAsal = window.history.scrollRestoration;
    let memulihkan = false;
    let frame = 0;
    let hentikanAnimasi: (() => void) | undefined;
    let markerTimer = 0;

    // Kita punya pemulihan sendiri; matikan pemulihan browser agar keduanya
    // tidak menggeser halaman ke posisi berbeda pada entri yang sama.
    window.history.scrollRestoration = "manual";

    const hapusPenandaPemulihan = () => {
      delete document.documentElement.dataset.historyRestoring;
      delete document.documentElement.dataset.historyHideHero;
    };

    const simpan = () => {
      // Selama pemulihan, geseran yang tercatat adalah geseran kita sendiri.
      if (memulihkan || document.documentElement.dataset.historyRestoring === "true") return;
      catatJangkarGulir(kunciHalaman());
      peta[kunciHalaman()] = window.scrollY;
      try {
        window.sessionStorage.setItem(KUNCI_SIMPAN, JSON.stringify(peta));
      } catch {
        /* Penyimpanan penuh atau diblokir: pemulihan cukup dilewati. */
      }
    };

    const jadwalkanSimpan = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        simpan();
      });
    };

    const pulihkan = () => {
      hentikanAnimasi?.();
      memulihkan = false;
      if (markerTimer) window.clearTimeout(markerTimer);
      document.documentElement.dataset.historyRestoring = "true";

      const tujuan = peta[kunciHalaman()];
      if (typeof tujuan !== "number") {
        markerTimer = window.setTimeout(
          hapusPenandaPemulihan,
          DURASI_PEMULIHAN_MS
        );
        return;
      }

      memulihkan = true;
      hentikanAnimasi = pulihkanGulir(tujuanGulirTersimpan(kunciHalaman(), tujuan), () => {
        memulihkan = false;
        hapusPenandaPemulihan();
      });
    };

    const batal = () => {
      // Pengunjung sudah mengambil alih gulirnya; jangan ditimpa lagi.
      memulihkan = false;
      hentikanAnimasi?.();
      if (markerTimer) window.clearTimeout(markerTimer);
      markerTimer = 0;
      hapusPenandaPemulihan();
    };

    window.addEventListener("scroll", jadwalkanSimpan, { passive: true });
    window.addEventListener("pagehide", simpan);
    document.addEventListener("click", simpan, true);
    window.addEventListener("popstate", pulihkan);
    window.addEventListener("wheel", batal, { passive: true });
    window.addEventListener("touchstart", batal, { passive: true });
    window.addEventListener("keydown", batal);

    /*
     * Back/forward yang memuat ulang dokumen (bukan dari bfcache) tetap harus
     * mendarat di posisi terakhir, bukan di puncak.
     */
    if (kembaliDariRiwayat()) pulihkan();

    return () => {
      window.removeEventListener("scroll", jadwalkanSimpan);
      window.removeEventListener("pagehide", simpan);
      document.removeEventListener("click", simpan, true);
      window.removeEventListener("popstate", pulihkan);
      window.removeEventListener("wheel", batal);
      window.removeEventListener("touchstart", batal);
      window.removeEventListener("keydown", batal);
      if (frame) window.cancelAnimationFrame(frame);
      hentikanAnimasi?.();
      if (markerTimer) window.clearTimeout(markerTimer);
      hapusPenandaPemulihan();
      window.history.scrollRestoration = scrollRestorationAsal;
    };
  }, []);

  return null;
}
