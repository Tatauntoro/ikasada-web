"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { catatRouteAktif } from "@/lib/preloader-gate";
import { KUNCI_PEMULIHAN_GULIR, pulihkanGulir, tujuanGulirTersimpan } from "@/lib/scroll-return";

const KUNCI_TUJUAN_GULIR = "ikasada:tujuan-gulir";
export function ScrollToHash() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tujuanPopstate = useRef<string | null>(null);

  useEffect(() => {
    const catatTujuanPopstate = () => {
      tujuanPopstate.current =
        window.location.pathname + window.location.search + window.location.hash;
    };
    window.addEventListener("popstate", catatTujuanPopstate);
    return () => window.removeEventListener("popstate", catatTujuanPopstate);
  }, []);

  useEffect(() => {
    catatRouteAktif(pathname);

    const urlAktif = pathname + window.location.search + window.location.hash;
    if (tujuanPopstate.current) {
      const kembaliKeUrl = tujuanPopstate.current === urlAktif;
      tujuanPopstate.current = null;
      // Back/forward dipulihkan oleh ScrollRestoration.
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
        delete document.documentElement.dataset.sectionNavigation;
      }
    }
    let posisiTersimpan: number | null = null;
    try {
      const mentah = sessionStorage.getItem(KUNCI_PEMULIHAN_GULIR);
      sessionStorage.removeItem(KUNCI_PEMULIHAN_GULIR);
      if (mentah !== null && Number.isFinite(Number(mentah))) posisiTersimpan = Number(mentah);
    } catch { /* Navigasi section tetap tersedia tanpa storage. */ }
    if (!hash && posisiTersimpan === null) return;

    if (navigasiSectionInternal || posisiTersimpan !== null) {
      if (posisiTersimpan !== null) {
        return pulihkanGulir(tujuanGulirTersimpan(pathname + location.search, posisiTersimpan));
      }
      return pulihkanGulir(() => {
        const target = document.getElementById(hash);
        return target ? target.getBoundingClientRect().top + scrollY : null;
      });
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  return null;
}
