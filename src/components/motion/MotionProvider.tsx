"use client";

import { LazyMotion, MotionConfig, domMax } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Sumber tunggal konfigurasi framer-motion.
 *
 * - `LazyMotion` + `domMax` memuat fitur animasi (termasuk layout animation)
 *   secara malas agar bundle awal tetap ramping. `strict` memaksa komponen di
 *   dalamnya memakai `m` (bukan `motion`) supaya fitur tidak ikut ter-bundle
 *   diam-diam.
 * - `MotionConfig reducedMotion="user"` otomatis menonaktifkan animasi
 *   transform/layout bila pengguna mengaktifkan "reduce motion" di OS-nya,
 *   sementara transisi opacity tetap berjalan.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
