"use client";

import { useEffect, useRef, useState } from "react";
import { useLoader } from "./LoaderProvider";
import { preloaderAktif } from "@/lib/preloader-gate";
import styles from "./Preloader.module.css";

const GLIF = Array.from("ꦆꦏꦱꦢ");
const MIN_INTRO_MS = 1250;
const TAHAN_PENUH_MS = 100;
type PreloaderProps = { latar?: string; tintaTerang?: string };

/** Aksara → status → progres, kemudian handoff ke hero. */
export default function Preloader({ latar = "#ffffff", tintaTerang = "#0f1012" }: PreloaderProps) {
  const { assetsReady, progressRef, setReady } = useLoader();
  const [keluar, setKeluar] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const siapRef = useRef(assetsReady);
  const barRef = useRef<HTMLSpanElement>(null);
  const aktif = preloaderAktif();

  useEffect(() => { siapRef.current = assetsReady; }, [assetsReady]);

  useEffect(() => {
    if (!aktif) {
      const timer = window.setTimeout(() => { setSelesai(true); setReady(true); }, 0);
      return () => window.clearTimeout(timer);
    }
    const mulai = performance.now();
    const hematGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let penuhSejak: number | null = null;
    const jalan = (sekarang: number) => {
      const lewat = sekarang - mulai;
      // Kesiapan tunggal dari LoaderProvider. Ramp menjaga bar tetap terbaca
      // ketika aset selesai sebelum bar muncul pada 800 ms.
      const ramp = hematGerak ? 1 : Math.max(0, Math.min(1, (lewat - 800) / 400));
      const progres = Math.min(progressRef.current, ramp);
      if (barRef.current) barRef.current.style.transform = `scaleX(${progres})`;
      if (siapRef.current && progres >= 1 && lewat >= (hematGerak ? 0 : MIN_INTRO_MS)) {
        penuhSejak ??= sekarang;
        if (sekarang - penuhSejak >= (hematGerak ? 0 : TAHAN_PENUH_MS)) {
          setKeluar(true);
          // Hero masuk di balik veil yang sedang memudar.
          setReady(true);
          return;
        }
      }
      frame = requestAnimationFrame(jalan);
    };
    frame = requestAnimationFrame(jalan);
    return () => cancelAnimationFrame(frame);
  }, [aktif, progressRef, setReady]);

  useEffect(() => {
    if (!keluar) return;
    // Jaring pengaman jika transitionend tidak datang, misalnya tab tersembunyi.
    const timer = window.setTimeout(() => setSelesai(true), 500);
    return () => window.clearTimeout(timer);
  }, [keluar]);

  if (!aktif || selesai) return null;
  return (
    <div
      className={styles.veil}
      data-preloader-state={keluar ? "exiting" : "loading"}
      data-exiting={keluar ? "" : undefined}
      role="status"
      aria-label="Menyiapkan beranda IKASADA"
      aria-hidden={keluar}
      style={{ background: latar, color: tintaTerang }}
      onTransitionEnd={(event) => {
        if (keluar && event.target === event.currentTarget && event.propertyName === "opacity") setSelesai(true);
      }}
    >
      <div className={styles.lockup}>
        <svg className={styles.aksara} viewBox="0 0 260 72" aria-hidden="true">
          {GLIF.map((glif, i) => (
            <text key={`garis-${i}`} className={styles.garis} x={57.55 + i * 48.3} y="52" textAnchor="middle" fontSize="46" fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${200 + i * 120}ms` }}>
              {glif}
            </text>
          ))}
          <g className={styles.isi}>
            {GLIF.map((glif, i) => (
              <text key={`isi-${i}`} x={57.55 + i * 48.3} y="52" textAnchor="middle" fontSize="46" fill="currentColor">{glif}</text>
            ))}
          </g>
        </svg>
        <p className={styles.status}>Menyiapkan ruang untuk terhubung</p>
        <div className={styles.track} aria-hidden="true"><span ref={barRef} className={styles.fill} /></div>
      </div>
      <svg className={styles.gelombang} viewBox="0 0 1000 110" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 16C220 92 405 105 650 110H0Z" fill="#a7ddfa" />
        <path d="M0 0C220 82 420 105 700 110H600C375 106 180 76 0 14Z" fill="#39aa56" />
      </svg>
      <span className={styles.signature} aria-hidden="true">IKASADA · FIB UI</span>
    </div>
  );
}
