"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
/*
 * Modul ini juga mencatat pintu masuk dokumen saat ia dievaluasi, dan di sini
 * ia memberi tahu gerbang preloader setiap kali route berpindah. Karena
 * `ScrollToHash` ada di root layout, modul itu selalu ikut bundle awal setiap
 * route — bukan hanya saat chunk beranda kebetulan baru dimuat.
 */
import { catatRouteAktif } from "@/lib/preloader-gate";

const KUNCI_TUJUAN_GULIR = "ikasada:tujuan-gulir";

/*
 * Satu `scrollIntoView` saja tidak cukup: section di beranda memuat datanya
 * sendiri (statistik, direktori alumni), jadi tinggi dokumen masih bertambah
 * setelah guliran pertama. Kalau tidak dikoreksi, section tujuan ikut tergeser
 * turun dan tampilan mendarat di atasnya. Karena itu guliran pertama dibuat
 * halus, lalu posisinya diselaraskan ulang sebentar sampai tata letak tenang.
 */
const DURASI_PENYESUAIAN_MS = 2000;
const JEDA_PENYESUAIAN_MS = 100;
const TOLERANSI_PX = 12;

export function ScrollToHash() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tujuanPopstate = useRef<string | null>(null);

  useEffect(() => {
    const catatTujuanPopstate = () => {
      tujuanPopstate.current =
        window.location.pathname +
        window.location.search +
        window.location.hash;
    };

    window.addEventListener("popstate", catatTujuanPopstate);
    return () => window.removeEventListener("popstate", catatTujuanPopstate);
  }, []);

  useEffect(() => {
    // Beri tahu gerbang preloader bahwa route aktif sudah berpindah.
    catatRouteAktif(pathname);

    /*
     * Hanya mengurus tautan ber-hash.
     *
     * Dulu di sini ada cabang "tanpa hash" yang memaksa scroll ke `#hero` tiap
     * kali `pathname` berubah. Itu membuat tombol back/forward selalu mendarat
     * di puncak halaman. Sekarang: navigasi maju tanpa hash di-scroll ke atas
     * oleh Next sendiri, dan back/forward dipulihkan browser.
     *
     * Back/forward yang mendarat di hash ditangani di sini juga — selama itu
     * bukan pemulihan posisi yang sudah diurus `ScrollRestoration`.
     */
    const urlAktif =
      pathname + window.location.search + window.location.hash;
    if (tujuanPopstate.current) {
      const kembaliKeUrl = tujuanPopstate.current === urlAktif;
      tujuanPopstate.current = null;
      // Posisi saat back/forward ditangani ScrollRestoration; jangan mulai
      // gulir hash kedua yang akan bertabrakan dengan pemulihan tersebut.
      if (kembaliKeUrl) return;
    }

    let hash = window.location.hash.replace("#", "");
    let navigasiSectionInternal = false;
    if (!hash && pathname === "/") {
      try {
        hash = window.sessionStorage.getItem(KUNCI_TUJUAN_GULIR) ?? "";
        window.sessionStorage.removeItem(KUNCI_TUJUAN_GULIR);
        navigasiSectionInternal = Boolean(hash);
      } catch {
        // Tanpa storage, navigasi beranda tetap berjalan tanpa target section.
        delete document.documentElement.dataset.sectionNavigation;
      }
    }
    if (!hash) return;

    const mulai = performance.now();
    let frame = 0;
    let timer = 0;
    let dibatalkan = false;
    const hapusPenandaNavigasiSection = () => {
      if (navigasiSectionInternal) {
        delete document.documentElement.dataset.sectionNavigation;
      }
    };

    const lepas = () => {
      window.removeEventListener("wheel", batalkan);
      window.removeEventListener("touchstart", batalkan);
      window.removeEventListener("keydown", batalkan);
    };

    // Pengunjung sudah mengambil alih gulirnya; jangan ditimpa lagi.
    const batalkan = () => {
      dibatalkan = true;
      if (frame) cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
      lepas();
      hapusPenandaNavigasiSection();
    };

    window.addEventListener("wheel", batalkan, { passive: true });
    window.addEventListener("touchstart", batalkan, { passive: true });
    window.addEventListener("keydown", batalkan);

    frame = window.requestAnimationFrame(() => {
      if (dibatalkan) return;

      // Tujuan section internal dipasang instan supaya hero tidak terlihat
      // sebentar saat kembali dari halaman lain. Tautan hash biasa tetap halus.
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: navigasiSectionInternal ? "auto" : "smooth" });

      // Koreksi berikutnya instan, supaya pergeseran tata letak langsung
      // ditutup alih-alih memulai ulang animasi.
      const koreksi = () => {
        if (dibatalkan) return;

        const el = document.getElementById(hash);
        if (el && Math.abs(el.getBoundingClientRect().top) > TOLERANSI_PX) {
          el.scrollIntoView({ behavior: "auto" });
        }

        if (performance.now() - mulai < DURASI_PENYESUAIAN_MS) {
          timer = window.setTimeout(koreksi, JEDA_PENYESUAIAN_MS);
        } else {
          lepas();
          hapusPenandaNavigasiSection();
        }
      };

      timer = window.setTimeout(koreksi, JEDA_PENYESUAIAN_MS);
    });

    return () => {
      dibatalkan = true;
      if (frame) cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
      lepas();
      hapusPenandaNavigasiSection();
    };
  }, [pathname, searchParams]);

  return null;
}
