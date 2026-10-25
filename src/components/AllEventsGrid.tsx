"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicKegiatan } from "@/lib/types";
import { StateCrossfade } from "./motion/StateCrossfade";
import Pagination from "./Pagination";
import EventCard from "./EventCard";
import styles from "./AllEventsGrid.module.css";

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
    <div ref={topRef} className={styles.list}>
      <StateCrossfade stateKey={stateKey}>
      {isLoading && (
        <div className={styles.grid} aria-label="Memuat kegiatan">
          {Array.from({ length: perPage }).map((_, i) => (
            <div
              key={i}
              className={styles.skeleton}
            />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="py-12 text-center text-neutral-600">
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-full bg-[#0B5ED7] px-5 py-2 text-sm font-normal text-white transition-colors hover:bg-[#084BAA]"
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
          <div className={styles.grid}>
            {data.map((item) => (
              <EventCard key={item.id} item={item} headingLevel={2} />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={changePage}
            tone="gold"
            className="mt-12"
          />
        </>
      )}
      </StateCrossfade>
    </div>
  );
}
