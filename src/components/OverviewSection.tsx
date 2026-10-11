"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import SplitType from "split-type";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
} from "@/lib/beranda-client";
import styles from "./OverviewSection.module.css";

type Way = {
  number: string;
  title: string;
  headline: string;
};

const ways: Way[] = [
  {
    number: "01",
    title: "Ruang Terhubung",
    headline:
      "IKASADA membuka ruang bagi alumni lintas angkatan untuk bertemu, berbagi cerita, dan kembali terhubung.",
  },
  {
    number: "02",
    title: "Koneksi Jadi Kolaborasi",
    headline:
      "Koneksi antaralumni bisa berkembang menjadi ruang berbagi gagasan dan kerja sama.",
  },
  {
    number: "03",
    title: "Kegiatan yang Terus Tumbuh",
    headline:
      "Ragam kegiatan IKASADA terus berkembang mengikuti semangat dan kebutuhan komunitas.",
  },
  {
    number: "04",
    title: "Ruang Tumbuh Bersama",
    headline:
      "Mahasiswa aktif, terutama tingkat akhir, bertemu alumni, bertukar pengalaman, dan mencari bekal untuk langkah setelah kampus.",
  },
  {
    number: "05",
    title: "Dosen dan Prodi Terhubung",
    headline:
      "Dosen yang juga alumni berdialog dan berkolaborasi dengan IKASADA melalui dukungan Prodi.",
  },
];

/**
 * Tentang Kami.
 *
 * Judulnya masuk kata per kata dengan putaran 3D (flip) sekaligus memudar dari
 * blur — jadi tiap kata seperti berputar naik ke tempatnya, bukan sekadar
 * tersingkap sebaris demi sebaris. Isinya menyusul dengan gerakan yang sama tapi
 * lebih pendek, supaya hierarkinya tetap terbaca.
 *
 * Pemicunya IntersectionObserver, bukan ScrollTrigger: section ini `sticky`, dan
 * ScrollTrigger mengukur posisi elemen yang dipin — di sini posisinya justru
 * sengaja tidak bergerak selama tertempel, jadi pengukuran itu meleset.
 */
const JUDUL_TENTANG_DEFAULT =
  "Jejaring alumni yang tumbuh dari satu akar, bergerak lebih jauh bersama.";
const BODY_TENTANG_DEFAULT =
  "IKASADA merawat hubungan lintas angkatan melalui ruang bertemu, berbagi pengetahuan, dan kontribusi yang terus hidup di dalam dan di luar kampus.";
const JUDUL_LIMA_DEFAULT = "Lima cara kami menyambung.";

export default function OverviewSection() {
  const ref = useRef<HTMLDivElement>(null);
  const beranda = useBerandaConfig();

  const tentangAktif = sectionAktif(beranda, "tentang-kami");
  const limaAktif = sectionAktif(beranda, "lima-cara");
  const labelTentang = teksSection(
    beranda,
    "tentang-kami",
    "eyebrow",
    "Tentang Kami"
  );
  const judulTentang = teksSection(
    beranda,
    "tentang-kami",
    "judul",
    JUDUL_TENTANG_DEFAULT
  );
  const bodyTentang = teksSection(
    beranda,
    "tentang-kami",
    "deskripsi",
    BODY_TENTANG_DEFAULT
  );
  const kickerLima = teksSection(
    beranda,
    "lima-cara",
    "eyebrow",
    "Jejaring Ikasada FIB UI"
  );
  const judulLimaRaw =
    beranda?.sections.find((s) => s.kunci === "lima-cara")?.judul ?? null;
  // Judul "Lima cara..." punya markup khusus (kata terakhir di-<span>); pakai
  // markup itu kecuali admin memberi teks sendiri.
  const limaKustom = Boolean(
    judulLimaRaw && judulLimaRaw !== JUDUL_LIMA_DEFAULT
  );
  // Poin "lima cara" dari config; jatuh ke daftar bawaan bila belum diatur.
  const limaItems = (() => {
    const konfig = beranda?.sections.find((s) => s.kunci === "lima-cara")
      ?.konfigurasi as
      | { items?: { judul?: unknown; deskripsi?: unknown }[] }
      | null
      | undefined;
    const items = konfig?.items;
    if (Array.isArray(items) && items.length > 0) {
      return items.map((x) => ({
        judul: String(x?.judul ?? ""),
        deskripsi: String(x?.deskripsi ?? ""),
      }));
    }
    return ways.map((w) => ({ judul: w.title, deskripsi: w.headline }));
  })();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Kalau gerak dimatikan, teks dibiarkan apa adanya — jangan disentuh sama sekali.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = root.querySelector<HTMLElement>("section");
    const judul = root.querySelector<HTMLElement>("#overview-title");
    const label = root.querySelector<HTMLElement>(`.${styles.label}`);
    const body = root.querySelector<HTMLElement>(`.${styles.body}`);
    if (!section || !judul) return;

    const pisahJudul = new SplitType(judul, { types: "words", tagName: "span" });
    const pisahBody = body ? new SplitType(body, { types: "words", tagName: "span" }) : null;

    const ctx = gsap.context(() => {
      const garis = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

      if (label) {
        garis.from(label, { opacity: 0, y: 14, duration: 0.5 }, 0);
      }

      garis.from(
        pisahJudul.words,
        {
          opacity: 0,
          rotationX: -92,
          yPercent: 48,
          filter: "blur(10px)",
          duration: 0.85,
          stagger: 0.055,
          transformOrigin: "50% 100%",
        },
        0.06
      );

      if (pisahBody?.words) {
        garis.from(
          pisahBody.words,
          {
            opacity: 0,
            rotationX: -60,
            yPercent: 30,
            filter: "blur(6px)",
            duration: 0.6,
            stagger: 0.014,
            transformOrigin: "50% 100%",
          },
          0.42
        );
      }

      const pengamat = new IntersectionObserver(
        (entri) => {
          if (!entri.some((e) => e.isIntersecting)) return;
          pengamat.disconnect();
          garis.play();
        },
        { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
      );
      pengamat.observe(section);

      return () => pengamat.disconnect();
    }, root);

    return () => {
      ctx.revert();
      pisahJudul.revert();
      pisahBody?.revert();
    };
  }, [judulTentang, bodyTentang, tentangAktif]);

  if (!tentangAktif && !limaAktif) return null;

  return (
    <div className={styles.stage} ref={ref}>
      <section
        id="overview"
        className={styles.section}
        aria-labelledby="overview-title ways-title"
      >
        {tentangAktif && (
          <div className={styles.inner}>
            <div className={styles.labelBlock}>
              <p className={styles.label}>{labelTentang}</p>
            </div>

            <div className={styles.content}>
              <h2 id="overview-title" className="section-title">
                {judulTentang}
              </h2>
              <p className={styles.body}>{bodyTentang}</p>
            </div>
          </div>
        )}

        {limaAktif && (
          <div id="tiga-cara" className={`${styles.ways} reveal-section`}>
            <header className={styles.waysHeader}>
              <p className={styles.waysKicker}>{kickerLima}</p>
              <h2 id="ways-title" className={styles.waysTitle}>
                {limaKustom ? (
                  judulLimaRaw
                ) : (
                  <>
                    Lima cara kami <span>menyambung.</span>
                  </>
                )}
              </h2>
            </header>

            <ol className={styles.waysList}>
              {limaItems.map((item, i) => (
                <li key={i} className={styles.wayItem}>
                  <span className={styles.wayNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className={styles.wayTitle}>{item.judul}</h3>
                  <p className={styles.wayHeadline}>{item.deskripsi}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
