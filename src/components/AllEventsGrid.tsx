"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarBlank, MapPin } from "@phosphor-icons/react";
import type { PublicKegiatan } from "@/lib/types";
import { formatTanggalWIB } from "@/lib/format";
import { StateCrossfade } from "./motion/StateCrossfade";
import { rekamAsalMorphDari } from "./motion/ImageMorph";
import Pagination from "./Pagination";

const DEFAULT_PER_PAGE = 4;

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

export default function AllEventsGrid({
  perPage = DEFAULT_PER_PAGE,
}: {
  perPage?: number;
}) {
  const [data, setData] = useState<PublicKegiatan[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/public/kegiatan?limit=${perPage}&page=${page}`
      );
      const result: ListResponse = await response.json();
      if (!response.ok) {
        const err = result as unknown as { error?: { message?: string } };
        setError(err?.error?.message || "Gagal memuat kegiatan");
        return;
      }
      setData(result.data);
      setTotalPages(result.meta?.totalPages ?? 1);
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const changePage = (next: number) => {
    setOpenId(null);
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const stateKey = isLoading
    ? "loading"
    : error
    ? "error"
    : data.length === 0
    ? "empty"
    : "ready";

  return (
    <div ref={topRef}>
      <StateCrossfade stateKey={stateKey}>
      {isLoading && (
        <div className="flex flex-col gap-4 md:flex-row">
          {Array.from({ length: perPage }).map((_, i) => (
            <div
              key={i}
              className="h-72 w-full animate-pulse rounded-2xl bg-black/10 md:h-[420px] md:flex-1"
            />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="py-12 text-center text-neutral-600">
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-full bg-[#0f1012] px-5 py-2 text-sm font-normal text-[#fdfdfd] transition-colors hover:bg-[#5e5e5e]"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !error && data.length === 0 && (
        <div className="py-12 text-center text-black/50">
          <p>Belum ada kegiatan yang tersedia.</p>
        </div>
      )}

      {!isLoading && !error && data.length > 0 && (
        <>
          <div className="flex flex-col gap-4 md:flex-row">
            {data.map((item, i) => {
              const open = openId === item.id;
              return (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  aria-label={`${item.judul} — buka detail`}
                  onClick={() =>
                    setOpenId((cur) => (cur === item.id ? null : item.id))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenId((cur) => (cur === item.id ? null : item.id));
                    }
                  }}
                  className="event-card group relative w-full min-w-0 overflow-hidden rounded-2xl bg-black ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{
                    animation: `fadeSlideIn 0.6s ease-out ${0.1 + i * 0.1}s both`,
                  }}
                >
                  {item.gambarThumbnailUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.gambarThumbnailUrl}
                      alt={item.judul}
                      className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.02] md:h-[420px]"
                    />
                  ) : (
                    <div className="h-72 w-full bg-gradient-to-br from-neutral-700 to-black md:h-[420px]" />
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Judul selalu tampil */}
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
                    <span className="line-clamp-3 font-display text-lg font-normal leading-tight text-[#fdfdfd] sm:text-xl">
                      {item.judul}
                    </span>
                    <span className="hidden flex-none rounded-full bg-black/60 px-3 py-1 text-[10.5px] font-normal uppercase tracking-[0.1em] text-neutral-300 backdrop-blur-sm sm:inline-flex">
                      {item.kategori}
                    </span>
                  </div>

                  {/* Panel reveal: hover (desktop) / tap (mobile) */}
                  <div
                    className={`absolute inset-x-0 bottom-0 p-4 transition-all duration-500 sm:p-6 ${
                      open
                        ? "translate-y-0 opacity-100 pointer-events-auto"
                        : "translate-y-4 opacity-0 pointer-events-none"
                    } md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-hover:pointer-events-auto`}
                  >
                    <div className="rounded-xl bg-black/70 p-4 ring-1 ring-white/10 backdrop-blur sm:p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.1em] text-neutral-300">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarBlank weight="bold" />
                          {formatTanggalWIB(item.tanggalMulai)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-white/60">
                          <MapPin weight="bold" />
                          {item.lokasi}
                        </span>
                      </div>
                      <p className="mb-4 text-sm leading-relaxed text-white/75 line-clamp-3 sm:text-base">
                        {item.deskripsiSingkat}
                      </p>
                      <Link
                        href={`/kegiatan/${item.slug}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          rekamAsalMorphDari(e.currentTarget);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-normal text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/20"
                      >
                        Detail
                        <ArrowRight weight="bold" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={changePage}
            className="mt-12"
          />
        </>
      )}
      </StateCrossfade>
    </div>
  );
}
