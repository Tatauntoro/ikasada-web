"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight } from "@phosphor-icons/react";
import type { PublicKegiatan } from "@/lib/types";
import { formatTanggalWIB } from "@/lib/format";
import { keTeksBiasa } from "@/lib/rich-text";
import { rekamAsalMorphDari } from "./motion/ImageMorph";
import styles from "./EventsSection.module.css";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";

const LIMIT = 4;
const THEMES = [styles.themeBlue, styles.themeYellow, styles.themeSoft, styles.themeDeep];

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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

function batasi(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(start: number, end: number, value: number) {
  const step = batasi((value - start) / (end - start));
  return step * step * (3 - 2 * step);
}

export default function EventsSection() {
  const beranda = useBerandaConfig();
  const [data, setData] = useState<PublicKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const articleRefs = useRef<Array<HTMLElement | null>>([]);
  const layerRefs = useRef<Array<HTMLElement | null>>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/kegiatan?limit=${LIMIT}`);
      const result: ListResponse = await response.json();
      if (!response.ok) {
        const err = result as unknown as { error?: { message?: string } };
        setError(err?.error?.message || "Gagal memuat kegiatan");
        return;
      }
      setData(result.data);
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isLoading || error || data.length < 2) return;

    const desktop = window.matchMedia("(min-width: 801px)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const sinkronkanGambar = () => {
      frame = 0;
      if (!desktop.matches) return;

      const viewportHeight = window.innerHeight;
      for (let index = 1; index < data.length; index += 1) {
        const article = articleRefs.current[index];
        const currentLayer = layerRefs.current[index];
        const previousLayer = layerRefs.current[index - 1];
        if (!article || !currentLayer || !previousLayer) continue;

        const progress = batasi(1 - article.getBoundingClientRect().top / viewportHeight);
        const shown = reduceMotion.matches ? Number(progress >= 0.5) : progress;
        currentLayer.style.transform = `translate3d(0, ${(1 - shown) * 100}%, 0)`;

        const previousImage = previousLayer.querySelector("img");
        if (previousImage) {
          previousImage.style.opacity = reduceMotion.matches
            ? "1"
            : String(1 - smoothstep(0.35, 0.95, progress));
        }
      }
    };

    const jadwalkan = () => {
      if (!frame) frame = window.requestAnimationFrame(sinkronkanGambar);
    };

    window.addEventListener("scroll", jadwalkan, { passive: true });
    window.addEventListener("resize", jadwalkan);
    desktop.addEventListener("change", jadwalkan);
    reduceMotion.addEventListener("change", jadwalkan);
    sinkronkanGambar();

    return () => {
      window.removeEventListener("scroll", jadwalkan);
      window.removeEventListener("resize", jadwalkan);
      desktop.removeEventListener("change", jadwalkan);
      reduceMotion.removeEventListener("change", jadwalkan);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [data, error, isLoading]);

  const eyebrowKegiatan = teksSection(beranda, "kegiatan", "eyebrow", "Kegiatan");
  const judulKegiatan = teksSection(
    beranda,
    "kegiatan",
    "judul",
    "Hadiri Kegiatan Kami."
  );
  const gayaJudulKegiatan = gayaSection(beranda, "kegiatan", "judul");
  const gayaEyebrowKegiatan = gayaSection(beranda, "kegiatan", "eyebrow");
  const gayaBackgroundKegiatan = gayaBackgroundSection(beranda, "kegiatan");

  if (!sectionAktif(beranda, "kegiatan")) return null;

  return (
    <section
      id="kegiatan"
      className={`home-jakarta-section ${plusJakartaSans.className} ${styles.section}`}
      style={gayaBackgroundKegiatan}
      aria-labelledby="kegiatan-title"
    >
      <header className={styles.heading}>
        <span className={styles.eyebrow} style={gayaEyebrowKegiatan}>
          {eyebrowKegiatan}
        </span>
        <h2 id="kegiatan-title" className={styles.headingTitle} style={gayaJudulKegiatan}>
          {judulKegiatan}
        </h2>
      </header>

      {isLoading && (
        <div className={styles.loading} aria-label="Memuat kegiatan">
          <div />
          <div />
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.message}>
          <p>{error}</p>
          <button onClick={fetchData} className="augen-cta mt-4 px-5">
            Coba Lagi
            <ArrowRight weight="bold" aria-hidden="true" />
          </button>
        </div>
      )}

      {!isLoading && !error && data.length === 0 && (
        <div className={styles.message}>Belum ada kegiatan yang tersedia.</div>
      )}

      {!isLoading && !error && data.length > 0 && (
        <div className={styles.agendaList}>
          <div className={styles.copyStack}>
            <div className={styles.agendaCta}>
              <Link href="/event">Lihat semua agenda</Link>
            </div>

            {data.map((item, index) => (
              <article
                key={item.id}
                ref={(element) => { articleRefs.current[index] = element; }}
                className={`${styles.projectCopy} ${THEMES[index % THEMES.length]}`}
              >
                <span className={styles.projectIndex}>
                  IKASADA / {String(index + 1).padStart(2, "0")}
                </span>

                <div className={styles.projectBody}>
                  <div className={styles.projectMeta}>
                    <span className={styles.projectType}>
                      {item.kategori || "Kegiatan"} · {item.lokasi}
                    </span>
                    <time className={styles.projectDate} dateTime={item.tanggalMulai}>
                      {formatTanggalWIB(item.tanggalMulai)}
                    </time>
                  </div>
                  <h3 className={styles.projectTitle}>{item.judul}</h3>
                  <p className={styles.projectDescription}>
                    {keTeksBiasa(item.deskripsiSingkat)}
                  </p>
                  <Link
                    href={`/kegiatan/${item.slug}`}
                    onClick={(event) => rekamAsalMorphDari(event.currentTarget)}
                    className={styles.detailLink}
                  >
                    Lihat kegiatan <span aria-hidden="true">↗</span>
                  </Link>
                </div>

                <div className={styles.projectFooter}>
                  <span>Agenda pilihan</span>
                  <span>
                    {String(index + 1).padStart(2, "0")} / {String(data.length).padStart(2, "0")}
                  </span>
                </div>

                <figure className={styles.mobilePhoto}>
                  {item.gambarThumbnailUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.gambarThumbnailUrl} alt={item.judul} loading={index ? "lazy" : "eager"} />
                  )}
                </figure>
              </article>
            ))}
          </div>

          <div className={styles.imageStage} aria-hidden="true">
            {data.map((item, index) => (
              <figure
                key={item.id}
                ref={(element) => { layerRefs.current[index] = element; }}
                className={styles.imageLayer}
              >
                {item.gambarThumbnailUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.gambarThumbnailUrl} alt="" loading={index ? "lazy" : "eager"} />
                )}
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
