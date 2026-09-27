"use client";

import { useEffect, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { reportAssetError } from "@/lib/asset-error";
import { PengurusCarousel, type PengurusItem } from "./PengurusWall";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function StaffSection() {
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

  return (
    <section
      id="staf"
      className={`home-jakarta-section ${plusJakartaSans.className} relative overflow-hidden bg-[#0f1012] py-[112px] text-[#fdfdfd] reveal-section`}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6">
        {/* Header rata kiri (sama seperti Direktori Alumni) */}
        <div className="mb-16 max-w-3xl">
          <h2 className="reveal-item section-title section-title--terang">
            Dewan Pengurus Inti
          </h2>
          <p className="reveal-item mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65 text-pretty sm:text-base">
            Nakhoda organisasi yang berdedikasi menjaga sinergi antar-alumni dan
            kejayaan tradisi Sastra Daerah FIB UI.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center" style={{ perspective: 1200 }}>
            <div className="h-[460px] w-80 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : (
          <PengurusCarousel pengurus={data} />
        )}
      </div>
    </section>
  );
}
