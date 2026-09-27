"use client";

import { AnimatePresence, m } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Crossfade halus saat konten berganti state (loading → konten / kosong /
 * error). Hanya `opacity` yang dianimasikan agar tidak bentrok dengan
 * transform kartu (hover translate, reveal CSS) di dalamnya.
 */
export function StateCrossfade({
  stateKey,
  children,
  className,
}: {
  stateKey: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={stateKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
