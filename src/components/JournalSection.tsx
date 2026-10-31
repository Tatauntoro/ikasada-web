"use client";

import { bacaDataBeranda, simpanDataBeranda } from "@/lib/home-data-cache";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { PublicKerjasama } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { keTeksBiasa } from "@/lib/rich-text";
import { reportAssetError } from "@/lib/asset-error";
import styles from "./JournalSection.module.css";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";

const GAMBAR_CADANGAN = "/images/placeholder-event.jpg";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Section "Kerjasama Kami".
 *
 * Datanya diambil dari `GET /api/public/kerjasama`, bukan data statis lagi:
 * section ini ikut halaman `/` yang dirender statis, jadi query Prisma langsung
 * di server component akan menyajikan data basi sampai build berikutnya.
 * Pola fetch kliennya sama dengan section tetangga (EventsSection, StaffSection).
 *
 * Kartu menampilkan media, organisasi, program utama, dan profil singkat.
 * Daftar tetap diambil dari API publik agar perubahan admin langsung muncul.
 */
function KerjasamaCards({ items }: { items: PublicKerjasama[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState({ first: 0, visible: 1 });

  const measure = useCallback(() => {
    const track = trackRef.current;
    const firstCard = track?.querySelector<HTMLElement>("[data-kerjasama-card]");
    if (!track || !firstCard) return;

    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = firstCard.offsetWidth + gap;
    const visible = Math.min(items.length, Math.max(1, Math.round((track.clientWidth + gap) / step)));
    const first = Math.min(items.length - visible, Math.max(0, Math.round(track.scrollLeft / step)));
    setPagination((previous) =>
      previous.first === first && previous.visible === visible ? previous : { first, visible },
    );
  }, [items.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  function move(direction: number) {
    const track = trackRef.current;
    const firstCard = track?.querySelector<HTMLElement>("[data-kerjasama-card]");
    if (!track || !firstCard) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = firstCard.offsetWidth + gap;
    const lastStart = Math.max(0, items.length - pagination.visible);
    const target = Math.max(0, Math.min(lastStart, pagination.first + direction));
    track.scrollTo({
      left: target * step,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return (
    <div className={`${styles.gallery} home-section-container`}>
      <div
        ref={trackRef}
        className={styles.track}
        role="region"
        aria-roledescription="carousel"
        aria-label="Daftar kerjasama"
        tabIndex={0}
        onScroll={measure}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {items.map((item, index) => {
          const image = item.imageUrl ?? GAMBAR_CADANGAN;
          return (
            <Link
              key={item.id}
              data-kerjasama-card
              className={styles.card}
              href={`/kerjasama/${item.slug}`}
              aria-label={`Lihat kerjasama ${item.organisasi}`}
            >
              <span className={styles.visual}>
                <Image src={image} alt="" fill unoptimized sizes="(max-width: 620px) 88vw, (max-width: 950px) 45vw, 33vw" className={styles.visualBackdrop} aria-hidden="true" />
                <Image src={image} alt={item.alt || item.organisasi} fill unoptimized sizes="(max-width: 620px) 88vw, (max-width: 950px) 45vw, 33vw" className={styles.visualImage} />
              </span>
              <span className={styles.caption}>
                <span className={styles.meta}>{String(index + 1).padStart(2, "0")} / {keTeksBiasa(item.programUtama)}</span>
                <span className={styles.cardTitle}>{item.organisasi}</span>
                <span className={styles.subtitle}>{keTeksBiasa(item.profil)}</span>
                <span className={styles.cardLink}>Lihat kerjasama <span aria-hidden="true">↗</span></span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className={styles.galleryFooter}>
        <span className={styles.pageIndicator} aria-live="polite">
          <strong>{String(pagination.first + 1).padStart(2, "0")}–{String(Math.min(items.length, pagination.first + pagination.visible)).padStart(2, "0")}</strong> / {String(items.length).padStart(2, "0")}
        </span>
        <div className={styles.controls} aria-label="Navigasi kerjasama">
          <button type="button" onClick={() => move(-1)} disabled={pagination.first === 0} aria-label="Kerjasama sebelumnya">←</button>
          <button type="button" onClick={() => move(1)} disabled={pagination.first + pagination.visible >= items.length} aria-label="Kerjasama berikutnya">→</button>
        </div>
      </div>
    </div>
  );
}

export default function JournalSection() {
  const beranda = useBerandaConfig();
  const [items, setItems] = useState<PublicKerjasama[]>(() => bacaDataBeranda<PublicKerjasama[]>("kerjasama") ?? []);
  const [isLoading, setIsLoading] = useState(() => bacaDataBeranda("kerjasama") === undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const cached = bacaDataBeranda<PublicKerjasama[]>("kerjasama");
    if (cached !== undefined) { setItems(cached); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);

    const hasil = await panggilApi<PublicKerjasama[]>("/api/public/kerjasama");

    if (!hasil.ok) {
      reportAssetError("/api/public/kerjasama", "api");
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    simpanDataBeranda("kerjasama", hasil.data);
    setItems(hasil.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const eyebrowKerjasama = teksSection(
    beranda,
    "kerjasama",
    "eyebrow",
    "Kerjasama"
  );
  const judulKerjasama = teksSection(
    beranda,
    "kerjasama",
    "judul",
    "Kerjasama Kami"
  );
  const gayaJudulKerjasama = gayaSection(beranda, "kerjasama", "judul");
  const gayaEyebrowKerjasama = gayaSection(beranda, "kerjasama", "eyebrow");
  const gayaBackgroundKerjasama = gayaBackgroundSection(beranda, "kerjasama");

  // Section dimatikan atau tidak ada yang dipublikasikan: jangan tampil kosong.
  if (!sectionAktif(beranda, "kerjasama")) return null;
  if (!isLoading && !error && items.length === 0) {
    return null;
  }

  return (
    <section
      id="journal"
      className={`${styles.section} ${plusJakartaSans.className} reveal-section`}
      style={gayaBackgroundKerjasama}
      aria-labelledby="journal-title"
    >
      <div className={`${styles.header} home-section-container`}>
        <div className={styles.headerText}>
          <span
            className={`${styles.eyebrow} section-label`}
            style={gayaEyebrowKerjasama}
          >
            {eyebrowKerjasama}
          </span>
          <h2
            id="journal-title"
            className={`${styles.title} section-title`}
            style={gayaJudulKerjasama}
          >
            {judulKerjasama}
          </h2>
        </div>
      </div>

      {isLoading && (
        <div className={styles.skeleton} aria-hidden="true">
          <span className={styles.skeletonCard} />
          <span className={styles.skeletonCard} />
          <span className={styles.skeletonCard} />
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.pesan}>
          <p>{error}</p>
          <button onClick={fetchData} className="augen-cta mt-4 px-5">
            Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <KerjasamaCards items={items} />
      )}
    </section>
  );
}
