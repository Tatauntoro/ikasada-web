"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight } from "@phosphor-icons/react";
import type { PublicArsip } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { reportAssetError } from "@/lib/asset-error";
import { ArsipRow } from "./ArsipDirectory";

/** Berapa dokumen terbaru yang dipratinjau di beranda. */
const TAMPIL = 4;

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Section Arsip di beranda.
 *
 * Menampilkan dokumen terbaru saja; daftar lengkap beserta pencarian, filter,
 * dan paginasi tetap tinggal di `/arsip` (tautan "Lihat Semua Arsip") — pola
 * yang sama dengan direktori alumni. Barisnya memakai `ArsipRow` yang sama
 * dengan halaman itu, jadi tampilannya tidak mungkin berbeda.
 *
 * Datanya datang dari `/api/public/arsip`, bukan lagi array statis, dan
 * diambil di klien karena beranda dirender statis — kalau query-nya di server,
 * dokumen baru tidak muncul sampai build berikutnya.
 */
export default function ArsipSection() {
  const [dokumen, setDokumen] = useState<PublicArsip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const hasil = await panggilApi<PublicArsip[]>(
      `/api/public/arsip?limit=${TAMPIL}`
    );

    if (!hasil.ok) {
      reportAssetError("/api/public/arsip", "api");
      setIsLoading(false);
      return;
    }

    setDokumen(hasil.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Tidak ada dokumen terbit: section tidak perlu tampil kosong.
  if (!isLoading && dokumen.length === 0) {
    return null;
  }

  return (
    <section
      id="arsip"
      className={`home-jakarta-section ${plusJakartaSans.className} relative overflow-hidden border-y border-[rgba(0,0,0,0.06)] bg-[#f2f2f4] py-[88px] text-[#0f1012] reveal-section`}
    >
      <div className="relative z-10 mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10">
        <div className="mb-16">
          <div className="max-w-3xl">
            <span className="reveal-item block section-label">Arsip</span>
            <h2 className="reveal-item mt-4 section-title">
              Dokumen &amp; Laporan.
            </h2>
          </div>
        </div>

        {isLoading ? (
          <ul className="reveal-item border-t border-black/10">
            {Array.from({ length: TAMPIL }).map((_, i) => (
              <li key={i} className="border-b border-black/10 py-7">
                <div className="flex animate-pulse flex-col gap-3 sm:flex-row sm:gap-8">
                  <span className="h-4 w-32 flex-none bg-black/10" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-5 w-2/3 bg-black/10" />
                    <span className="block h-3 w-full bg-black/[0.07]" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="reveal-item border-t border-black/10">
            {dokumen.map((item) => (
              <ArsipRow key={item.slug} item={item} level={3} />
            ))}
          </ul>
        )}

        <div className="reveal-item mt-12 flex justify-center">
          <Link href="/arsip" className="augen-cta whitespace-nowrap px-5">
            Lihat Semua Arsip
            <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
