"use client";

import { Fragment, useEffect } from "react";
import { useBerandaConfig } from "@/lib/beranda-client";
import OverviewSection from "@/components/OverviewSection";
import Stats from "@/components/Stats";
import AlumniDirectory from "@/components/AlumniDirectory";
import BeritaSection from "@/components/BeritaSection";
import EventsSection from "@/components/EventsSection";
import JournalSection from "@/components/JournalSection";
import ArsipSection from "@/components/ArsipSection";
import StaffSection from "@/components/StaffSection";
import ContactSection from "@/components/ContactSection";

/**
 * Isi beranda (selain hero) yang urutannya bisa diatur dari Kelola Beranda.
 *
 * Satu blok bisa memuat beberapa kunci section (mis. blok Overview memuat
 * `tentang-kami` + `lima-cara`); posisinya memakai kunci utama tiap blok. Kalau
 * konfigurasi belum termuat, dipakai urutan bawaan supaya tampilan tidak
 * berkedip.
 */
const BLOK: { id: string; kunci: string; urutan: number; node: React.ReactNode }[] =
  [
    { id: "overview", kunci: "tentang-kami", urutan: 1, node: <OverviewSection /> },
    { id: "statistik", kunci: "statistik", urutan: 3, node: <Stats /> },
    {
      id: "alumni",
      kunci: "direktori-alumni",
      urutan: 7,
      node: <AlumniDirectory limit={6} sort="createdAt:desc" />,
    },
    { id: "berita", kunci: "berita", urutan: 8, node: <BeritaSection /> },
    { id: "kegiatan", kunci: "kegiatan", urutan: 9, node: <EventsSection /> },
    { id: "kerjasama", kunci: "kerjasama", urutan: 10, node: <JournalSection /> },
    { id: "arsip", kunci: "arsip", urutan: 11, node: <ArsipSection /> },
    { id: "pengurus", kunci: "pengurus", urutan: 12, node: <StaffSection /> },
    { id: "kontak", kunci: "kontak", urutan: 13, node: <ContactSection /> },
  ];

export default function BerandaIsi() {
  const beranda = useBerandaConfig();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("main.home-page");
    if (!root) return;

    const sinkronkanDivider = () => {
      const sections = Array.from(
        root.querySelectorAll<HTMLElement>("section")
      );

      sections.forEach((section) => {
        section.classList.remove(
          "home-section-white-before",
          "home-section-white-after"
        );
      });

      for (let index = 1; index < sections.length; index += 1) {
        const sebelumnya = sections[index - 1];
        const sekarang = sections[index];
        const latarSebelumnya = window.getComputedStyle(sebelumnya).backgroundColor;
        const latarSekarang = window.getComputedStyle(sekarang).backgroundColor;

        if (
          latarSebelumnya === "rgb(255, 255, 255)" &&
          latarSekarang === "rgb(255, 255, 255)"
        ) {
          sebelumnya.classList.add("home-section-white-after");
          sekarang.classList.add("home-section-white-before");
        }
      }
    };

    sinkronkanDivider();
    const observer = new MutationObserver(sinkronkanDivider);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["style"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  const urutanBlok = (kunci: string, fallback: number) =>
    beranda?.sections.find((s) => s.kunci === kunci)?.urutan ?? fallback;

  const tersusun = [...BLOK].sort(
    (a, b) => urutanBlok(a.kunci, a.urutan) - urutanBlok(b.kunci, b.urutan)
  );

  return (
    <>
      {tersusun.map((b) => (
        <Fragment key={b.id}>{b.node}</Fragment>
      ))}
    </>
  );
}
