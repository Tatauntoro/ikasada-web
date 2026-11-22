"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import {
  gayaBackgroundSection,
  teksSection,
  useBerandaConfig,
} from "@/lib/beranda-client";
import { HERO_POSTER_BAWAAN, konfigurasiHeroDari } from "@/lib/beranda";
import { useLoader } from "../LoaderProvider";
import styles from "./hero-aksara.module.css";

const AKSARA = "ꦆꦏꦱꦢ";
const AKSARA_DUA_BARIS = ["ꦆꦏ", "ꦱꦢ"];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Hero beranda: foto alumni tampil di dalam aksara IKASADA yang membesar
 * selagi digulir sampai foto memenuhi layar. Judul dan teks pengantar baru
 * muncul setelah foto terbuka, supaya keadaan awalnya murni aksara dan foto.
 *
 * Kemajuannya dihitung dari posisi pembungkus tiap kali gulir (bukan
 * ScrollTrigger), karena tinggi dokumen beranda masih berubah setelah data
 * dimuat dan posisi mulai yang tersimpan akan meleset.
 *
 * Tanpa gerak: reduced-motion, atau font aksara gagal dimuat dalam 4 detik,
 * memakai versi statis (foto penuh dan teks langsung terlihat).
 */
export default function HeroAksara() {
  const { ready, introAktif } = useLoader();
  // Menunggu iris preloader (`wait`), lalu aksara muncul (`play`). `done` bila intro dilewati.
  const intro = introAktif ? (ready ? "play" : "wait") : "done";
  const beranda = useBerandaConfig();
  const heroSection = beranda?.sections.find((s) => s.kunci === "hero");
  const latar = gayaBackgroundSection(beranda, "hero");
  const konfigurasi = konfigurasiHeroDari(heroSection?.konfigurasi);
  // Jendela aksara memakai satu foto: foto pertama, atau poster bila mode video.
  const gambar =
    (konfigurasi.mode === "video" ? konfigurasi.posterUrl : konfigurasi.fotoUrls[0]) ||
    HERO_POSTER_BAWAAN;
  const pengantar = teksSection(
    beranda,
    "hero",
    "deskripsi",
    "Ruang jejaring dan kontribusi antar alumni"
  );
  const judul = teksSection(
    beranda,
    "hero",
    "judul",
    "Dari Akar Yang Sama, Tumbuh Jauh Bersama"
  );

  const maskId = `aksara-${useId().replace(/:/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const maskRef = useRef<SVGMaskElement>(null);
  const dasarRef = useRef<SVGRectElement>(null);
  const banjirRef = useRef<SVGRectElement>(null);
  const baris1Ref = useRef<SVGTextElement>(null);
  const baris2Ref = useRef<SVGTextElement>(null);
  const fotoRef = useRef<SVGImageElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const teksRef = useRef<HTMLDivElement>(null);
  const petunjukRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const stick = stickRef.current;
    const svg = svgRef.current;
    const mask = maskRef.current;
    const dasar = dasarRef.current;
    const banjir = banjirRef.current;
    const baris1 = baris1Ref.current;
    const baris2 = baris2Ref.current;
    const foto = fotoRef.current;
    const scrim = scrimRef.current;
    const teks = teksRef.current;
    const petunjuk = petunjukRef.current;
    if (!section || !pin || !stick || !svg || !mask || !dasar || !banjir) return;
    if (!baris1 || !baris2 || !foto || !scrim || !teks || !petunjuk) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let duaBaris = false;
    let p = 0;
    let px = 0;
    let ix = 0;
    let tpx = 0;
    let tix = 0;
    let raf = 0;
    let statis = false;
    let mati = false;

    const render = () => {
      const e = p * p * (3 - 2 * p);
      const ukuranDasar = duaBaris ? W * 0.3 : W * 0.14;
      const fs = ukuranDasar * (1 + e * 3.2);
      const x = W / 2 + px * (1 - p);
      // Di mobile foto hanya mengisi bagian atas, jadi aksara berpindah ke sana selagi membesar.
      const pusatY = duaBaris ? H * (0.46 - 0.17 * e) : H * 0.5;
      // Font aksara hanya sampai bobot 500: tebalkan bentuknya lewat stroke supaya foto cukup terlihat.
      const tebal = (fs * 0.045).toFixed(2);
      for (const t of [baris1, baris2]) {
        t.setAttribute("font-size", String(fs));
        t.setAttribute("x", String(x));
        t.setAttribute("stroke-width", tebal);
      }
      baris1.setAttribute("y", String(duaBaris ? pusatY - fs * 0.5 : pusatY));
      baris2.setAttribute("y", String(pusatY + fs * 0.5));
      banjir.setAttribute("opacity", String(clamp((p - 0.62) / 0.28, 0, 1)));
      foto.setAttribute("transform", `translate(${ix.toFixed(1)},0)`);
      scrim.style.opacity = String(clamp((p - 0.6) / 0.3, 0, 1));
      teks.style.opacity = String(clamp((p - 0.74) / 0.16, 0, 1));
      petunjuk.style.opacity = p < 0.04 ? "1" : "0";
    };

    const tata = () => {
      W = stick.clientWidth;
      H = stick.clientHeight;
      duaBaris = W < 700;
      // Mobile: foto di 58% bagian atas, sisanya latar gelap tempat teks berdiri.
      const tinggiFoto = duaBaris ? H * 0.58 : H;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      dasar.setAttribute("width", String(W));
      dasar.setAttribute("height", String(H));
      banjir.setAttribute("width", String(W));
      banjir.setAttribute("height", String(tinggiFoto));
      mask.setAttribute("width", String(W));
      mask.setAttribute("height", String(H));
      foto.setAttribute("x", "-40");
      foto.setAttribute("y", String(duaBaris ? -H * 0.04 : -40));
      foto.setAttribute("width", String(W + 80));
      foto.setAttribute("height", String(duaBaris ? tinggiFoto + H * 0.04 : H + 80));
      baris1.textContent = duaBaris ? AKSARA_DUA_BARIS[0] : AKSARA;
      baris2.textContent = duaBaris ? AKSARA_DUA_BARIS[1] : "";
      render();
    };

    // Posisi pembungkus di dokumen, tanpa pengaruh transform: wadah halaman masih
    // beranimasi saat hero pertama kali diukur, dan posisi di layar saat itu meleset.
    const atasDokumen = () => {
      let y = 0;
      for (let n: HTMLElement | null = pin; n; n = n.offsetParent as HTMLElement | null) {
        y += n.offsetTop;
      }
      return y;
    };

    const saatGulir = () => {
      if (statis) return;
      p = clamp(
        (window.scrollY - atasDokumen()) / (pin.offsetHeight - window.innerHeight),
        0,
        1
      );
      render();
    };

    const langkah = () => {
      px += (tpx - px) * 0.12;
      ix += (tix - ix) * 0.12;
      render();
      raf =
        Math.abs(tpx - px) > 0.3 || Math.abs(tix - ix) > 0.3
          ? requestAnimationFrame(langkah)
          : 0;
    };

    const saatKursor = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const n = e.clientX / W - 0.5;
      tpx = n * W * 0.08;
      tix = -n * 30;
      if (!raf) raf = requestAnimationFrame(langkah);
    };

    const saatUbahUkuran = () => {
      tata();
      if (!statis) saatGulir();
    };

    const mulai = (fontSiap: boolean) => {
      if (mati) return;
      if (!fontSiap || reduced) {
        statis = true;
        p = 1;
        section.dataset.statis = "true";
      }
      tata();
      stick.dataset.siap = "true";
      if (!statis) {
        saatGulir();
        window.addEventListener("scroll", saatGulir, { passive: true });
        stick.addEventListener("pointermove", saatKursor);
      }
      window.addEventListener("resize", saatUbahUkuran);
    };

    const keluarga = window.getComputedStyle(baris1).fontFamily;
    const fontSiap = document.fonts?.load
      ? document.fonts
          .load(`500 100px ${keluarga}`, AKSARA)
          .then((f) => f.length > 0)
          .catch(() => false)
      : Promise.resolve(false);
    const batas = new Promise<boolean>((resolve) =>
      window.setTimeout(() => resolve(false), 4000)
    );
    void Promise.race([fontSiap, batas]).then(mulai);

    return () => {
      mati = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", saatGulir);
      window.removeEventListener("resize", saatUbahUkuran);
      stick.removeEventListener("pointermove", saatKursor);
    };
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className={styles.hero}
      aria-label="IKASADA FIB UI"
      data-hero-aksara=""
    >
      <div className={styles.pin} ref={pinRef}>
        <div className={styles.stick} ref={stickRef} style={latar} data-intro={intro}>
          <svg ref={svgRef} className={styles.svg} role="img" aria-label="Alumni berbincang dalam pertemuan santai">
            <defs>
              <mask id={maskId} ref={maskRef} maskUnits="userSpaceOnUse" x={0} y={0}>
                <rect ref={dasarRef} fill="#000" />
                <text
                  ref={baris1Ref}
                  className={styles.aksara}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  stroke="#fff"
                  strokeLinejoin="round"
                />
                <text
                  ref={baris2Ref}
                  className={styles.aksara}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  stroke="#fff"
                  strokeLinejoin="round"
                />
                <rect ref={banjirRef} fill="#fff" opacity={0} />
              </mask>
            </defs>
            <g mask={`url(#${maskId})`}>
              <image ref={fotoRef} href={gambar} preserveAspectRatio="xMidYMid slice" />
            </g>
          </svg>
          <div className={styles.scrim} ref={scrimRef} />
          {/* Plakat putih dipertahankan: teks hitam di dalam logo tidak terbaca di atas foto gelap. */}
          <div className={styles.logo}>
            <Image src="/logo/ikasada-logo.jpeg" alt="IKASADA FIB UI" width={64} height={80} priority />
          </div>
          <div className={styles.teks} ref={teksRef}>
            <p className={styles.pengantar}>{pengantar}</p>
            <h1 className={styles.judul}>{judul}</h1>
          </div>
          <p className={styles.petunjuk} ref={petunjukRef}>
            Gulir ke bawah
          </p>
        </div>
      </div>
    </section>
  );
}
