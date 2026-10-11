"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const KUNCI_TUJUAN_GULIR = "ikasada:tujuan-gulir";

export default function HomeSectionLink({
  sectionId,
  className,
  children,
}: {
  sectionId: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/"
      scroll={false}
      className={className}
      onClick={() => {
        let targetTersimpan = false;
        try {
          window.sessionStorage.setItem(KUNCI_TUJUAN_GULIR, sectionId);
          targetTersimpan = true;
        } catch {
          // Beranda tetap terbuka tanpa target section jika storage diblokir.
        }
        if (targetTersimpan) {
          document.documentElement.dataset.sectionNavigation = "true";
        }
      }}
    >
      {children}
    </Link>
  );
}
