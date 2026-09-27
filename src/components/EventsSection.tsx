"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, CaretRight, MapPin } from "@phosphor-icons/react";
import type { PublicKegiatan } from "@/lib/types";
import { formatTanggalWIB } from "@/lib/format";
import Tilt from "./Tilt";
import { rekamAsalMorphDari } from "./motion/ImageMorph";

const LIMIT = 6;

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

type ListResponse = {
  success: boolean;
  data: PublicKegiatan[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function parseDate(tgl: string) {
  const parts = tgl.split(" ");
  return {
    day: parts[0] || "",
    month: parts[1] ? parts[1].slice(0, 3) : "",
    year: parts[2] || "",
  };
}

export default function EventsSection() {
  const [data, setData] = useState<PublicKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/kegiatan?limit=${LIMIT}`);
      const result: ListResponse = await response.json();
      if (!response.ok) {
        const err = result as unknown as { error?: { message?: string } };
        setError(err?.error?.message || "Gagal memuat kegiatan");
        return;
      }
      setData(result.data);
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const featured = data[0];
  const agenda = data.slice(1);

  return (
    <section
      id="kegiatan"
      className={`home-jakarta-section ${plusJakartaSans.className} relative overflow-hidden border-y border-[rgba(0,0,0,0.06)] bg-[#f2f2f4] py-[88px] text-[#0f1012] reveal-section`}
    >
      <div className="relative z-10 mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10">
        <div className="mb-16">
          <div className="max-w-3xl">
            <span className="reveal-item block section-label">
              Kegiatan
            </span>
            <h2 className="reveal-item mt-4 section-title">
              Hadiri Kegiatan Kami.
            </h2>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-pulse overflow-hidden rounded-[16px] border border-[rgba(0,0,0,0.14)] bg-[#fdfdfd]">
              <div className="h-[238px] bg-[#e7e7ec]" />
              <div className="space-y-3 p-7">
                <div className="h-5 w-3/4 rounded bg-neutral-100" />
                <div className="h-3 w-full rounded bg-neutral-100" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-[12px] border border-[rgba(0,0,0,0.14)] bg-[#fdfdfd]"
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="py-12 text-center text-neutral-500">
            <p>{error}</p>
            <button
              onClick={fetchData}
              className="augen-cta mt-4 px-5"
            >
              Coba Lagi
              <ArrowRight weight="bold" aria-hidden="true" />
            </button>
          </div>
        )}

        {!isLoading && !error && data.length === 0 && (
          <div className="py-12 text-center text-black/50">
            <p>Belum ada kegiatan yang tersedia.</p>
          </div>
        )}

        {!isLoading && !error && data.length > 0 && (
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Featured event */}
            {featured && (
              <Tilt max={6} className="h-full">
                <article className="reveal-item group flex h-full flex-col overflow-hidden rounded-[16px] border border-[rgba(0,0,0,0.22)] bg-[#fdfdfd] transition-all duration-[400ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-[#0f1012]">
                  <div data-scroll-scrub data-cursor-label="Buka kegiatan" className="relative h-[238px] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        featured.gambarThumbnailUrl ||
                        "/images/placeholder-event.jpg"
                      }
                      alt={featured.judul}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-4 left-4 rounded-full bg-[#fdfdfd] px-[14px] py-2 text-[11.5px] font-normal text-[#0f1012]">
                      {formatTanggalWIB(featured.tanggalMulai)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-[14px] p-[26px_28px_28px]">
                    <span className="self-start rounded-full bg-[#0f1012] px-[11px] py-[5px] text-[10.5px] font-normal uppercase tracking-[0.1em] text-[#fdfdfd]">
                      Unggulan
                    </span>
                    <h3 className="font-display text-[28px] font-normal leading-[1.12] tracking-[-0.025em] text-[#0f1012] text-pretty sm:text-[31px]">
                      {featured.judul}
                    </h3>
                    <p className="text-[14.5px] leading-[1.6] text-[#0f1012] text-pretty">
                      {featured.deskripsiSingkat}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-4 border-t border-[rgba(0,0,0,0.14)] pt-[18px]">
                      <span className="flex items-center gap-2 text-[13.5px] font-normal text-[#5e5e5e]">
                        <span className="h-[7px] w-[7px] rounded-full border-2 border-[#0f1012]" />
                        {featured.lokasi}
                      </span>
                      <Link
                        href={`/kegiatan/${featured.slug}`}
                        onClick={(e) => rekamAsalMorphDari(e.currentTarget)}
                        className="augen-cta px-5"
                      >
                        Detail
                        <ArrowRight weight="bold" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              </Tilt>
            )}

            {/* Agenda list */}
            <div className="flex flex-col">
              {agenda.map((item) => {
                const { day, month, year } = parseDate(
                  formatTanggalWIB(item.tanggalMulai)
                );
                return (
                  <Tilt key={item.id} max={4}>
                    <Link
                      href={`/kegiatan/${item.slug}`}
                      className="reveal-item group relative grid grid-cols-[66px_1fr_auto] items-center gap-5 overflow-hidden rounded-xl border-b border-[rgba(0,0,0,0.14)] px-3 py-5 text-left transition-all duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:bg-[#fdfdfd]/70 hover:pl-6"
                    >
                      <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-[#0f1012] transition-transform duration-300 group-hover:scale-y-100" />

                      <span className="flex flex-col items-center leading-none">
                        <span className="font-display text-[30px] font-normal text-[#0f1012]">
                          {day}
                        </span>
                        <span className="mt-[5px] text-[10.5px] uppercase tracking-[0.1em] text-[#5e5e5e]">
                          {month}
                        </span>
                      </span>

                      <span className="flex flex-col gap-[6px]">
                        <span className="text-[15.5px] font-normal tracking-[-0.01em] text-[#0f1012] text-pretty">
                          {item.judul}
                        </span>
                        <span className="flex items-center gap-1 text-[12.5px] text-[#5e5e5e]">
                          <MapPin weight="bold" /> {item.lokasi}
                        </span>
                      </span>

                      <span className="flex items-center gap-2">
                        <span className="text-[10.5px] font-normal uppercase tracking-[0.09em] text-[#5e5e5e]">
                          {year}
                        </span>
                        <CaretRight
                          weight="bold"
                          className="-translate-x-1 text-[14px] text-[#0f1012] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </span>
                    </Link>
                  </Tilt>
                );
              })}
            </div>
          </div>
        )}

        <div className="reveal-item mt-12 flex justify-center">
          <Link href="/event" className="augen-cta whitespace-nowrap px-5">
            Lihat Semua Agenda
            <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
