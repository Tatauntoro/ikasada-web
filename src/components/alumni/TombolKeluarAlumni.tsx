"use client";

import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { panggilApi } from "@/lib/api-client";

/**
 * Keluar dari session alumni (Task 11).
 *
 * Session hanya ada di cookie `httpOnly`, jadi keluar harus lewat endpoint:
 * client tidak bisa — dan tidak boleh — menghapus cookie itu sendiri.
 */
export default function TombolKeluarAlumni() {
  const router = useRouter();
  const [sedangKeluar, setSedangKeluar] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function keluar() {
    setSedangKeluar(true);
    setPesan(null);

    const hasil = await panggilApi<{ message: string }>(
      "/api/auth/alumni/logout",
      { method: "POST" }
    );

    if (!hasil.ok) {
      setPesan("Belum berhasil keluar. Coba lagi.");
      setSedangKeluar(false);
      return;
    }

    /*
     * Halaman privat dirender di server, jadi `refresh()` wajib: tanpa itu
     * router bisa memakai hasil render lama yang masih memuat data sesi.
     */
    router.replace("/alumni/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={keluar}
        disabled={sedangKeluar}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0757a6] bg-[#0757a6] px-5 text-[13px] tracking-[-0.02em] text-white transition-colors hover:border-[#064b90] hover:bg-[#064b90] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0757a6] disabled:cursor-wait disabled:opacity-70"
      >
        <SignOut
          weight="regular"
          className="text-base text-white"
          aria-hidden="true"
        />
        <span>{sedangKeluar ? "Keluar..." : "Keluar"}</span>
      </button>
      {pesan && (
        <p role="alert" className="text-[12px] text-[#b42318]">
          {pesan}
        </p>
      )}
    </div>
  );
}
