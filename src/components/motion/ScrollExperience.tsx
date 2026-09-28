"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollExperience() {
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".public-page");
    if (!page) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progress = progressRef.current;

    page.dataset.motionReady = "true";
    page.querySelectorAll<HTMLElement>("h1, h2").forEach((heading) => {
      heading.dataset.editorialHeading = "true";
    });

    if (reduced) {
      if (progress) progress.style.transform = "scaleX(1)";
      return () => {
        delete page.dataset.motionReady;
      };
    }

    const context = gsap.context(() => {
      if (progress) {
        gsap.to(progress, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
          },
        });
      }

      const headings = page.querySelectorAll<HTMLElement>("[data-editorial-heading]");
      headings.forEach((heading) => {
        if (heading.closest("#hero")) return;
        /*
         * Judul Tentang Kami dipegang OverviewSection dengan animasi kata
         * sendiri (kata per kata berputar masuk). Kalau ia ikut animasi umum ini,
         * clip-path di level <h2> memotong kata-kata yang sedang berputar.
         */
        if (heading.closest("#overview")) return;
        gsap.fromTo(
          heading,
          { opacity: 0.12, y: 28, clipPath: "inset(0 0 100% 0)" },
          {
            opacity: 1,
            y: 0,
            clipPath: "inset(0 0 0% 0)",
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: { trigger: heading, start: "top 82%", once: true },
          }
        );
      });

    }, page);

    /*
     * Section beranda mengisi datanya di klien, jadi tinggi dokumen masih
     * berubah setelah trigger dibuat — di produksi pernah naik lalu menyusut
     * lebih dari 1000px. ScrollTrigger menghitung `start` sekali saat dibuat dan
     * tidak mengulanginya saat tata letak berubah; kalau dokumen menyusut,
     * `start` judul terakhir jatuh di luar jangkauan gulir, trigger-nya tidak
     * pernah menyala, dan judulnya tersangkut di keadaan awal (`opacity: .12`,
     * `clip-path: inset(0 0 100%)`) alias tak terbaca. Tinggi dokumen diamati
     * lalu ScrollTrigger disegarkan (tertunda) tiap kali berubah supaya `start`
     * selalu mengikuti tata letak akhir. Tanpa penyegaran ini, peluangnya
     * bergantung pada isi data — halaman yang lebih pendek lebih rawan.
     */
    const JEDA_REFRESH_MS = 150;
    let tinggiTerakhir = document.documentElement.scrollHeight;
    let jedaRefresh = 0;
    const pengamatTinggi = new ResizeObserver(() => {
      const tinggi = document.documentElement.scrollHeight;
      if (tinggi === tinggiTerakhir) return;
      tinggiTerakhir = tinggi;
      window.clearTimeout(jedaRefresh);
      jedaRefresh = window.setTimeout(
        () => ScrollTrigger.refresh(),
        JEDA_REFRESH_MS
      );
    });
    pengamatTinggi.observe(document.body);

    return () => {
      pengamatTinggi.disconnect();
      window.clearTimeout(jedaRefresh);
      context.revert();
      delete page.dataset.motionReady;
    };
  }, []);

  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <span ref={progressRef} />
      </div>
    </>
  );
}
