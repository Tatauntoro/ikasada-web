"use client";

import { useEffect, useRef, useState } from "react";
import { useLoader } from "./LoaderProvider";
import { preloaderAktif } from "@/lib/preloader-gate";

/**
 * Preloader IKASADA
 *
 * Dua babak, semuanya digerakkan waktu:
 * 1. "tulis"   — aksara Jawa "Ikasada" (ꦆꦏꦱꦢ) ditulis glif per glif. Tiap glif
 *                digoreskan lewat `stroke-dashoffset`, jadi urutannya benar-benar
 *                mengikuti tangan yang menulis, bukan sapuan kiri-ke-kanan.
 * 2. "pecah"   — aksara yang sudah utuh pecah jadi serpihan titik dan mengembang.
 *
 * Babak "tulis" tidak pernah lebih lama dari BATAS_MS, tapi juga tidak pernah
 * lebih pendek dari MIN_TULIS_MS — kalau halaman selesai memuat seketika,
 * goresannya tetap punya waktu untuk tampil utuh.
 *
 */

const AKSARA = "\uA986\uA98F\uA9B1\uA9A2"; // ꦆ ꦏ ꦱ ꦢ
const GLIF = Array.from(AKSARA);
const BATAS_MS = 2000; // batas atas babak "tulis" saat aset lelet
const MIN_TULIS_MS = 1350; // batas bawah: goresan tidak pernah terpotong
const LAMA_PECAH_MS = 560; // aksara mengembang jadi serpihan titik

type Fase = "tulis" | "pecah" | "keluar";

type PreloaderProps = {
  latar?: string;
  tintaTerang?: string;
};

export default function Preloader({
  latar = "#000000",
  tintaTerang = "#f5f5f5",
}: PreloaderProps) {
  const { setReady } = useLoader();
  const [fase, setFase] = useState<Fase>("tulis");
  const [selesai, setSelesai] = useState(false);
  const mulaiRef = useRef(0);

  /*
   * Veil hanya untuk dokumen yang pintu masuknya beranda. Sebelum ada gerbang
   * ini, komponen ini remount setiap kali kembali ke beranda lewat navigasi
   * client-side (tombol back, breadcrumb, tautan) dan veil selalu main ulang.
   */
  const aktif = preloaderAktif();

  const finish = () => {
    setSelesai(true);
    setReady(true);
  };

  // Tanpa veil: jangan gambar apa pun, tapi tetap buka gerbang loader supaya
  // copy hero ikut tampil. Ditunda satu tick karena `setState` sinkron di dalam
  // effect ditolak aturan react-hooks repo ini.
  useEffect(() => {
    if (aktif) return;
    const timer = window.setTimeout(() => {
      setSelesai(true);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [aktif, setReady]);

  // Babak 1 — tunggu aset selesai dimuat, tapi jangan potong goresannya.
  useEffect(() => {
    if (!aktif) return;
    mulaiRef.current = Date.now();
    const hematGerak = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Progres nyata: hitung gambar yang sudah selesai dimuat
    const hitungAset = () => {
      const gambar = Array.from(document.images);
      if (!gambar.length) return document.readyState === "complete" ? 1 : 0.5;
      const siap = gambar.filter((g) => g.complete).length;
      return siap / gambar.length;
    };

    let frame = 0;
    let tampil = 0;

    const jalan = () => {
      // Dicek di dalam frame, bukan di body effect: setState sinkron di dalam
      // effect memicu render berantai (dan ditolak aturan react-hooks).
      if (hematGerak) {
        setSelesai(true);
        setReady(true);
        return;
      }

      const lewat = Date.now() - mulaiRef.current;
      const nyata = hitungAset();
      const target =
        lewat > BATAS_MS || document.readyState === "complete" ? 1 : nyata;

      tampil += (target - tampil) * (0.035 + Math.random() * 0.03);
      if (target === 1 && tampil > 0.985) tampil = 1;

      if (tampil >= 1 && lewat >= MIN_TULIS_MS) {
        setFase("pecah");
        return;
      }
      frame = requestAnimationFrame(jalan);
    };

    frame = requestAnimationFrame(jalan);
    return () => cancelAnimationFrame(frame);
  }, [aktif, setReady]);

  // Babak 2 → keluar
  useEffect(() => {
    if (fase === "pecah") {
      const timer = window.setTimeout(() => setFase("keluar"), LAMA_PECAH_MS);
      return () => window.clearTimeout(timer);
    }

    if (fase === "keluar") {
      // Jaring pengaman: kalau `transitionend` tidak pernah datang (tab
      // di-background, misalnya), layar tetap terbuka.
      const timer = window.setTimeout(() => {
        setSelesai(true);
        setReady(true);
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [fase, setReady]);

  if (!aktif || selesai) return null;

  const keluar = fase === "keluar";
  const aksaraTerlihat = fase === "tulis" || fase === "pecah";

  return (
    <div
      data-preloader-state={keluar ? "exiting" : "loading"}
      onTransitionEnd={(event) => {
        if (keluar && event.target === event.currentTarget && event.propertyName === "opacity") {
          finish();
        }
      }}
      aria-hidden={keluar}
      role="status"
      aria-label="Menyiapkan beranda IKASADA"
      style={{
        position: "fixed",
        inset: 0,
        // Tinggi eksplisit: selama ~520ms animasi masuk halaman, wrapper
        // transisi masih membentuk containing block, sehingga `inset: 0`
        // saja akan membuat tinggi mengikuti tinggi dokumen dan isi preloader
        // ter-center jauh di luar layar.
        height: "100svh",
        zIndex: 9999,
        background: latar,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: keluar ? 0 : 1,
        transition: "opacity 640ms ease",
        pointerEvents: keluar ? "none" : "auto",
      }}
    >
      {/* Aksara ditulis tangan, lalu pecah. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          opacity: aksaraTerlihat ? 1 : 0,
          transition: "opacity 320ms ease",
        }}
      >
        <TulisanAksara tinta={tintaTerang} pecah={fase === "pecah"} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Babak 1 — aksara Jawa yang digoreskan                               */
/* ------------------------------------------------------------------ */

const UKURAN_GLIF = 46;
const LANGKAH_GLIF = UKURAN_GLIF * 1.05;

/**
 * Tiap glif adalah satu `<text>` yang digoreskan sendiri lewat `stroke-dashoffset`,
 * diberi jeda bertingkat supaya terbaca sebagai tulisan tangan yang berurutan.
 *
 * Panjang goresan tidak bisa diukur: `getTotalLength()` tidak ada untuk `<text>`,
 * jadi dipakai angka tetap yang cukup panjang untuk keliling satu glif pada
 * ukuran ini. Kalau goresannya berhenti sedikit lebih awal, isi glif menyusul
 * memudar masuk tepat setelahnya — jadi hasil akhirnya tetap utuh.
 */
function TulisanAksara({
  tinta,
  pecah,
}: {
  tinta: string;
  pecah: boolean;
}) {
  const mulai = 130 - (LANGKAH_GLIF * (GLIF.length - 1)) / 2;

  return (
    <svg
      viewBox="0 0 260 72"
      width="min(70vw, 260px)"
      height={72}
      aria-hidden="true"
      style={{
        overflow: "visible",
        fontFamily: "var(--font-javanese), 'Noto Sans Javanese', sans-serif",
      }}
      className={pecah ? "preloader-pecah" : undefined}
    >
      <defs>
        <pattern
          id="preloader-titik"
          width="3.2"
          height="3.2"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.6" cy="1.6" r="1.5" fill="#ffffff" />
        </pattern>
        <mask id="preloader-pecah-mask">
          <rect width="100%" height="100%" fill="url(#preloader-titik)" />
        </mask>
      </defs>

      {GLIF.map((glif, i) => (
        <text
          key={`garis-${i}`}
          className="preloader-garis"
          x={mulai + i * LANGKAH_GLIF}
          y="52"
          textAnchor="middle"
          fontSize={UKURAN_GLIF}
          fill="none"
          stroke={tinta}
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animationDelay: `${i * 180}ms` }}
        >
          {glif}
        </text>
      ))}

      {/* Isi penuh menyusul setelah goresan selesai; inilah yang terlihat pecah. */}
      <g className="preloader-isi" mask={pecah ? "url(#preloader-pecah-mask)" : undefined}>
        {GLIF.map((glif, i) => (
          <text
            key={`isi-${i}`}
            x={mulai + i * LANGKAH_GLIF}
            y="52"
            textAnchor="middle"
            fontSize={UKURAN_GLIF}
            fill={tinta}
          >
            {glif}
          </text>
        ))}
      </g>

    </svg>
  );
}
