"use client";

import { useEffect, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { reportAssetError } from "@/lib/asset-error";
import { PengurusCarousel, type PengurusItem } from "./PengurusWall";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function StaffSection() {
  const beranda = useBerandaConfig();
  const [data, setData] = useState<PengurusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPengurus() {
      try {
        const response = await fetch("/api/public/pengurus");
        const result = await response.json();
        if (response.ok) {
          setData(result.data || []);
        }
      } catch {
        reportAssetError("/api/public/pengurus", "api");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPengurus();
  }, []);

  const eyebrowPengurus = teksSection(
    beranda,
    "pengurus",
    "eyebrow",
    "Pengurus"
  );
  const judulPengurus = teksSection(
    beranda,
    "pengurus",
    "judul",
    "Dewan Pengurus Inti"
  );
  const gayaJudulPengurus = gayaSection(beranda, "pengurus", "judul");
  const gayaEyebrowPengurus = gayaSection(beranda, "pengurus", "eyebrow");
  const gayaBackgroundPengurus = gayaBackgroundSection(beranda, "pengurus");
  const deskripsiPengurus = teksSection(
    beranda,
    "pengurus",
    "deskripsi",
    "Nakhoda organisasi yang berdedikasi menjaga sinergi antar-alumni dan kejayaan tradisi Sastra Daerah FIB UI."
  );

  // Section bisa disembunyikan dari Kelola Beranda.
  if (!sectionAktif(beranda, "pengurus")) return null;

  return (
    <section
      id="staf"
      style={gayaBackgroundPengurus}
      className={`home-jakarta-section ${plusJakartaSans.className} relative isolate overflow-hidden bg-[#f2f2f4] py-9 pb-7 md:pt-[50px] md:pb-8 text-[#0f1012]`}
    >
      <div className="home-section-container relative z-10">
        {/* Header rata kiri (sama seperti Direktori Alumni) */}
        <div className="mb-8 max-w-3xl">
          <span
            className="reveal-item block section-label"
            style={gayaEyebrowPengurus}
          >
            {eyebrowPengurus}
          </span>
          <h2
            className="mt-4 section-title"
            style={gayaJudulPengurus}
          >
            {judulPengurus}
          </h2>
          <p className="reveal-item mt-5 max-w-2xl text-[15px] leading-relaxed text-[#5e5e5e] text-pretty sm:text-base">
            {deskripsiPengurus}
          </p>
        </div>

        {isLoading ? (
          <div role="status" className="mx-0 grid max-w-5xl gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
            <span className="sr-only">Memuat pengurus</span>
            <div aria-hidden="true" className="h-[280px] animate-pulse rounded-3xl bg-[#e7e7ec] sm:h-[320px] lg:h-[360px]" />
            <div aria-hidden="true" className="space-y-4 pt-4">
              <div className="h-8 w-2/3 animate-pulse rounded bg-[#e7e7ec]" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-[#e7e7ec]" />
              <div className="mt-10 h-5 w-full animate-pulse rounded bg-[#e7e7ec]" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-[#e7e7ec]" />
            </div>
          </div>
        ) : (
          <PengurusCarousel pengurus={data} />
        )}
      </div>
    </section>
  );
}
