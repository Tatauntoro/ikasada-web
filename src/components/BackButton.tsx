"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { KUNCI_PEMULIHAN_GULIR } from "@/lib/scroll-return";

const KUNCI_RUTE_AKTIF = "ikasada:rute-aktif";
const KUNCI_RUTE_SEBELUMNYA = "ikasada:rute-sebelumnya";
const KUNCI_TUJUAN_GULIR = "ikasada:tujuan-gulir";
const KUNCI_POSISI_GULIR = "ikasada:posisi-gulir";

export default function BackButton({
  fallback,
  forceFallback = false,
}: {
  fallback: string;
  forceFallback?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function kembali() {
    if (forceFallback) {
      const tujuan = new URL(fallback, window.location.origin);
      const section = tujuan.hash.slice(1);

      if (section) {
        let targetTersimpan = false;
        try {
          window.sessionStorage.setItem(KUNCI_TUJUAN_GULIR, section);
          const peta = JSON.parse(sessionStorage.getItem(KUNCI_POSISI_GULIR) ?? "{}") as Record<string, number>;
          const posisi = peta[tujuan.pathname + tujuan.search];
          if (typeof posisi === "number" && Number.isFinite(posisi)) {
            sessionStorage.setItem(KUNCI_PEMULIHAN_GULIR, String(posisi));
          }
          targetTersimpan = true;
        } catch {
          // Navigasi tetap dilanjutkan tanpa target gulir jika storage diblokir.
        }

        if (targetTersimpan) {
          document.documentElement.dataset.sectionNavigation = "true";
        }
        router.push(`${tujuan.pathname}${tujuan.search}`, { scroll: false });
        return;
      }

      router.push(fallback);
      return;
    }

    try {
      const ruteAktif = window.sessionStorage.getItem(KUNCI_RUTE_AKTIF);
      const ruteSebelumnya = window.sessionStorage.getItem(
        KUNCI_RUTE_SEBELUMNYA
      );

      if (
        pathname &&
        ruteAktif === pathname &&
        ruteSebelumnya &&
        ruteSebelumnya !== pathname
      ) {
        router.back();
        return;
      }
    } catch {
      // Gunakan halaman induk jika penyimpanan diblokir.
    }

    router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={kembali}
      className="mb-6 inline-flex min-h-11 items-center gap-2 border-b border-black/20 pb-1 text-sm text-black/65 transition-colors hover:border-black hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
      aria-label="Kembali ke halaman sebelumnya"
    >
      <ArrowLeft weight="bold" aria-hidden="true" />
      Kembali
    </button>
  );
}
