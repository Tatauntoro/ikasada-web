"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicKegiatan } from "./types";
import { bacaDataBeranda, simpanDataBeranda } from "./home-data-cache";

export const tanggalKegiatan = (value: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
export const labelKategori = (value: string) => value.toLocaleLowerCase("id-ID").replace(/(^|[\s_-])\S/g, c => c.toLocaleUpperCase("id-ID")).replace(/[_-]/g, " ");
export const formatAgenda = (value: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...options }).format(new Date(value));
export function agendaTerpilih(items: PublicKegiatan[], now: number) {
  return [...items].sort((a, b) => {
    const first = new Date(a.tanggalMulai).getTime(), second = new Date(b.tanggalMulai).getTime();
    if (first >= now && second >= now) return first - second;
    if (first < now && second < now) return second - first;
    return first >= now ? -1 : 1;
  })[0];
}

/** Metadata publik saja; paginasi dibaca sampai selesai agar kalender/filter lengkap. */
export function useKegiatanPublik() {
  const [items, setItems] = useState<PublicKegiatan[]>(() => bacaDataBeranda<PublicKegiatan[]>("kegiatan-katalog") ?? []);
  const [loading, setLoading] = useState(() => bacaDataBeranda("kegiatan-katalog") === undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    async function fetchData() {
      const cached = bacaDataBeranda<PublicKegiatan[]>("kegiatan-katalog");
      if (cached && attempt === 0) return;
      setLoading(true);
      setError(null);
      try {
        const all: PublicKegiatan[] = [];
        let page = 1, pages = 1;
        do {
          const response = await fetch(`/api/public/kegiatan?limit=100&page=${page}`, { signal: controller.signal });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.error?.message || "Gagal memuat kegiatan.");
          all.push(...result.data);
          pages = result.meta?.totalPages ?? 1;
          page++;
        } while (page <= pages);
        if (!controller.signal.aborted) {
          simpanDataBeranda("kegiatan-katalog", all);
          setItems(all);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Gagal memuat kegiatan. Silakan coba lagi.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void fetchData();
    return () => controller.abort();
  }, [attempt]);
  return { items, loading, error, retry };
}
