"use client";

import { useState, type CSSProperties } from "react";
import { CaretLeft, CaretRight, Users } from "@phosphor-icons/react";

/**
 * Dewan Pengurus Inti — coverflow 3D dengan tombol prev/next sebagai fokus.
 */
export type PengurusItem = {
  id: string;
  nama: string;
  jabatan: string;
  angkatan: string | null;
  ket: string | null;
  fotoUrl: string | null;
};

/*
 * Kedalaman kartu dibawa oleh `filter: brightness()` dan opacity, BUKAN shadow —
 * Augen melarang drop shadow sepenuhnya ("zero-shadow philosophy") dan
 * menyatakan elevasi datang dari beda tone. brightness() adalah perubahan nada,
 * bukan hue, jadi ia tetap aman di sistem monokrom ini.
 */
function cardStyle(rel: number): CSSProperties {
  if (rel === 0) {
    return {
      transform: "translateX(0) scale(1) rotateY(0deg)",
      opacity: 1,
      zIndex: 10,
      filter: "brightness(1)",
    };
  }
  if (rel === -1) {
    return {
      transform: "translateX(-180px) scale(0.9) rotateY(10deg)",
      opacity: 0.6,
      zIndex: 5,
      filter: "brightness(0.75)",
    };
  }
  if (rel === 1) {
    return {
      transform: "translateX(180px) scale(0.9) rotateY(-10deg)",
      opacity: 0.6,
      zIndex: 5,
      filter: "brightness(0.75)",
    };
  }
  if (rel === -2) {
    return {
      transform: "translateX(-360px) scale(0.85) rotateY(20deg)",
      opacity: 0.4,
      zIndex: 2,
      filter: "brightness(0.6)",
    };
  }
  if (rel === 2) {
    return {
      transform: "translateX(360px) scale(0.85) rotateY(-20deg)",
      opacity: 0.4,
      zIndex: 2,
      filter: "brightness(0.6)",
    };
  }
  return {
    transform: `translateX(${rel * 180}px) scale(0.75) rotateY(${-rel * 15}deg)`,
    opacity: 0,
    zIndex: 1,
    filter: "brightness(0.5)",
  };
}

/** Coverflow 3D dengan tombol navigasi. */
export function PengurusCarousel({ pengurus }: { pengurus: PengurusItem[] }) {
  const [index, setIndex] = useState(0);
  const n = pengurus.length;

  if (n === 0) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + n) % n);
  const half = Math.floor(n / 2);

  const buttonClass =
    "absolute top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ perspective: 1200 }}
      role="group"
      aria-roledescription="carousel"
      aria-label="Dewan pengurus inti"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Pengurus sebelumnya"
        className={`${buttonClass} left-2 sm:left-6`}
      >
        <CaretLeft weight="bold" className="h-5 w-5" />
      </button>

      <div className="relative flex h-[500px] w-full max-w-md items-center justify-center">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {pengurus.map((item, i) => {
            let rel = i - index;
            if (rel > half) rel -= n;
            if (rel < -half) rel += n;
            const center = rel === 0;

            return (
              <article
                key={item.id}
                aria-hidden={!center}
                className={`absolute h-[460px] w-80 overflow-hidden rounded-2xl transition-all duration-500 ${
                  center
                    ? "bg-white/10 ring-2 ring-white/40"
                    : "ring-1 ring-white/10"
                }`}
                style={cardStyle(rel)}
              >
                {item.fotoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.fotoUrl}
                    alt={item.nama}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-[#e7e7ec]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1012]/95 via-[#0f1012]/35 to-transparent" />

                <div
                  className={`absolute ${
                    center ? "bottom-8 left-8 right-8" : "bottom-6 left-6 right-6"
                  }`}
                >
                  <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/20 backdrop-blur-md">
                    <Users weight="bold" className="h-3 w-3 text-neutral-300" />
                    <span className="text-white">{item.jabatan}</span>
                  </span>
                  <p
                    className={`tracking-tight text-white ${
                      center ? "text-3xl font-[400]" : "text-xl font-normal"
                    }`}
                  >
                    {item.nama}
                  </p>
                  {center && (
                    <p className="mt-1 text-sm text-white/70">
                      {[item.angkatan, item.ket].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Pengurus selanjutnya"
        className={`${buttonClass} right-2 sm:right-6`}
      >
        <CaretRight weight="bold" className="h-5 w-5" />
      </button>
    </div>
  );
}
