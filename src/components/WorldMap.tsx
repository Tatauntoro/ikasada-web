"use client";

import Image from "next/image";
import { useId } from "react";
import { m, useReducedMotion } from "framer-motion";
import styles from "./WorldMap.module.css";

/** Satu titik asal dan tujuan pada peta dunia. */
export type BusurPeta = {
  start: { lat: number; lng: number; label?: string };
  end: { lat: number; lng: number; label?: string };
};

interface WorldMapProps {
  dots?: BusurPeta[];
  originColor?: string;
  dotColor?: string;
  className?: string;
  showLabels?: boolean;
  animationDuration?: number;
  loop?: boolean;
}

const JEDA_ANTAR_BUSUR = 0.3;
const JEDA_AKHIR = 2;

// Peta SVG lokal memakai proyeksi equirektangular dalam viewBox 800 × 400.
const projectPoint = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * 800,
  y: ((85 - lat) / 145) * 400,
});

const createCurvedPath = (
  start: { x: number; y: number },
  end: { x: number; y: number }
) => {
  const midX = (start.x + end.x) / 2;
  const midY = Math.min(start.y, end.y) - 50;
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
};

function labelPlacement(name: string | undefined) {
  if (name === "Australia") return { dx: -8, anchor: "end" as const, dy: 17 };
  if (name === "Indonesia") return { dx: 11, anchor: "start" as const, dy: 20 };
  return { dx: 9, anchor: "start" as const, dy: -8 };
}

/** Peta negara berwarna dengan busur bergerak dari titik asal ke tiap wilayah. */
export function WorldMap({
  dots = [],
  originColor = "#28A745",
  dotColor = "#0B5ED7",
  className = "",
  showLabels = true,
  animationDuration = 2,
  loop = true,
}: WorldMapProps) {
  const reducedMotion = useReducedMotion();
  const bergerak = loop && !reducedMotion;
  const gradientId = `map-route-gradient-${useId().replace(/:/g, "")}`;
  const origin = dots[0]?.start;
  const tujuan = dots
    .map(({ end }) => end.label)
    .filter((label): label is string => Boolean(label));
  const accessibleDescription = tujuan.length
    ? `Peta dunia dengan batas negara berwarna. Garis menghubungkan ${origin?.label ?? "Indonesia"} ke ${tujuan.join(", ")}. Warna negara hanya pembeda visual.`
    : "Peta negara dunia dengan batas berwarna sebagai pembeda visual.";

  const totalAnimationTime = dots.length * JEDA_ANTAR_BUSUR + animationDuration;
  const fullCycleDuration = totalAnimationTime + JEDA_AKHIR;

  return (
    <div className={`${styles.frame} ${className}`.trim()}>
      <Image
        src="/images/peta/world-countries-pastel.svg"
        alt=""
        fill
        unoptimized
        sizes="(max-width: 900px) 100vw, 65vw"
        className={styles.countryMap}
        draggable={false}
      />
      <svg
        viewBox="0 0 800 400"
        className={styles.markers}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={accessibleDescription}
      >
        <title>Sebaran geografis IKASADA</title>
        <desc>{accessibleDescription}</desc>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={dotColor} stopOpacity="0.06" />
            <stop offset="5%" stopColor={dotColor} stopOpacity="0.94" />
            <stop offset="95%" stopColor={dotColor} stopOpacity="0.94" />
            <stop offset="100%" stopColor={dotColor} stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Busur tampil lebih dulu agar pin dan label berada di lapisan teratas. */}
        {dots.map((dot, index) => {
          const start = projectPoint(dot.start.lat, dot.start.lng);
          const end = projectPoint(dot.end.lat, dot.end.lng);
          const path = createCurvedPath(start, end);
          const startTime = (index * JEDA_ANTAR_BUSUR) / fullCycleDuration;
          const endTime =
            (index * JEDA_ANTAR_BUSUR + animationDuration) / fullCycleDuration;
          const resetTime = totalAnimationTime / fullCycleDuration;

          return (
            <g key={`route-${dot.end.label ?? index}`}>
              <m.path
                d={path}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="1.8"
                initial={{ pathLength: bergerak ? 0 : 1 }}
                animate={bergerak ? { pathLength: [0, 0, 1, 1, 0] } : { pathLength: 1 }}
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
                  r="3.5"
                  fill={dotColor}
                  stroke="#ffffff"
                  strokeWidth="1.2"
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
                  style={{ offsetPath: `path('${path}')` }}
                />
              )}
            </g>
          );
        })}

        {origin && (() => {
          const point = projectPoint(origin.lat, origin.lng);
          const label = origin.label || "Indonesia";
          const placement = labelPlacement(label);

          return (
            <g key="origin">
              {bergerak && (
                <circle cx={point.x} cy={point.y} r="5" fill={originColor} opacity="0.55">
                  <animate attributeName="r" from="5" to="15" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.55" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={point.x} cy={point.y} r="5" fill={originColor} stroke="#ffffff" strokeWidth="2" />
              {showLabels && (
                <text
                  className={styles.mapLabel}
                  x={point.x + placement.dx}
                  y={point.y + placement.dy}
                  textAnchor={placement.anchor}
                  fill={originColor}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })()}

        {dots.map(({ end }, index) => {
          const point = projectPoint(end.lat, end.lng);
          const label = end.label || `Wilayah ${index + 1}`;
          const placement = labelPlacement(label);

          return (
            <g key={`${label}-${end.lat}-${end.lng}`}>
              <circle cx={point.x} cy={point.y} r="4" fill={dotColor} stroke="#ffffff" strokeWidth="2">
                <title>{label}</title>
              </circle>
              {showLabels && (
                <text
                  className={styles.mapLabel}
                  x={point.x + placement.dx}
                  y={point.y + placement.dy}
                  textAnchor={placement.anchor}
                  fill={dotColor}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
