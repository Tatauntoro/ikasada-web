"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import { useLoader } from "../LoaderProvider";
import { sectionAktif, useBerandaConfig } from "@/lib/beranda-client";
import { scrollToSection } from "@/lib/scroll";
import styles from "./video-hero.module.css";

/* Video latar: rekaman drone berkeliling kampus, berkas lokal di `public/`. */
const VIDEO_SRC = "/Drone_sweeping_university_campus_20260919064355.mp4";
const POSTER_SRC = "/decoration/hero-arc-blue-green.webp";

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
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useRef(true);
  const [allowed, setAllowed] = useState(false);
  const [siap, setSiap] = useState(false);

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
    if (allowed && inView.current && !document.hidden) {
      void video.play().catch(() => {
        /* Autoplay diblokir: biarkan poster yang tampil. */
      });
    } else {
      video.pause();
    }
  }, [allowed]);

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

  return (
    <section id="hero" ref={root} className={styles.hero} aria-label="IKASADA FIB UI">
      <Image
        src={POSTER_SRC}
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.poster}
      />
      <video
        ref={videoRef}
        className={styles.video}
        data-visible={siap ? "" : undefined}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        /*
         * Visibilitas ditandai saat video benar-benar mulai diputar, bukan saat
         * `canplay`: di peramban cepat, `canplay` bisa menyala sebelum hidrasi
         * sehingga handler React-nya tidak pernah menerima event itu — videonya
         * lalu berputar tetapi tetap transparan.
         */
        onPlay={() => setSiap(true)}
      />
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
          Ruang jejaring dan kontribusi antar alumni
        </p>
        <h1 className={styles.tagline}>
          Dari Akar Yang Sama, Tumbuh Jauh Bersama
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
