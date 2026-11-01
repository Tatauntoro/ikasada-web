"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicBerita, PublicJenisBerita } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import Pagination from "./Pagination";
import { BeritaRow } from "./BeritaSection";
import FilterSelect from "./FilterSelect";
import { ArrowsCounterClockwise, Files, MagnifyingGlass } from "@phosphor-icons/react";

/** Jumlah berita per halaman di `/berita`. */
const PER_PAGE = 6;
const JEDA_CARI_MS = 400;

type BeritaDirectoryProps = {
  /** Halaman pertama, sudah dirender server — lihat `src/app/berita/page.tsx`. */
  awal: PublicBerita[];
  totalAwal: number;
  jenisAwal: PublicJenisBerita[];
  tahunAwal: string[];
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
  jenisAwal,
  tahunAwal,
}: BeritaDirectoryProps) {
  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState("");
  const [tahun, setTahun] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PublicBerita[]>(awal);
  const [total, setTotal] = useState(totalAwal);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daftarRef = useRef<HTMLDivElement>(null);
  const requestTerbaru = useRef(0);
  // Render pertama memakai data dari server; jangan langsung menimpa dengan
  // hasil fetch yang isinya sama.
  const lewatiFetchPertama = useRef(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), JEDA_CARI_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    const request = ++requestTerbaru.current;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PER_PAGE));
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (jenis) params.set("jenisId", jenis);
    if (tahun) params.set("tahun", tahun);

    const hasil = await panggilApi<PublicBerita[]>(`/api/public/berita?${params.toString()}`);
    if (request !== requestTerbaru.current) return;

    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    setData(hasil.data);
    setTotal(hasil.meta?.total ?? hasil.data.length);
    setIsLoading(false);
  }, [page, jenis, tahun, debouncedSearch]);

  useEffect(() => {
    if (lewatiFetchPertama.current) {
      lewatiFetchPertama.current = false;
      return;
    }
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const mulai = (page - 1) * PER_PAGE;
  const rentang = total === 0 ? "0" : `${mulai + 1}–${Math.min(mulai + PER_PAGE, total)}`;

  const reset = () => {
    setSearch("");
    setJenis("");
    setTahun("");
    setPage(1);
  };

  const gantiHalaman = (next: number) => {
    setPage(next);
    daftarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={daftarRef}>
      <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-4 border-b border-[rgba(0,0,0,0.22)] pb-3">
        <label className="flex min-w-[200px] flex-1 items-center gap-2">
          <MagnifyingGlass weight="bold" className="flex-none text-black/40" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari judul atau keterangan berita…"
            aria-label="Cari berita"
            className="w-full border-0 bg-transparent text-[14px] text-[#0f1012] outline-0 placeholder:text-[#5e5e5e]"
          />
        </label>

        <FilterSelect
          value={jenis}
          onChange={(value) => { setJenis(value); setPage(1); }}
          ariaLabel="Filter jenis berita"
        >
          <option value="">Semua Jenis</option>
          {jenisAwal.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
        </FilterSelect>

        <FilterSelect
          value={tahun}
          onChange={(value) => { setTahun(value); setPage(1); }}
          ariaLabel="Filter tahun berita"
        >
          <option value="">Semua Tahun</option>
          {tahunAwal.map((item) => <option key={item} value={item}>{item}</option>)}
        </FilterSelect>

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 text-[13px] font-normal text-[#5e5e5e] transition-colors hover:text-[#0f1012]"
        >
          <ArrowsCounterClockwise weight="bold" aria-hidden="true" />
          Reset
        </button>
      </div>

      <p className="mt-6 text-[13px] text-black/50" aria-live="polite">
        Menampilkan {rentang} dari {total} berita
      </p>

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
        <ul className="mt-2 border-t border-[#0B5ED7]/15">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <li key={i} className="border-b border-[#0B5ED7]/15 py-6">
              <div className="flex animate-pulse items-start gap-5 sm:gap-6">
                <span className="h-[104px] w-[136px] flex-none rounded-[12px] bg-[#0B5ED7]/10 sm:h-[120px] sm:w-[168px]" />
                <span className="flex flex-1 flex-col gap-3">
                  <span className="h-5 w-20 self-end rounded-full bg-[#0B5ED7]/10" />
                  <span className="h-5 w-3/4 bg-[#0B5ED7]/10" />
                  <span className="h-3 w-40 bg-[#0B5ED7]/[0.07]" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : data.length === 0 ? (
        <div className="py-16 text-center text-black/50">
          <Files weight="bold" className="mx-auto mb-2 text-4xl text-neutral-400" />
          <p>Tidak ada berita yang cocok dengan pencarian atau filter.</p>
        </div>
      ) : (
        <ul className="mt-2 border-t border-[#0B5ED7]/15">
          {data.map((item) => <BeritaRow key={item.slug} item={item} />)}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={gantiHalaman}
        tone="gold"
        className="mt-12"
      />
    </div>
  );
}
