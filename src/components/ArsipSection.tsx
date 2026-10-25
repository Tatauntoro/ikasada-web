"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import type { PublicArsip } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { reportAssetError } from "@/lib/asset-error";
import { keTeksBiasa } from "@/lib/rich-text";
import styles from "./ArsipSection.module.css";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";

/** Berapa dokumen terbaru yang dipratinjau di beranda. */
const TAMPIL = 4;

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Section Arsip di beranda.
 *
 * Menampilkan dokumen terbaru dalam daftar interaktif dengan satu sampul
 * pratinjau. Direktori lengkap tetap berada di `/arsip`.
 *
 * Datanya datang dari `/api/public/arsip`, bukan lagi array statis, dan
 * diambil di klien karena beranda dirender statis — kalau query-nya di server,
 * dokumen baru tidak muncul sampai build berikutnya.
 */
export default function ArsipSection() {
  const beranda = useBerandaConfig();
  const [dokumen, setDokumen] = useState<PublicArsip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [failedCovers, setFailedCovers] = useState<string[]>([]);
  const [portalReady, setPortalReady] = useState(false);
  const cursorPreviewRef = useRef<HTMLDivElement>(null);
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const currentPositionRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);

  const animatePreview = useCallback(() => {
    const preview = cursorPreviewRef.current;
    if (!preview) {
      animationRef.current = null;
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const factor = reduceMotion ? 1 : 0.18;
    const current = currentPositionRef.current;
    const target = targetPositionRef.current;
    current.x += (target.x - current.x) * factor;
    current.y += (target.y - current.y) * factor;
    preview.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;

    if (
      Math.abs(target.x - current.x) > 0.35 ||
      Math.abs(target.y - current.y) > 0.35
    ) {
      animationRef.current = window.requestAnimationFrame(animatePreview);
    } else {
      animationRef.current = null;
    }
  }, []);

  const jadwalkanPosisiPreview = useCallback(
    (index: number, clientX: number, clientY: number) => {
      if (activeIndexRef.current !== index) {
        activeIndexRef.current = index;
        setActiveIndex(index);
      }

      const width = 278;
      const height = 186;
      const margin = 16;
      let x = clientX + 22;
      if (x + width > window.innerWidth - margin) {
        x = clientX - width - 22;
      }

      targetPositionRef.current = {
        x: Math.max(margin, Math.min(window.innerWidth - width - margin, x)),
        y: Math.max(
          margin,
          Math.min(window.innerHeight - height - margin, clientY - 96)
        ),
      };

      cursorPreviewRef.current?.classList.add(styles.previewVisible);
      if (animationRef.current === null) {
        animationRef.current = window.requestAnimationFrame(animatePreview);
      }
    },
    [animatePreview]
  );

  const hidePreview = useCallback(() => {
    activeIndexRef.current = null;
    setActiveIndex(null);
    cursorPreviewRef.current?.classList.remove(styles.previewVisible);
  }, []);

  const focusPreview = useCallback(
    (event: FocusEvent<HTMLAnchorElement>, index: number) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      jadwalkanPosisiPreview(index, bounds.right, bounds.top + bounds.height / 2);
    },
    [jadwalkanPosisiPreview]
  );

  const movePreview = useCallback(
    (event: PointerEvent<HTMLAnchorElement>, index: number) => {
      if (event.pointerType !== "touch") {
        jadwalkanPosisiPreview(index, event.clientX, event.clientY);
      }
    },
    [jadwalkanPosisiPreview]
  );

  const leaveSection = useCallback(() => {
    hidePreview();
  }, [hidePreview]);

  const blurSection = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        hidePreview();
      }
    },
    [hidePreview]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const hasil = await panggilApi<PublicArsip[]>(
      `/api/public/arsip?limit=${TAMPIL}`
    );

    if (!hasil.ok) {
      reportAssetError("/api/public/arsip", "api");
      setIsLoading(false);
      return;
    }

    setDokumen(hasil.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Portal ini berada di body agar efek reveal pada section tidak mengikat
    // posisi fixed sampul ke kotak section.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalReady(true);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const eyebrowArsip = teksSection(beranda, "arsip", "eyebrow", "Arsip");
  const judulArsip = teksSection(
    beranda,
    "arsip",
    "judul",
    "Dokumen & Laporan."
  );
  const gayaJudulArsip = gayaSection(beranda, "arsip", "judul");
  const gayaEyebrowArsip = gayaSection(beranda, "arsip", "eyebrow");
  const gayaBackgroundArsip = gayaBackgroundSection(beranda, "arsip");
  const ampersandIndex = judulArsip.indexOf("&");
  const coverFailed = (url: string) => {
    reportAssetError(url, "image");
    setFailedCovers((previous) =>
      previous.includes(url) ? previous : [...previous, url]
    );
  };

  // Section dimatikan atau tidak ada dokumen terbit: jangan tampil kosong.
  if (!sectionAktif(beranda, "arsip")) return null;
  if (!isLoading && dokumen.length === 0) {
    return null;
  }

  return (
    <section
      id="arsip"
      style={gayaBackgroundArsip}
      className={`home-jakarta-section ${plusJakartaSans.className} ${styles.section} relative overflow-hidden border-y border-[rgba(0,0,0,0.06)] bg-white py-9 pb-7 md:pt-[50px] md:pb-8 reveal-section`}
      onPointerLeave={leaveSection}
      onBlurCapture={blurSection}
    >
      <div className="home-section-container relative z-10">
        <header className={styles.header}>
          <span
            className={`reveal-item section-label ${styles.eyebrow}`}
            style={gayaEyebrowArsip}
          >
            {eyebrowArsip}
          </span>
          <h2
            className={`reveal-item section-title ${styles.title}`}
            style={gayaJudulArsip}
          >
            {ampersandIndex === -1 ? (
              judulArsip
            ) : (
              <>
                {judulArsip.slice(0, ampersandIndex)}
                <span className={gayaJudulArsip?.color ? undefined : styles.ampersand}>
                  &amp;
                </span>
                {judulArsip.slice(ampersandIndex + 1)}
              </>
            )}
          </h2>
        </header>

        {isLoading ? (
          <div className={styles.list} aria-label="Memuat arsip">
            {Array.from({ length: TAMPIL }).map((_, index) => (
              <div key={index} className={styles.skeleton} aria-hidden="true" />
            ))}
          </div>
        ) : (
          <div className={styles.content}>
            <ol className={styles.list} aria-label="Daftar dokumen terbaru">
              {dokumen.map((item, index) => {
                const tahun = new Date(item.tanggalUpload).getFullYear();

                return (
                  <li key={item.id} className={styles.listItem}>
                    <Link
                      href={`/arsip/${item.slug}`}
                      className={styles.choice}
                      data-active={activeIndex === index}
                      onPointerEnter={(event) => movePreview(event, index)}
                      onPointerMove={(event) => movePreview(event, index)}
                      onFocus={(event) => focusPreview(event, index)}
                    >
                      <span className={styles.choiceCopy}>
                        <span className={styles.choiceMeta}>
                          <span>{String(index + 1).padStart(2, "0")} / {item.jenis.nama}</span>
                          <span aria-hidden="true">·</span>
                          <span>{Number.isNaN(tahun) ? "Arsip" : tahun}</span>
                          {item.berkasFormat && <span>· {item.berkasFormat.toUpperCase()}</span>}
                          {item.terkunci && <span className={styles.locked}>Khusus alumni</span>}
                        </span>
                        <span className={styles.choiceTitle}>{item.judul}</span>
                        <span className={styles.description}>
                          {keTeksBiasa(item.deskripsiSingkat)}
                        </span>
                      </span>
                      <span className={styles.choiceEnd} aria-hidden="true">
                        <ArrowUpRight weight="regular" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {!isLoading && portalReady &&
          createPortal(
            <div
              ref={cursorPreviewRef}
              className={styles.cursorPreview}
              aria-hidden="true"
            >
              {dokumen.map((item, index) => {
                const coverUrl =
                  item.gambarSampulUrl &&
                  !failedCovers.includes(item.gambarSampulUrl)
                    ? item.gambarSampulUrl
                    : null;

                return (
                  <figure
                    key={item.id}
                    className={styles.previewLayer}
                    data-active={activeIndex === index}
                    data-kind={item.jenis.nama.toLowerCase()}
                  >
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="278px"
                        onError={() => coverFailed(coverUrl)}
                      />
                    ) : (
                      <div className={styles.coverFallback}>
                        <span>IKASADA / {String(index + 1).padStart(2, "0")}</span>
                        <strong>{item.judul}</strong>
                        <small>{item.jenis.nama} · {item.berkasFormat?.toUpperCase() || "ARSIP"}</small>
                      </div>
                    )}
                    <span className={styles.coverShade} />
                  </figure>
                );
              })}
            </div>,
            document.body
          )}

        <div className={`reveal-item ${styles.footer}`}>
          <Link href="/arsip" className="augen-cta whitespace-nowrap px-5">
            Lihat Semua Arsip
            <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
