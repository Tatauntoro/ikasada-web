"use client";

import { m } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Morph gambar kartu → hero halaman detail.
 *
 * Cara kerjanya: saat link "Detail" diklik, rect gambar kartu direkam ke
 * variabel modul (bertahan selama navigasi client-side). Di halaman detail,
 * `MorphHeroImage` membaca rekaman itu lalu menerbangkan salinan gambar dari
 * posisi lama ke posisi hero, baru menampilkan gambar aslinya.
 *
 * Overlay-nya di-portal ke `document.body` supaya tidak terjebak containing
 * block milik wrapper transisi halaman — `position: fixed` di dalam elemen
 * yang punya `transform` akan mengacu ke elemen itu, bukan ke viewport.
 */

const MASA_BERLAKU_MS = 5000;

type Asal = {
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  waktu: number;
};

let asalMorph: Asal | null = null;

/** Dipanggil dari link kartu sebelum navigasi. */
export function rekamAsalMorphDari(el: HTMLElement | null) {
  const img = el?.closest("article")?.querySelector("img");
  if (!img) return;
  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  asalMorph = {
    src: img.getAttribute("src") ?? "",
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    waktu: Date.now(),
  };
}

/**
 * Dipakai `PageTransition`: kalau gambar sedang terbang, animasi masuk halaman
 * dilewati. Kalau tidak, wrapper ter-scale dan rect hero terukur salah.
 */
export function adaMorphTertunda() {
  return Boolean(asalMorph && Date.now() - asalMorph.waktu < MASA_BERLAKU_MS);
}

function ambilAsal(src: string): Asal | null {
  if (!asalMorph) return null;
  if (asalMorph.src !== src) return null;
  if (Date.now() - asalMorph.waktu > MASA_BERLAKU_MS) return null;
  return asalMorph;
}

export function MorphHeroImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const sudahRef = useRef(false);
  const [morph, setMorph] = useState<{ asal: Asal; akhir: DOMRect } | null>(null);

  useEffect(() => {
    if (sudahRef.current) return;
    const asal = ambilAsal(src);
    const img = ref.current;
    if (!asal || !img) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const akhir = img.getBoundingClientRect();
    if (akhir.width === 0 || akhir.height === 0) return;

    sudahRef.current = true;
    setMorph({ asal, akhir });
  }, [src]);

  const dx = morph ? morph.asal.left - morph.akhir.left : 0;
  const dy = morph ? morph.asal.top - morph.akhir.top : 0;
  const skala = morph ? morph.asal.width / morph.akhir.width : 1;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={className}
        style={{ opacity: morph ? 0 : 1 }}
      />

      {morph &&
        typeof document !== "undefined" &&
        createPortal(
          <m.img
            src={src}
            alt=""
            aria-hidden="true"
            initial={{ x: dx, y: dy, scale: skala, borderRadius: 16 }}
            animate={{ x: 0, y: 0, scale: 1, borderRadius: 0 }}
            transition={{ duration: 0.62, ease: [0.22, 0.61, 0.36, 1] }}
            onAnimationComplete={() => {
              asalMorph = null;
              setMorph(null);
            }}
            style={{
              position: "fixed",
              left: morph.akhir.left,
              top: morph.akhir.top,
              width: morph.akhir.width,
              height: morph.akhir.height,
              objectFit: "cover",
              transformOrigin: "top left",
              zIndex: 100,
              pointerEvents: "none",
            }}
          />,
          document.body
        )}
    </>
  );
}
