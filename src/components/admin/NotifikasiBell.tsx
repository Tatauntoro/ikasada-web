"use client";

import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import { useNotifikasi } from "./NotifikasiProvider";

/**
 * Lonceng notifikasi untuk header admin. Angka diambil dari provider SSE,
 * jadi berubah tanpa reload saat ada pendaftaran/koneksi baru.
 */
export function NotifikasiBell() {
  const { belumDibaca, status } = useNotifikasi();

  const label =
    belumDibaca > 0
      ? `Notifikasi, ${belumDibaca} belum dibaca`
      : "Notifikasi";

  return (
    <Link
      href="/admin/inbox"
      aria-label={label}
      title={status === "terputus" ? "Notifikasi — koneksi terputus" : "Notifikasi"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0f1012] transition-colors hover:bg-black/5 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
    >
      <Bell weight="bold" className="text-xl" aria-hidden="true" />
      {belumDibaca > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#e5484d] px-1 text-[10px] font-bold leading-[18px] text-white"
        >
          {belumDibaca > 99 ? "99+" : belumDibaca}
        </span>
      )}
    </Link>
  );
}
