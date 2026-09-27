"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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
 * kembali setelah route hasil back/forward selesai dirender. Pencobaannya
 * diulang sebentar karena tinggi dokumen masih berubah selama data section
 * (statistik, direktori alumni) menyusul.
 */

const KUNCI_SIMPAN = "ikasada:posisi-gulir";
const KUNCI_RUTE_AKTIF = "ikasada:rute-aktif";
const KUNCI_RUTE_SEBELUMNYA = "ikasada:rute-sebelumnya";
const DURASI_PEMULIHAN_MS = 1200;
const JEDA_PERCOBAAN_MS = 100;

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
    let memulihkan = false;
    let frame = 0;
    let timers: number[] = [];

    const simpan = () => {
      // Selama pemulihan, geseran yang tercatat adalah geseran kita sendiri.
      if (memulihkan) return;
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
      const tujuan = peta[kunciHalaman()];
      if (typeof tujuan !== "number") return;

      memulihkan = true;
      const batas = window.performance.now() + DURASI_PEMULIHAN_MS;

      const coba = () => {
        if (Math.abs(window.scrollY - tujuan) > 1) window.scrollTo(0, tujuan);
        if (window.performance.now() < batas) {
          timers.push(window.setTimeout(coba, JEDA_PERCOBAAN_MS));
        } else {
          memulihkan = false;
        }
      };
      coba();
    };

    const batal = () => {
      // Pengunjung sudah mengambil alih gulirnya; jangan ditimpa lagi.
      memulihkan = false;
      timers.forEach(window.clearTimeout);
      timers = [];
    };

    window.addEventListener("scroll", jadwalkanSimpan, { passive: true });
    window.addEventListener("pagehide", simpan);
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
      window.removeEventListener("popstate", pulihkan);
      window.removeEventListener("wheel", batal);
      window.removeEventListener("touchstart", batal);
      window.removeEventListener("keydown", batal);
      if (frame) window.cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return null;
}
