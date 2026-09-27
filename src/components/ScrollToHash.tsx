"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
/*
 * Modul ini juga mencatat pintu masuk dokumen saat ia dievaluasi, dan di sini
 * ia memberi tahu gerbang preloader setiap kali route berpindah. Karena
 * `ScrollToHash` ada di root layout, modul itu selalu ikut bundle awal setiap
 * route — bukan hanya saat chunk beranda kebetulan baru dimuat.
 */
import { catatRouteAktif } from "@/lib/preloader-gate";

export function ScrollToHash() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
     */
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    // Delay sedikit agar elemen tujuan sudah ter-render (terutama setelah navigasi)
    const timer = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
