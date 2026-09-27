"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";

const KUNCI_RUTE_AKTIF = "ikasada:rute-aktif";
const KUNCI_RUTE_SEBELUMNYA = "ikasada:rute-sebelumnya";

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
