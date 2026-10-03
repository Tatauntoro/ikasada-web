"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicBerita } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import Pagination from "./Pagination";
import { BeritaRow } from "./BeritaSection";

/** Jumlah berita per halaman di `/berita`. */
const PER_PAGE = 6;

type BeritaDirectoryProps = {
  /** Halaman pertama, sudah dirender server — lihat `src/app/berita/page.tsx`. */
  awal: PublicBerita[];
  totalAwal: number;
};

/**
 * Daftar berita berhalaman untuk `/berita`.
 *
 * Halaman pertama datang dari server (HTML awal sudah berisi berita), lalu
 * pergantian halaman mengambil dari `/api/public/berita` — pola yang sama
 * dengan `ArsipDirectory`.
 */
export default function BeritaDirectory({
  awal,
  totalAwal,
}: BeritaDirectoryProps) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PublicBerita[]>(awal);
  const [total, setTotal] = useState(totalAwal);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daftarRef = useRef<HTMLDivElement>(null);
  // Render pertama memakai data dari server; jangan langsung menimpa dengan
  // hasil fetch yang isinya sama.
  const lewatiFetchPertama = useRef(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const hasil = await panggilApi<PublicBerita[]>(
      `/api/public/berita?page=${page}&limit=${PER_PAGE}`
    );

    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    setData(hasil.data);
    setTotal(hasil.meta?.total ?? hasil.data.length);
    setIsLoading(false);
  }, [page]);

  useEffect(() => {
    if (lewatiFetchPertama.current) {
      lewatiFetchPertama.current = false;
      return;
    }
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const gantiHalaman = (next: number) => {
    setPage(next);
    daftarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={daftarRef}>
      {error && (
        <div className="mt-6 flex items-center justify-between gap-4 border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchData}
            className="font-bold hover:underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {isLoading ? (
        <ul className="border-t border-black/10">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <li key={i} className="border-b border-black/10 py-6">
              <div className="flex animate-pulse items-start gap-5 sm:gap-6">
                <span className="h-[104px] w-[136px] flex-none rounded-[12px] bg-black/10 sm:h-[120px] sm:w-[168px]" />
                <span className="flex flex-1 flex-col gap-3">
                  <span className="h-5 w-20 self-end rounded-full bg-black/10" />
                  <span className="h-5 w-3/4 bg-black/10" />
                  <span className="h-3 w-40 bg-black/[0.07]" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="border-t border-black/10">
          {data.map((item) => (
            <BeritaRow key={item.slug} item={item} />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={gantiHalaman}
        className="mt-12"
      />
    </div>
  );
}
