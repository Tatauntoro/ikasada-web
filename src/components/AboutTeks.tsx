"use client";

import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import styles from "./AboutTeks.module.css";

type Props = {
  label: string;
  labelStyle?: CSSProperties;
  /** Isi paragraf. Kata kunci diapit bintang, mis. `*satu akar*`. */
  text: string;
  textColor?: string;
  /** Pengali ukuran dari admin (`--skala-judul`). Hanya dipakai bila lebih dari 1. */
  textScale?: string;
  /** Warna kata kunci setelah paragraf naik. */
  keywordColor?: string;
  panelStyle?: CSSProperties;
};

type Potongan = {
  kunci: boolean;
  kata: string[];
  spasiAwal: boolean;
  spasiAkhir: boolean;
};

/** Pecah teks menjadi potongan biasa dan potongan kata kunci (diapit `*`). */
function potong(teks: string): Potongan[] {
  const hasil: Potongan[] = [];
  teks.split(/\*([^*]+)\*/).forEach((bagian, i) => {
    const kata = bagian.trim().split(/\s+/).filter(Boolean);
    if (!kata.length) return;
    hasil.push({
      kunci: i % 2 === 1,
      kata,
      spasiAwal: /^\s/.test(bagian),
      spasiAkhir: /\s$/.test(bagian),
    });
  });
  return hasil;
}

/**
 * Tentang Kami sebagai satu paragraf. Tiap baris naik dari bawah garis
 * masker, berurutan dari atas; setelah baris terakhir selesai, kata kunci
 * berganti warna. Efeknya jalan sekali saat paragraf terlihat, dan dilewati
 * bila pengunjung memilih reduced-motion.
 */
export default function AboutTeks({
  label,
  labelStyle,
  text,
  textColor,
  textScale,
  keywordColor,
  panelStyle,
}: Props) {
  const paragrafRef = useRef<HTMLParagraphElement>(null);
  const potongan = potong(text);

  useEffect(() => {
    const p = paragrafRef.current;
    if (!p) return;
    const kata = Array.from(p.querySelectorAll<HTMLElement>("[data-kata]"));
    const kunci = Array.from(p.querySelectorAll<HTMLElement>("[data-kunci]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    kunci.forEach((k, i) => k.style.setProperty("--kd", String(i)));

    // Jeda tiap kata mengikuti nomor barisnya; kata kunci menunggu baris terakhir.
    const hitungJeda = () => {
      let baris = -1;
      let terakhir: number | null = null;
      kata.forEach((k) => {
        const atas = k.offsetTop;
        if (terakhir === null || Math.abs(atas - terakhir) > 4) {
          baris += 1;
          terakhir = atas;
        }
        k.style.setProperty("--d", `${baris * 110}ms`);
      });
      p.style.setProperty("--kb", String(baris * 110 + 700));
    };
    hitungJeda();
    window.addEventListener("resize", hitungJeda);

    p.classList.add(styles.efek);
    let pengamat: IntersectionObserver | null = null;
    const nyalakan = () => p.classList.add(styles.mulai);
    if (reduced) {
      nyalakan();
    } else {
      pengamat = new IntersectionObserver(
        ([entri]) => {
          if (!entri.isIntersecting) return;
          pengamat?.disconnect();
          nyalakan();
        },
        { threshold: 0.4 }
      );
      pengamat.observe(p);
    }

    return () => {
      window.removeEventListener("resize", hitungJeda);
      pengamat?.disconnect();
      p.classList.remove(styles.efek, styles.mulai);
    };
  }, [text]);

  const gayaTeks = {
    "--teks-ink": textColor,
    "--skala-judul": textScale,
    "--warna-kunci": keywordColor,
  } as CSSProperties;

  return (
    <section
      id="overview"
      className={styles.section}
      aria-labelledby="overview-title"
      style={panelStyle}
    >
      <div className={`${styles.wrap} home-section-container`}>
        <div className={styles.kolom}>
          <h2 id="overview-title" className={styles.label} style={labelStyle}>
            {label}
          </h2>
          <p
            ref={paragrafRef}
            className={`${styles.paragraf} section-title`}
            style={gayaTeks}
          >
            {potongan.map((bagian, i) => {
              const isi = bagian.kata.map((k, j) => (
                <Fragment key={j}>
                  <span data-kata className={styles.kata}>
                    <span className={styles.dalam}>{k}</span>
                  </span>
                  {j < bagian.kata.length - 1 ? " " : null}
                </Fragment>
              ));
              return (
                <Fragment key={i}>
                  {i > 0 && (potongan[i - 1].spasiAkhir || bagian.spasiAwal) ? " " : null}
                  {bagian.kunci ? (
                    <span data-kunci className={styles.kunci}>
                      {isi}
                    </span>
                  ) : (
                    isi
                  )}
                </Fragment>
              );
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
