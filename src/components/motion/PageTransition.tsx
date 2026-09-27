"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { adaMorphTertunda } from "./ImageMorph";

/**
 * Transisi masuk halaman: halaman baru muncul dari kedalaman.
 *
 * Dipakai lewat `app/template.tsx`. Template di-remount Next setiap navigasi
 * route, jadi animasinya otomatis main ulang tanpa perlu state tambahan.
 *
 * Tiga hal yang dijaga:
 * - Keyframe-nya berakhir di `transform: none`, sehingga setelah animasi
 *   selesai wrapper ini tidak lagi membentuk containing block. Elemen
 *   `position: fixed` (Navbar) tetap menempel ke viewport.
 * - Route `/admin` tidak dianimasikan. Portal admin itu alat kerja — animasi
 *   masuk cuma menambah jeda tanpa nilai.
 * - Kalau gambar kartu sedang terbang ke hero detail, animasi ini dilewati.
 *   Kalau tidak, wrapper yang ter-scale bikin rect hero terukur salah.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return <>{children}</>;
  if (adaMorphTertunda()) return <>{children}</>;

  return <div className="page-enter">{children}</div>;
}
