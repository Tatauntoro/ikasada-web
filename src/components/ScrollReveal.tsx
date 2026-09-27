"use client";

import { useEffect } from "react";

const LANGKAH_MS = 70;
const MAKS_LANGKAH = 6;

/**
 * Menyingkap `.reveal-section` dan `.reveal-item` saat masuk viewport.
 *
 * `.reveal-item` diberi delay bertingkat per grup (elemen dengan induk yang
 * sama), supaya kartu dalam satu grid tersusun berurutan alih-alih muncul
 * serentak.
 *
 * Pemindaian diulang lewat MutationObserver karena sebagian daftar — direktori
 * alumni dan agenda — baru di-render setelah fetch selesai. Tanpa itu, kartu
 * yang muncul belakangan tidak pernah terdaftar dan akan tersangkut dalam
 * keadaan tersembunyi. IntersectionObserver memanggil callback awal untuk
 * elemen yang sudah terlihat, jadi yang telat pun langsung tampil.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const perInduk = new Map<Element, number>();
    /*
     * Penanda "sudah terdaftar" harus hidup per-jalan-efek, bukan di DOM.
     * React menjalankan efek dua kali di mode strict: jalan pertama menandai
     * semua `.reveal-item` lalu observer-nya dilepas, dan penanda di DOM
     * membuat jalan kedua melewati semuanya — elemen yang sudah ada sejak
     * render awal (judul section, CTA) tidak pernah ter-reveal dan tersangkut
     * di `opacity: 0`.
     */
    const terdaftar = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );

    const daftarkan = (akar: ParentNode) => {
      akar.querySelectorAll<HTMLElement>(".reveal-item").forEach((el) => {
        if (terdaftar.has(el)) return;
        terdaftar.add(el);

        const induk = el.parentElement ?? document.body;
        const urutan = perInduk.get(induk) ?? 0;
        perInduk.set(induk, urutan + 1);
        el.style.setProperty(
          "--reveal-delay",
          `${Math.min(urutan, MAKS_LANGKAH) * LANGKAH_MS}ms`
        );

        observer.observe(el);
      });
    };

    daftarkan(document);
    document
      .querySelectorAll(".reveal-section")
      .forEach((el) => observer.observe(el));

    const pengamat = new MutationObserver((mutasi) => {
      mutasi.forEach((catatan) => {
        catatan.addedNodes.forEach((simpul) => {
          if (simpul instanceof HTMLElement) daftarkan(simpul);
        });
      });
    });
    pengamat.observe(document.body, { childList: true, subtree: true });

    return () => {
      pengamat.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
