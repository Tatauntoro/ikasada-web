"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import DottedMap from "dotted-map";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";

/** Satu busur: dari satu titik asal ke satu titik tujuan. */
export type BusurPeta = {
  start: { lat: number; lng: number; label?: string };
  end: { lat: number; lng: number; label?: string };
};

interface WorldMapProps {
  dots?: BusurPeta[];
  /** Warna busur. Gradasinya memudar transparan di kedua ujung. */
  lineColor?: string;
  /** Warna titik daratan; harus kontras dengan `backgroundColor`. */
  dotColor?: string;
  /**
   * Latar peta. Samakan dengan latar section pemanggil supaya petanya menyatu,
   * bukan muncul sebagai kotak dengan warna sendiri.
   */
  backgroundColor?: string;
  className?: string;
  showLabels?: boolean;
  /** Lama satu busur tergambar, dalam detik. */
  animationDuration?: number;
  /** `false` = gambar sekali lalu diam; `true` = ulang tanpa henti. */
  loop?: boolean;
}

/** Selang kemunculan antar busur, dalam detik. */
const JEDA_ANTAR_BUSUR = 0.3;
/** Jeda diam setelah semua busur selesai, sebelum siklus diulang. */
const JEDA_AKHIR = 2;

/*
 * Kotak label, dalam satuan viewBox (800x400).
 *
 * Isi `foreignObject` dipotong tepat di batas kotaknya, jadi lebarnya harus
 * lega untuk label terpanjang yang dipakai ("Amerika Selatan"). Dengan kotak
 * sempit label itu terbelah dua baris lalu terlihat rusak; dengan kotak lebar
 * ia tetap rapi karena isinya di-`nowrap` dan dipusatkan.
 */
const LABEL_LEBAR = 220;
const LABEL_TINGGI = 22;
/** Jarak dasar kotak label di atas titiknya. */
const LABEL_JARAK_ATAS = 30;

/**
 * Peta dunia bertitik dengan busur animasi dari tiap titik asal ke tujuannya.
 *
 * Titik daratannya digambar sekali oleh `dotted-map` lalu dipasang lewat
 * `<Image>`, sedangkan busur dan penandanya hidup di lapisan `<svg>` di atasnya
 * dengan proyeksi ekuirektangular yang sama (800x400) supaya kedua lapisan
 * bertumpuk persis.
 *
 * Animasi dimatikan saat `prefers-reduced-motion: reduce`: busur langsung
 * tergambar penuh dan titik berjalannya tidak dibuat sama sekali.
 */
export function WorldMap({
  dots = [],
  lineColor = "#8abaff",
  dotColor = "#ffffff33",
  backgroundColor = "#070707",
  className = "w-full aspect-[2/1] rounded-lg relative font-sans overflow-hidden",
  showLabels = true,
  animationDuration = 2,
  loop = true,
}: WorldMapProps) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const bergerak = loop && !reducedMotion;

  const map = useMemo(
    () => new DottedMap({ height: 100, grid: "diagonal" }),
    []
  );

  const svgMap = useMemo(
    () =>
      map.getSVG({
        radius: 0.22,
        color: dotColor,
        shape: "circle",
        backgroundColor,
      }),
    [map, dotColor, backgroundColor]
  );

  /* Ekuirektangular: sama dengan proyeksi yang dipakai `dotted-map`. */
  const projectPoint = (lat: number, lng: number) => {
    const x = (lng + 180) * (800 / 360);
    const y = (90 - lat) * (400 / 180);
    return { x, y };
  };

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  /* Satu siklus penuh: semua busur tergambar berurutan, lalu diam sejenak. */
  const totalAnimationTime = dots.length * JEDA_ANTAR_BUSUR + animationDuration;
  const fullCycleDuration = totalAnimationTime + JEDA_AKHIR;

  return (
    <div className={className} style={{ backgroundColor }}>
      <Image
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="h-full w-full [mask-image:linear-gradient(to_bottom,transparent,white_10%,white_90%,transparent)] pointer-events-none select-none object-cover"
        alt="Peta dunia sebaran alumni"
        height="495"
        width="1056"
        draggable={false}
      />
      <svg
        viewBox="0 0 800 400"
        className="w-full h-full absolute inset-0 pointer-events-auto select-none"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <filter id="glow">
            <feMorphology operator="dilate" radius="0.5" />
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Lapisan busur: digambar lebih dulu supaya penanda selalu di atasnya. */}
        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);

          const startTime = (i * JEDA_ANTAR_BUSUR) / fullCycleDuration;
          const endTime =
            (i * JEDA_ANTAR_BUSUR + animationDuration) / fullCycleDuration;
          const resetTime = totalAnimationTime / fullCycleDuration;

          return (
            <g key={`path-group-${i}`}>
              <m.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1"
                initial={{ pathLength: bergerak ? 0 : 1 }}
                animate={
                  bergerak
                    ? { pathLength: [0, 0, 1, 1, 0] }
                    : { pathLength: 1 }
                }
                transition={
                  bergerak
                    ? {
                        duration: fullCycleDuration,
                        times: [0, startTime, endTime, resetTime, 1],
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 0,
                      }
                    : { duration: 0 }
                }
              />

              {bergerak && (
                <m.circle
                  r="4"
                  fill={lineColor}
                  initial={{ offsetDistance: "0%", opacity: 0 }}
                  animate={{
                    offsetDistance: [null, "0%", "100%", "100%", "100%"],
                    opacity: [0, 0, 1, 0, 0],
                  }}
                  transition={{
                    duration: fullCycleDuration,
                    times: [0, startTime, endTime, resetTime, 1],
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0,
                  }}
                  style={{
                    offsetPath: `path('${createCurvedPath(startPoint, endPoint)}')`,
                  }}
                />
              )}
            </g>
          );
        })}

        {/* Lapisan penanda titik asal & tujuan, plus labelnya. */}
        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);

          return (
            <g key={`points-group-${i}`}>
              {/* Titik asal */}
              <g>
                <m.g
                  onHoverStart={() =>
                    setHoveredLocation(dot.start.label || `Location ${i}`)
                  }
                  onHoverEnd={() => setHoveredLocation(null)}
                  className="cursor-pointer"
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <circle
                    data-pin={`start-${i}`}
                    cx={startPoint.x}
                    cy={startPoint.y}
                    r="3"
                    fill={lineColor}
                    filter="url(#glow)"
                    className="drop-shadow-lg"
                  />
                  <circle
                    cx={startPoint.x}
                    cy={startPoint.y}
                    r="3"
                    fill={lineColor}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from="3"
                      to="12"
                      dur="2s"
                      begin="0s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="2s"
                      begin="0s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </m.g>

                {showLabels && dot.start.label && (
                  <m.g
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 * i + 0.3, duration: 0.5 }}
                    className="pointer-events-none"
                  >
                    <foreignObject
                      x={startPoint.x - LABEL_LEBAR / 2}
                      y={startPoint.y - LABEL_JARAK_ATAS}
                      width={LABEL_LEBAR}
                      height={LABEL_TINGGI}
                      className="block"
                    >
                      <div className="flex items-center justify-center h-full">
                        <span className="text-[11px] leading-none font-medium whitespace-nowrap px-2 py-1 rounded-md bg-white/95 text-black border border-gray-200 shadow-sm">
                          {dot.start.label}
                        </span>
                      </div>
                    </foreignObject>
                  </m.g>
                )}
              </g>

              {/* Titik tujuan */}
              <g>
                <m.g
                  onHoverStart={() =>
                    setHoveredLocation(dot.end.label || `Destination ${i}`)
                  }
                  onHoverEnd={() => setHoveredLocation(null)}
                  className="cursor-pointer"
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <circle
                    data-pin={`end-${i}`}
                    cx={endPoint.x}
                    cy={endPoint.y}
                    r="3"
                    fill={lineColor}
                    filter="url(#glow)"
                    className="drop-shadow-lg"
                  />
                  <circle
                    cx={endPoint.x}
                    cy={endPoint.y}
                    r="3"
                    fill={lineColor}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from="3"
                      to="12"
                      dur="2s"
                      begin="0.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="2s"
                      begin="0.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </m.g>

                {showLabels && dot.end.label && (
                  <m.g
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 * i + 0.5, duration: 0.5 }}
                    className="pointer-events-none"
                  >
                    <foreignObject
                      x={endPoint.x - LABEL_LEBAR / 2}
                      y={endPoint.y - LABEL_JARAK_ATAS}
                      width={LABEL_LEBAR}
                      height={LABEL_TINGGI}
                      className="block"
                    >
                      <div className="flex items-center justify-center h-full">
                        <span className="text-[11px] leading-none font-medium whitespace-nowrap px-2 py-1 rounded-md bg-white/95 text-black border border-gray-200 shadow-sm">
                          {dot.end.label}
                        </span>
                      </div>
                    </foreignObject>
                  </m.g>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {/* Tooltip: di perangkat sentuh label titik tidak punya hover, jadi lokasi
          yang tersentuh dilaporkan di sini. */}
      <AnimatePresence>
        {hoveredLocation && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 bg-white/90 text-black px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm sm:hidden border border-gray-200"
          >
            {hoveredLocation}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
