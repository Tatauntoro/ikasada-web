"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import { useLoader } from "../LoaderProvider";
import {
  gayaBackgroundSection,
  sectionAktif,
  teksSection,
  useBerandaConfig,
} from "@/lib/beranda-client";
import {
  HERO_POSTER_BAWAAN,
  HERO_VIDEO_BAWAAN,
  type KonfigurasiHero,
} from "@/lib/beranda";
import { scrollToSection } from "@/lib/scroll";
import styles from "./video-hero.module.css";

function konfigurasiHeroDari(nilai: unknown): KonfigurasiHero {
  if (!nilai || typeof nilai !== "object" || Array.isArray(nilai)) {
    return {
      mode: "video",
      videoUrl: HERO_VIDEO_BAWAAN,
      posterUrl: HERO_POSTER_BAWAAN,
      fotoUrls: [],
    };
  }
  const config = nilai as Partial<KonfigurasiHero>;
  const mode =
    config.mode === "foto" || config.mode === "slideshow" ? config.mode : "video";
  return {
    mode,
    videoUrl:
      typeof config.videoUrl === "string" && config.videoUrl
        ? config.videoUrl
        : HERO_VIDEO_BAWAAN,
    posterUrl:
      typeof config.posterUrl === "string" && config.posterUrl
        ? config.posterUrl
        : HERO_POSTER_BAWAAN,
    fotoUrls: Array.isArray(config.fotoUrls)
      ? config.fotoUrls.filter((url): url is string => typeof url === "string" && url.length > 0)
      : [],
  };
}

/**
 * Hero beranda: video latar layar penuh dengan teks rata kiri di atasnya.
 *
 * Video diputar otomatis (tanpa tombol kontrol) hanya saat section terlihat,
 * tab aktif, dan pengunjung tidak meminta reduced-motion / tidak mengaktifkan
 * mode hemat data — kalau salah satu tidak terpenuhi, poster statis yang tampil.
 */
export default function VideoHero() {
  const { ready } = useLoader();
  const beranda = useBerandaConfig();
  const heroSection = beranda?.sections.find((section) => section.kunci === "hero");
  const gayaBackgroundHero = gayaBackgroundSection(beranda, "hero");
  const heroConfig = konfigurasiHeroDari(heroSection?.konfigurasi);
  const videoMode = heroConfig.mode === "video";
  const fotoUrls = heroConfig.fotoUrls.length
    ? heroConfig.fotoUrls
    : [HERO_POSTER_BAWAAN];
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useRef(true);
  const [allowed, setAllowed] = useState(false);
  const [siap, setSiap] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // Hormati reduced-motion dan mode hemat data: kalau keduanya menyala, video
  // tidak pernah diputar dan hero memakai poster.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean };
      }
    ).connection;
    const update = () => setAllowed(!media.matches && !connection?.saveData);
    update();
    media.addEventListener("change", update);
    connection?.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
    };
  }, []);

  const selaras = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (
      videoMode &&
      allowed &&
      inView.current &&
      !document.hidden
    ) {
      void video.play().catch(() => {
        /* Autoplay diblokir: biarkan poster yang tampil. */
      });
    } else {
      video.pause();
    }
  }, [allowed, videoMode]);

  // Putar hanya saat hero terlihat, jeda saat keluar viewport atau tab disembunyikan.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        selaras();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    const visibilitas = () => selaras();
    document.addEventListener("visibilitychange", visibilitas);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilitas);
    };
  }, [selaras]);

  // Selaras setelah veil preloader membuka beranda.
  useEffect(() => {
    if (ready) selaras();
  }, [ready, selaras]);

  useEffect(() => {
    if (heroConfig.mode !== "slideshow" || !allowed || fotoUrls.length < 2) return;
    const timer = window.setInterval(() => {
      setSlideIndex((index) => (index + 1) % fotoUrls.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [allowed, heroConfig.mode, fotoUrls.length]);
  const activeSlideIndex = fotoUrls.length ? slideIndex % fotoUrls.length : 0;

  return (
    <section
      id="hero"
      ref={root}
      className={styles.hero}
      style={gayaBackgroundHero}
      aria-label="IKASADA FIB UI"
    >
      <div className={styles.media} aria-hidden="true">
        <Image
          src={heroConfig.mode === "video" ? heroConfig.posterUrl : HERO_POSTER_BAWAAN}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.poster}
        />
        {heroConfig.mode === "video" ? (
          <video
            key={heroConfig.videoUrl}
            ref={videoRef}
            className={styles.video}
            data-visible={siap ? "" : undefined}
            src={heroConfig.videoUrl}
            poster={heroConfig.posterUrl}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
            onLoadStart={() => setSiap(false)}
            onPlay={() => setSiap(true)}
          />
        ) : (
          fotoUrls.map((url, index) => (
            <Image
              key={`${url}-${index}`}
              src={url}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className={styles.photo}
              data-visible={
                heroConfig.mode === "foto" ||
                (allowed && index === activeSlideIndex) ||
                (!allowed && index === 0)
                  ? ""
                  : undefined
              }
            />
          ))
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.logo}>
          <Image
            src="/logo/ikasada-logo.jpeg"
            alt="IKASADA FIB UI"
            width={64}
            height={80}
          />
        </div>
        <p className={styles.description}>
          {teksSection(
            beranda,
            "hero",
            "deskripsi",
            "Ruang jejaring dan kontribusi antar alumni"
          )}
        </p>
        <h1 className={styles.tagline}>
          {teksSection(
            beranda,
            "hero",
            "judul",
            "Dari Akar Yang Sama, Tumbuh Jauh Bersama"
          )}
        </h1>
        {sectionAktif(beranda, "direktori-alumni") && (
          <button
            type="button"
            className={styles.cta}
            onClick={() => scrollToSection("alumni", "alumni-search")}
          >
            Cari alumni <ArrowRight weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
