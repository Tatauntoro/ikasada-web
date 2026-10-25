"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { KONTAK } from "@/data/kontak";

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
  /** Warna hex kustom untuk judul/eyebrow; `null` = pakai warna bawaan. */
  warnaJudul: string | null;
  warnaEyebrow: string | null;
  warnaBackground: string | null;
  /** Skala ukuran (%) untuk judul/eyebrow; `null`/`100` = ukuran bawaan. */
  ukuranJudul: number | null;
  ukuranEyebrow: number | null;
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
    janji = fetch("/api/public/beranda", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j?.data as BerandaPublic) ?? null)
      .catch(() => null);
  }
  return janji;
}

/** Buang konfigurasi publik yang tersimpan setelah admin menyimpan perubahan. */
export function invalidasiBerandaConfig(): void {
  janji = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ikasada:beranda-config-updated"));
  }
}

export function useBerandaConfig(): BerandaPublic | null {
  const [data, setData] = useState<BerandaPublic | null>(null);

  useEffect(() => {
    let hidup = true;
    const muat = () => {
      ambil().then((d) => {
        if (hidup) setData(d);
      });
    };
    muat();
    window.addEventListener("ikasada:beranda-config-updated", muat);
    return () => {
      hidup = false;
      window.removeEventListener("ikasada:beranda-config-updated", muat);
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

/**
 * Gaya inline (warna + skala ukuran) untuk judul/eyebrow section, atau
 * `undefined` bila keduanya kosong (memakai desain bawaan).
 *
 * Warna masuk sebagai `color`; ukuran masuk sebagai CSS custom property pengali
 * (`--skala-judul`/`--skala-eyebrow`) yang dipakai aturan `font-size` di CSS —
 * jadi `clamp()` responsifnya tetap berlaku.
 */
export function gayaSection(
  beranda: BerandaPublic | null,
  kunci: string,
  bidang: "judul" | "eyebrow"
): CSSProperties | undefined {
  const s = beranda?.sections.find((x) => x.kunci === kunci);
  if (!s) return undefined;

  const warna = bidang === "judul" ? s.warnaJudul : s.warnaEyebrow;
  const ukuran = bidang === "judul" ? s.ukuranJudul : s.ukuranEyebrow;

  const gaya: Record<string, string> = {};
  if (warna && warna.trim()) gaya.color = warna;
  if (ukuran && ukuran !== 100) {
    gaya[bidang === "judul" ? "--skala-judul" : "--skala-eyebrow"] = String(
      ukuran / 100
    );
  }

  return Object.keys(gaya).length > 0 ? (gaya as CSSProperties) : undefined;
}

/** Warna background khusus section, atau `undefined` untuk desain bawaan. */
export function gayaBackgroundSection(
  beranda: BerandaPublic | null,
  kunci: string
): CSSProperties | undefined {
  const warna = beranda?.sections.find((s) => s.kunci === kunci)?.warnaBackground;
  return warna && warna.trim()
    ? ({
        backgroundColor: warna,
        "--warna-background-section": warna,
      } as CSSProperties)
    : undefined;
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

/**
 * Email kanal kontak dari Kelola Beranda (section "kontak"), atau kanal resmi
 * bila pengurus mengosongkannya.
 *
 * Dipakai section Kontak di beranda dan ajakan menghubungi pengurus di halaman
 * arsip, supaya keduanya menunjuk alamat yang sama.
 */
export function emailKontakBeranda(beranda: BerandaPublic | null): string {
  const konfig = beranda?.sections.find((s) => s.kunci === "kontak")
    ?.konfigurasi as { email?: unknown } | null | undefined;
  const nilai = typeof konfig?.email === "string" ? konfig.email.trim() : "";
  return nilai || KONTAK.email;
}
