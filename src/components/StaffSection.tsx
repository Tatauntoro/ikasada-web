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
      className={`home-jakarta-section ${plusJakartaSans.className} relative isolate overflow-hidden bg-white py-[112px] text-[#0f1012] reveal-section`}
    >
      <div className="home-section-container relative z-10">
        {/* Header rata kiri (sama seperti Direktori Alumni) */}
        <div className="mb-16 max-w-3xl">
          <span
            className="reveal-item block section-label"
            style={gayaEyebrowPengurus}
          >
            {eyebrowPengurus}
          </span>
          <h2
            className="reveal-item mt-4 section-title"
            style={gayaJudulPengurus}
          >
            {judulPengurus}
          </h2>
          <p className="reveal-item mt-5 max-w-2xl text-[15px] leading-relaxed text-[#334155] text-pretty sm:text-base">
            {deskripsiPengurus}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center" style={{ perspective: 1200 }}>
            <div className="h-[460px] w-80 animate-pulse rounded-2xl bg-[#0B5ED7]/10" />
          </div>
        ) : (
          <PengurusCarousel pengurus={data} />
        )}
      </div>
    </section>
  );
}
