"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import SplitType from "split-type";
import styles from "./morph-text.module.css";

/**
 * Morph entrance teks: tiap kata masuk dari blur + putaran 3D ke tempatnya.
 *
 * Preset-nya sengaja disamakan dengan OverviewSection supaya tekstur geraknya
 * konsisten satu halaman. Pemecahan kata dilakukan SplitType di dalam effect
 * (bukan saat render), jadi markup server dan klien tetap identik dan animasinya
 * tidak pernah bentrok dengan reveal global di ScrollExperience.
 *
 * Pemicunya dua mode:
 * - `trigger="manual"` (bawaan): menunggu prop `play` — dipakai hero yang baru
 *   boleh jalan setelah preloader `ready`.
 * - `trigger="view"`: mengamati dirinya sendiri lewat IntersectionObserver dan
 *   jalan sekali saat masuk viewport. Ini yang dipakai chapter `#tiga-cara`:
 *   tanpa mode ini, tiap chapter harus menyimpan state "sudah kelihatan", dan
 *   perubahan state itu me-render ulang seluruh chapter beserta globe 3D-nya.
 */

type Variant = "headline" | "body";
type Trigger = "manual" | "view";
type MotionProfile = "default" | "editorial";

/** Tag yang boleh dirender. Sengaja sempit agar union JSX tidak meledak. */
type TagName = "h1" | "h2" | "h3" | "p" | "span";

type MorphTextProps = {
  children: ReactNode;
  /** Tag yang dirender. Hero memakai "h1" dan "p". */
  as?: TagName;
  className?: string;
  /** Gerbang manual: mulai beranimasi saat true. Diabaikan bila `trigger="view"`. */
  play?: boolean;
  /** "manual" (bawaan) menunggu `play`; "view" jalan saat masuk viewport. */
  trigger?: Trigger;
  variant?: Variant;
  /** Jeda sebelum kata pertama, dalam detik. */
  delay?: number;
  /** Hentikan animasi juga saat browser mengaktifkan mode hemat data. */
  respectSaveData?: boolean;
  /** Gerak masuk lebih ringan untuk headline editorial. */
  motionProfile?: MotionProfile;
  /**
   * Tampilkan teks langsung dalam keadaan akhir, tanpa membelah kata dan tanpa
   * animasi. Dipakai hero saat intro beranda sengaja dilewati (navigasi
   * client-side kembali ke beranda).
   */
  lewati?: boolean;
};

const PRESET: Record<
  Variant,
  {
    rotationX: number;
    yPercent: number;
    blur: number;
    stagger: number;
    duration: number;
  }
> = {
  headline: {
    rotationX: -92,
    yPercent: 48,
    blur: 10,
    stagger: 0.05,
    duration: 0.85,
  },
  body: {
    rotationX: -60,
    yPercent: 30,
    blur: 6,
    stagger: 0.014,
    duration: 0.6,
  },
};

const EDITORIAL_PRESET: typeof PRESET = {
  headline: {
    rotationX: 0,
    yPercent: 18,
    blur: 0,
    stagger: 0.075,
    duration: 1.05,
  },
  body: {
    rotationX: 0,
    yPercent: 12,
    blur: 0,
    stagger: 0.025,
    duration: 0.75,
  },
};

export default function MorphText({
  children,
  as,
  className,
  play = true,
  trigger = "manual",
  variant = "headline",
  delay = 0,
  respectSaveData = false,
  motionProfile = "default",
  lewati = false,
}: MorphTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const Tag: TagName = as ?? "span";
  // Callback ref, bukan ref object: tipenya cocok untuk semua tag di TagName
  // tanpa masalah variance, dan tidak melanggar aturan "refs during render".
  const simpan = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const preset =
      motionProfile === "editorial"
        ? EDITORIAL_PRESET[variant]
        : PRESET[variant];
    let ctx: { revert: () => void } | null = null;
    let split: { revert: () => void; words: HTMLElement[] | null } | null = null;

    const jalankan = () => {
      split = new SplitType(el, { types: "words", tagName: "span" });
      const words = split.words ?? [];
      if (words.length === 0) {
        split.revert();
        split = null;
        el.dataset.morph = "in";
        return;
      }

      ctx = gsap.context(() => {
        gsap.fromTo(
          words,
          {
            opacity: 0,
            yPercent: preset.yPercent,
            rotationX: preset.rotationX,
            transformPerspective: 700,
            transformOrigin: "50% 100%",
            filter: `blur(${preset.blur}px)`,
          },
          {
            opacity: 1,
            yPercent: 0,
            rotationX: 0,
            filter: "blur(0px)",
            duration: preset.duration,
            delay,
            stagger: preset.stagger,
            ease: "power3.out",
          }
        );
      }, el);

      // Kata sudah dikunci di keadaan awal (opacity 0) oleh `fromTo`, jadi root
      // aman ditampilkan sekarang — tidak ada kedipan teks mentah.
      el.dataset.morph = "in";
    };

    const bersihkan = () => {
      ctx?.revert();
      split?.revert();
      ctx = null;
      split = null;
    };

    // Tampilkan teks apa adanya tanpa membelah kata dan tanpa animasi — dipakai
    // saat intro beranda dilewati (kembali ke beranda lewat navigasi client-side).
    // Wajib menandai `data-morph="in"` karena `.root` disembunyikan sampai itu.
    if (lewati) {
      el.dataset.morph = "in";
      return;
    }

    // Mode manual tetap menunggu loader sebelum menampilkan teks.
    if (trigger === "manual" && !play) return;

    // Kalau gerak dimatikan, teks ditampilkan apa adanya — tanpa dipecah dan
    // tanpa menunggu viewport, sama seperti perilaku sebelum mode `view` ada.
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (respectSaveData && connection?.saveData)
    ) {
      el.dataset.morph = "in";
      return;
    }

    if (trigger === "view") {
      const pengamat = new IntersectionObserver(
        (entri) => {
          if (!entri.some((e) => e.isIntersecting)) return;
          pengamat.disconnect();
          jalankan();
        },
        { threshold: 0.25, rootMargin: "0px 0px -12% 0px" }
      );
      pengamat.observe(el);
      return () => {
        pengamat.disconnect();
        bersihkan();
      };
    }

    jalankan();
    return bersihkan;
  }, [play, trigger, variant, delay, respectSaveData, motionProfile, lewati]);

  return (
    <Tag ref={simpan} className={`${styles.root} ${className ?? ""}`}>
      {children}
    </Tag>
  );
}
