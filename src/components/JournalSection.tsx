"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { PublicKerjasama } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { reportAssetError } from "@/lib/asset-error";
import {
  CoverflowCarousel,
  type CoverflowSlide,
} from "./ui/coverflow-carousel";
import styles from "./JournalSection.module.css";

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
 * Kartu-kartu bertumpuk diganti coverflow: satu kartu di tengah, sisanya mundur
 * dan miring ke belakang. Isi kartunya tetap seperti sebelumnya — organisasi dan
 * kegiatan utamanya, plus tautan ke halaman detail.
 */
function toSlides(daftar: PublicKerjasama[]): CoverflowSlide[] {
  return daftar.map((item) => ({
    src: item.imageUrl ?? GAMBAR_CADANGAN,
    alt: item.alt,
    title: item.organisasi,
    subtitle: item.programUtama,
    href: `/kerjasama/${item.slug}`,
  }));
}

export default function JournalSection() {
  const [slides, setSlides] = useState<CoverflowSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const hasil = await panggilApi<PublicKerjasama[]>("/api/public/kerjasama");

    if (!hasil.ok) {
      reportAssetError("/api/public/kerjasama", "api");
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    setSlides(toSlides(hasil.data));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Tidak ada yang dipublikasikan: section tidak perlu tampil kosong.
  if (!isLoading && !error && slides.length === 0) {
    return null;
  }

  return (
    <section
      id="journal"
      className={`${styles.section} ${plusJakartaSans.className} reveal-section`}
      aria-labelledby="journal-title"
    >
      <div className={styles.header}>
        <h2
          id="journal-title"
          className={`${styles.title} section-title section-title--terang`}
        >
          Kerjasama Kami
        </h2>
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

      {!isLoading && !error && slides.length > 0 && (
        <div className={styles.carousel}>
          <CoverflowCarousel
            slides={slides}
            label="Kerjasama kami"
            cardWidth="clamp(190px, 24vw, 320px)"
            showCaption
            showNavigation
            showPagination
            lightText
          />
        </div>
      )}
    </section>
  );
}
