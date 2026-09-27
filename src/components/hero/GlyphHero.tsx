"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight } from "@phosphor-icons/react";
import { useLoader } from "../LoaderProvider";
import MorphText from "../motion/MorphText";
import { scrollToSection } from "@/lib/scroll";
import GlyphPortal from "./GlyphPortal";
import styles from "./glyph-hero.module.css";

/*
 * Stack font sengaja hanya dua keluarga: GlyphPortal memutuskan "font siap"
 * dengan memeriksa SETIAP keluarga di daftar computed terhadap document.fonts.
 * Daftar yang lebih panjang menambah keluarga yang tidak resolve, dan itu
 * menyalakan `stalled` — yang mematikan gerak kamera untuk mount tersebut.
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

const FONT = plusJakartaSans.style.fontFamily;

/*
 * Urutan masuk setelah veil preloader — satu sumber kebenaran:
 * IKASADA → deskripsi → judul → CTA → logo, lalu pill navbar + Masuk/Daftar
 * (dua terakhir diatur di Navbar.tsx, lihat JEDA_NAV di sana).
 *
 * Satuannya campur karena API-nya memang beda: MorphText memakai detik,
 * animation-delay CSS memakai milidetik.
 */
const JEDA = {
  ikasada: 0, // ms — sapuan mask huruf, 1000ms (lihat glyph-hero.module.css)
  deskripsi: 0.65, // detik — MorphText
  judul: 1, // detik — MorphText
  cta: 1900, // ms — animation-delay CSS
  logo: 2150, // ms — animation-delay CSS
};

export default function GlyphHero() {
  const { ready, introAktif } = useLoader();
  const [fontSiap, setFontSiap] = useState(false);

  /*
   * GlyphPortal membekukan face di `useLayoutEffect` saat mount lewat
   * `document.fonts.check`. Face 500 Plus Jakarta Sans belum pernah diminta halaman ini —
   * semua teks lain memakai 400 — jadi check-nya masih false saat mount dan
   * portal akan tampil statis selamanya. Probe tak terlihat ini memaksa face-nya
   * dimuat lebih dulu, sebelum komponen dirender.
   *
   * Gerbang ini sekaligus membuat GlyphPortal tidak pernah ikut render server,
   * sehingga `useLayoutEffect` di dalamnya tidak memicu peringatan SSR.
   */
  useEffect(() => {
    let batal = false;
    const tandai = () => {
      if (!batal) setFontSiap(true);
    };

    if (typeof document === "undefined" || !document.fonts) {
      tandai();
      return () => {
        batal = true;
      };
    }

    const probe = document.createElement("span");
    probe.textContent = "IKASADA";
    probe.style.cssText =
      "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;" +
      `font:500 100px ${FONT};`;
    document.body.appendChild(probe);

    const keluarga = getComputedStyle(probe).fontFamily;
    const muat = document.fonts.load(`500 100px ${keluarga}`, "IKASADA");

    void Promise.all([document.fonts.ready, muat.catch(() => {})]).finally(() => {
      probe.remove();
      tandai();
    });

    return () => {
      batal = true;
      probe.remove();
    };
  }, []);

  return (
    <div
      id="hero"
      className={`${styles.hero} ${plusJakartaSans.variable}`}
      // Ada = intro dilewati; lihat blok `[data-tanpa-intro]` di modul CSS.
      data-tanpa-intro={introAktif ? undefined : ""}
    >
      {ready && fontSiap ? (
        <GlyphPortal
          className={styles.portal}
          word="IKASADA"
          interactive
          scrollLength={1}
          fontFamily={FONT}
          fontWeight={500}
          style={{
            "--gp-paper": "#ffffff",
            "--gp-field": "#0f1012",
            "--gp-ink": "#0f1012",
            "--gp-foreground": "#fdfdfd",
          }}
          background={<div style={{ position: "absolute", inset: 0, background: "#0f1012" }} />}
          front={
            <div className={styles.front}>
              {/* Di atas huruf: logo, lalu deskripsi menempel di atas IKASADA. */}
              <div className={styles.atas}>
                <span
                  className={styles.brandWrap}
                  style={{ animationDelay: `${JEDA.logo}ms` }}
                >
                  <Image
                    className={styles.brand}
                    src="/logo/ikasada-logo.jpeg"
                    alt="IKASADA FIB UI"
                    width={1279}
                    height={1600}
                    priority
                  />
                  <span className={styles.shine} aria-hidden="true" />
                </span>
                <MorphText
                  as="p"
                  className={styles.sub}
                  play={ready}
                  lewati={!introAktif}
                  respectSaveData
                  motionProfile="editorial"
                  variant="body"
                  delay={JEDA.deskripsi}
                >
                  Ruang jejaring dan kontribusi antar alumni
                </MorphText>
              </div>

              {/* Di bawah huruf: judul satu baris + CTA, keduanya ter-center. */}
              <div className={styles.bawah}>
                <MorphText
                  as="h1"
                  className={styles.headline}
                  play={ready}
                  lewati={!introAktif}
                  respectSaveData
                  motionProfile="editorial"
                  variant="headline"
                  delay={JEDA.judul}
                >
                  Dari Akar Yang Sama, Tumbuh Jauh Bersama
                </MorphText>
                <button
                  type="button"
                  className={styles.cta}
                  style={{ animationDelay: `${JEDA.cta}ms` }}
                  onClick={() => scrollToSection("alumni", "alumni-search")}
                >
                  Cari alumni
                  <ArrowRight weight="bold" aria-hidden="true" />
                </button>
              </div>
            </div>
          }
        >
          {/*
           * Sengaja fragmen kosong, bukan tanpa children: GlyphPortal memakai
           * `children ?? default`, jadi `null`/`undefined` justru memunculkan
           * panel bawaan. Panel gelapnya memang tidak dipakai lagi — setelah
           * hero langsung ke Tentang Kami.
           */}
          <></>
        </GlyphPortal>
      ) : (
        <div className={styles.placeholder} aria-hidden="true" />
      )}
    </div>
  );
}
