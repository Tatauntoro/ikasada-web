"use client";

import { useEffect, useState } from "react";

/**
 * Pembaca konfigurasi beranda untuk komponen klien.
 *
 * Fetch dibagi lewat satu promise tingkat-modul, jadi beberapa section di
 * halaman yang sama tidak memicu permintaan berulang ke `/api/public/beranda`.
 */

export type SectionBerandaPublic = {
  kunci: string;
  aktif: boolean;
  urutan: number;
  judul: string | null;
  eyebrow: string | null;
  deskripsi: string | null;
  konfigurasi: Record<string, unknown> | null;
};

export type TitikSebaranPublic = { nama: string; lat: number; lng: number };

export type BerandaPublic = {
  sections: SectionBerandaPublic[];
  sebaran: TitikSebaranPublic[];
};

let janji: Promise<BerandaPublic | null> | null = null;

function ambil(): Promise<BerandaPublic | null> {
  if (!janji) {
    janji = fetch("/api/public/beranda")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j?.data as BerandaPublic) ?? null)
      .catch(() => null);
  }
  return janji;
}

export function useBerandaConfig(): BerandaPublic | null {
  const [data, setData] = useState<BerandaPublic | null>(null);

  useEffect(() => {
    let hidup = true;
    ambil().then((d) => {
      if (hidup) setData(d);
    });
    return () => {
      hidup = false;
    };
  }, []);

  return data;
}

/** Apakah section aktif? Default `true` bila config belum termuat. */
export function sectionAktif(
  beranda: BerandaPublic | null,
  kunci: string
): boolean {
  return beranda?.sections.find((s) => s.kunci === kunci)?.aktif ?? true;
}

/** Teks dari config, atau `fallback` bila kosong/belum termuat. */
export function teksSection(
  beranda: BerandaPublic | null,
  kunci: string,
  bidang: "judul" | "eyebrow" | "deskripsi",
  fallback: string
): string {
  const nilai = beranda?.sections.find((s) => s.kunci === kunci)?.[bidang];
  return nilai && nilai.trim() ? nilai : fallback;
}
