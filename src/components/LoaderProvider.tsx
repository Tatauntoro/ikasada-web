"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { preloaderAktif } from "@/lib/preloader-gate";

type ProgressRef = { current: number };

type LoaderContextValue = {
  /** Handover flag: true once the veil has lifted and the page may animate in. */
  ready: boolean;
  /**
   * Apakah intro (veil + reveal hero + entrance navbar) memang harus main di
   * mount ini. `false` saat beranda dibuka lewat navigasi client-side — lihat
   * `@/lib/preloader-gate`. Dipakai konsumen untuk menampilkan keadaan akhir
   * tanpa animasi.
   */
  introAktif: boolean;
  /** True once fonts, the window load event and every registered task settled. */
  assetsReady: boolean;
  /** Live 0–1 progress, updated without re-rendering the provider. */
  progressRef: ProgressRef;
  registerTask: (task: Promise<unknown>) => void;
  setReady: (ready: boolean) => void;
};

const LoaderContext = createContext<LoaderContextValue>({
  ready: false,
  introAktif: true,
  assetsReady: false,
  progressRef: { current: 0 },
  registerTask: () => {},
  setReady: () => {},
});

const CREEP_TARGET = 0.7;
const CREEP_RATE = 0.022;
const SETTLE_RATE = 0.16;
const READY_TIMEOUT_MS = 6000;

export function LoaderProvider({ children }: { children: ReactNode }) {
  /*
   * Gerbang intro diputuskan SEKALI saat mount. Saat beranda dibuka lewat
   * navigasi client-side, `preloaderAktif()` sudah `false` — jadi `ready`
   * langsung `true` dan tidak ada tepi `false -> true` yang memicu ulang reveal
   * hero maupun entrance navbar. Saat pemuatan dokumen/refresh, nilainya `true`
   * sehingga alur veil + reveal berjalan persis seperti sebelumnya.
   */
  const [introAktif] = useState(() => preloaderAktif());
  const [ready, setReadyState] = useState(!introAktif);
  const [assetsReady, setAssetsReady] = useState(false);

  const progressRef = useRef(0);
  const assetsReadyRef = useRef(false);
  const pendingRef = useRef(0);
  const settledRef = useRef(0);

  const setReady = useCallback((value: boolean) => {
    setReadyState(value);
  }, []);

  const registerTask = useCallback((task: Promise<unknown>) => {
    pendingRef.current += 1;
    void task
      .catch(() => {})
      .finally(() => {
        settledRef.current += 1;
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    /*
     * Buka di atas, di balik veil — tapi hanya pada pemuatan dokumen yang
     * memang menampilkan veil, dan tanpa memaksa `scrollRestoration` ke
     * "manual". Dulu keduanya dijalankan di sini setiap kali provider ini
     * mount, dan karena provider ini hidup di dalam halaman beranda, setiap
     * kembali ke beranda lewat navigasi client-side memaksa halaman ke puncak
     * sekaligus mematikan pemulihan posisi bawaan browser.
     *
     * Kembali lewat back/forward dikecualikan: di situ justru posisi terakhir
     * yang dituju, bukan puncak. (`ScrollRestoration` yang mengurusnya.)
     */
    const navigasi = window.performance?.getEntriesByType?.("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (
      preloaderAktif() &&
      !window.location.hash &&
      navigasi?.type !== "back_forward"
    ) {
      window.scrollTo(0, 0);
    }

    let cancelled = false;

    const fontsReady = document.fonts
      ? document.fonts.ready.catch(() => {})
      : Promise.resolve();

    const windowReady =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            window.addEventListener("load", () => resolve(), { once: true });
          });

    const tasksSettled = new Promise<void>((resolve) => {
      const check = () => {
        if (settledRef.current >= pendingRef.current) resolve();
        else window.setTimeout(check, 80);
      };
      check();
    });

    const settle = () => {
      if (cancelled || assetsReadyRef.current) return;
      assetsReadyRef.current = true;
      setAssetsReady(true);
    };

    const backstop = window.setTimeout(settle, READY_TIMEOUT_MS);
    void Promise.all([fontsReady, windowReady, tasksSettled]).then(settle);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let raf = 0;
    const tick = () => {
      const target = assetsReadyRef.current ? 1 : CREEP_TARGET;
      const rate = assetsReadyRef.current ? SETTLE_RATE : CREEP_RATE;
      let next = reduced
        ? target
        : progressRef.current + (target - progressRef.current) * rate;
      if (assetsReadyRef.current && 1 - next < 0.002) next = 1;
      progressRef.current = next;
      if (next < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(backstop);
    };
  }, []);

  const value = useMemo(
    () => ({ ready, introAktif, assetsReady, progressRef, registerTask, setReady }),
    [ready, introAktif, assetsReady, registerTask, setReady]
  );

  return (
    <LoaderContext.Provider value={value}>{children}</LoaderContext.Provider>
  );
}

export function useLoader() {
  return useContext(LoaderContext);
}
