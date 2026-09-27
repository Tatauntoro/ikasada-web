"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowsCounterClockwise,
  Files,
  Images,
  LockKey,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import type { PublicArsip, PublicJenisArsip } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { formatPeriodeKegiatan } from "@/lib/format";
import FilterSelect from "./FilterSelect";
import Pagination from "./Pagination";

const PER_PAGE = 6;
const JEDA_CARI_MS = 400;

/**
 * Satu baris arsip. Dipakai dua tempat — daftar di halaman `/arsip` dan section
 * Arsip di beranda — supaya keduanya tidak pernah berbeda tampilannya.
 *
 * `level` mengatur tag judulnya: 2 di halaman `/arsip` (halamannya cuma punya
 * satu `h1`), 3 di beranda (judul section-nya sendiri sudah `h2`, jadi baris
 * tidak boleh mengulang `h2`).
 */
export function ArsipRow({
  item,
  level = 2,
}: {
  item: PublicArsip;
  level?: 2 | 3;
}) {
  const Judul = level === 3 ? "h3" : "h2";

  return (
    <li className="border-b border-black/10">
      <Link
        href={`/arsip/${item.slug}`}
        className="group flex flex-col gap-3 py-7 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:flex-row sm:items-baseline sm:gap-8"
      >
        <span className="font-serif text-[17px] italic text-black/55 sm:w-44 sm:flex-none">
          {formatPeriodeKegiatan(
            item.tanggalKegiatanMulai,
            item.tanggalKegiatanSelesai
          )}
        </span>

        <div className="min-w-0 flex-1">
          <Judul className="font-display text-[21px] font-normal leading-tight tracking-[-0.02em] text-black decoration-black/30 underline-offset-4 group-hover:underline">
            {item.judul}
          </Judul>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-black/60">
            {item.deskripsiSingkat}
          </p>
        </div>

        <div className="flex flex-none items-center gap-2">
          {item.akses === "KHUSUS_ALUMNI" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-black/60">
              <LockKey weight="bold" aria-hidden="true" />
              {item.terkunci ? "Masuk untuk melihat" : "Khusus alumni"}
            </span>
          )}
          {item.jumlahMedia > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-black/60">
              <Images weight="bold" aria-hidden="true" />
              {item.jumlahMedia} media
            </span>
          )}
          <span className="rounded-full border border-black/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-black/60">
            {item.jenis.nama}
          </span>
          {item.berkasFormat && (
            <span className="rounded-full bg-black px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white">
              {item.berkasFormat}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

type ArsipDirectoryProps = {
  /** Halaman pertama, sudah dirender server — lihat `src/app/arsip/page.tsx`. */
  awal: PublicArsip[];
  totalAwal: number;
  jenisAwal: PublicJenisArsip[];
  tahunAwal: string[];
};

export default function ArsipDirectory({
  awal,
  totalAwal,
  jenisAwal,
  tahunAwal,
}: ArsipDirectoryProps) {
  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState("");
  const [tahun, setTahun] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PublicArsip[]>(awal);
  const [total, setTotal] = useState(totalAwal);
  const [daftarTahun, setDaftarTahun] = useState<string[]>(tahunAwal);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daftarRef = useRef<HTMLDivElement>(null);
  // Render pertama memakai data dari server; jangan langsung menimpa dengan
  // hasil fetch yang isinya sama.
  const lewatiFetchPertama = useRef(true);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), JEDA_CARI_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PER_PAGE));
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (jenis) params.set("jenisId", jenis);
    if (tahun) params.set("tahun", tahun);

    const hasil = await panggilApi<PublicArsip[]>(
      `/api/public/arsip?${params.toString()}`
    );

    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    setData(hasil.data);
    setTotal(hasil.meta?.total ?? hasil.data.length);

    const tahunTersedia = hasil.meta?.tahunTersedia;
    if (Array.isArray(tahunTersedia)) {
      setDaftarTahun(tahunTersedia);
    }

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
  const rentang =
    total === 0 ? "0" : `${mulai + 1}–${Math.min(mulai + PER_PAGE, total)}`;

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
      {/* Baris pencarian + filter */}
      <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-4 border-b border-[rgba(0,0,0,0.22)] pb-3">
        <label className="flex min-w-[200px] flex-1 items-center gap-2">
          <MagnifyingGlass weight="bold" className="flex-none text-black/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari judul / keterangan dokumen…"
            className="w-full border-0 bg-transparent text-[14px] text-[#0f1012] outline-0 placeholder:text-[#5e5e5e]"
          />
        </label>

        <FilterSelect
          value={jenis}
          onChange={(value) => {
            setJenis(value);
            setPage(1);
          }}
          ariaLabel="Filter jenis dokumen"
        >
          <option value="">Semua Jenis</option>
          {jenisAwal.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nama}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={tahun}
          onChange={(value) => {
            setTahun(value);
            setPage(1);
          }}
          ariaLabel="Filter tahun dokumen"
        >
          <option value="">Semua Tahun</option>
          {daftarTahun.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </FilterSelect>

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 text-[13px] font-normal text-[#5e5e5e] transition-colors hover:text-[#0f1012]"
        >
          <ArrowsCounterClockwise weight="bold" />
          Reset
        </button>
      </div>

      <p className="mt-6 text-[13px] text-black/50" aria-live="polite">
        Menampilkan {rentang} dari {total} dokumen
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
        <ul className="mt-2 border-t border-black/10">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
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
      ) : data.length === 0 ? (
        <div className="py-16 text-center text-black/50">
          <Files weight="bold" className="mx-auto mb-2 text-4xl text-neutral-400" />
          <p>Tidak ada arsip yang cocok dengan pencarian atau filter.</p>
        </div>
      ) : (
        <ul className="mt-2 border-t border-black/10">
          {data.map((item) => (
            <ArsipRow key={item.slug} item={item} />
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
