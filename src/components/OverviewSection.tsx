"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import SplitType from "split-type";
import WaysStory from "./WaysStory";
import AboutMedia from "./AboutMedia";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";
import styles from "./OverviewSection.module.css";

const ways = [
  {
    title: "Ruang Terhubung",
    headline:
      "IKASADA membuka ruang bagi alumni lintas angkatan untuk bertemu, berbagi cerita, dan kembali terhubung.",
    image: "/images/beranda/alumni-discussion.png",
    imageAlt: "Alumni berbincang dalam pertemuan santai",
  },
  {
    title: "Koneksi Jadi Kolaborasi",
    headline:
      "Koneksi antaralumni bisa berkembang menjadi ruang berbagi gagasan dan kerja sama.",
    image: "/images/beranda/collaboration.png",
    imageAlt: "Alumni bertukar gagasan dalam sebuah diskusi kolaboratif",
  },
  {
    title: "Kegiatan yang Terus Tumbuh",
    headline:
      "Ragam kegiatan IKASADA terus berkembang mengikuti semangat dan kebutuhan komunitas.",
    image: "/images/beranda/seminar.png",
    imageAlt: "Pembicara menyampaikan materi di hadapan peserta seminar",
  },
  {
    title: "Ruang Tumbuh Bersama",
    headline:
      "Mahasiswa aktif, terutama tingkat akhir, bertemu alumni, bertukar pengalaman, dan mencari bekal untuk langkah setelah kampus.",
    image: "/images/beranda/mentoring.png",
    imageAlt: "Alumni muda berbagi pengalaman dalam sesi mentoring",
  },
  {
    title: "Dosen dan Prodi Terhubung",
    headline:
      "Dosen yang juga alumni berdialog dan berkolaborasi dengan IKASADA melalui dukungan Prodi.",
    image: "/images/beranda/lecturer-discussion.png",
    imageAlt: "Dosen dan alumni berdiskusi dalam suasana akrab",
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

function tintaUntukLatar(warna: string | null | undefined): string {
  const hex = warna?.trim().replace(/^#/, "");
  if (!hex) return "#ffffff";

  const lengkap = hex.length === 3 ? [...hex].map((karakter) => karakter + karakter).join("") : hex;
  if (!/^[\da-f]{6}$/i.test(lengkap)) return "#ffffff";

  const [merah, hijau, biru] = [0, 2, 4].map((awal) =>
    Number.parseInt(lengkap.slice(awal, awal + 2), 16) / 255
  );
  const linear = (nilai: number) =>
    nilai <= 0.04045 ? nilai / 12.92 : ((nilai + 0.055) / 1.055) ** 2.4;
  const luminans =
    0.2126 * linear(merah) +
    0.7152 * linear(hijau) +
    0.0722 * linear(biru);

  return luminans > 0.42 ? "#0f1012" : "#ffffff";
}

function gayaPanel(
  latar: CSSProperties | undefined,
  tinta: string
): CSSProperties {
  return {
    ...latar,
    "--panel-ink": tinta,
    "--panel-muted": tinta === "#ffffff" ? "rgba(255, 255, 255, 0.88)" : "#5e5e5e",
  } as CSSProperties;
}

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
  const gayaJudulTentang = gayaSection(beranda, "tentang-kami", "judul");
  const gayaEyebrowTentang = gayaSection(beranda, "tentang-kami", "eyebrow");
  const gayaJudulLima = gayaSection(beranda, "lima-cara", "judul");
  const gayaEyebrowLima = gayaSection(beranda, "lima-cara", "eyebrow");
  const gayaBackgroundTentang = gayaBackgroundSection(beranda, "tentang-kami");
  const gayaBackgroundLima = gayaBackgroundSection(beranda, "lima-cara");
  const tintaTentang = tintaUntukLatar(
    beranda?.sections.find((s) => s.kunci === "tentang-kami")?.warnaBackground
  );
  const tintaLima = tintaUntukLatar(
    beranda?.sections.find((s) => s.kunci === "lima-cara")?.warnaBackground
  );
  const gayaPanelTentang = gayaPanel(gayaBackgroundTentang, tintaTentang);
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
      | { items?: { judul?: unknown; deskripsi?: unknown; fotoUrl?: unknown; tampilkanFoto?: unknown }[] }
      | null
      | undefined;
    const items = konfig?.items;
    if (Array.isArray(items) && items.length > 0) {
      return items.map((x) => ({
        judul: String(x?.judul ?? ""),
        deskripsi: String(x?.deskripsi ?? ""),
        fotoUrl: typeof x?.fotoUrl === "string" ? x.fotoUrl : "",
        tampilkanFoto: x?.tampilkanFoto !== false,
      }));
    }
    return ways.map((w) => ({
      judul: w.title,
      deskripsi: w.headline,
      fotoUrl: "",
      tampilkanFoto: true,
    }));
  })();
  const mediaTentang = (() => {
    const konfig = beranda?.sections.find((s) => s.kunci === "tentang-kami")
      ?.konfigurasi as {
        mode?: unknown;
        fotoUrl?: unknown;
        fotoUrls?: unknown;
        videoUrl?: unknown;
        posterUrl?: unknown;
      } | null | undefined;
    const legacyPhoto = typeof konfig?.fotoUrl === "string" ? konfig.fotoUrl : "";
    const fotoUrls = Array.isArray(konfig?.fotoUrls)
      ? konfig.fotoUrls.filter((url): url is string => typeof url === "string" && Boolean(url))
      : legacyPhoto ? [legacyPhoto] : [];
    return {
      mode: konfig?.mode === "video" || konfig?.mode === "slideshow" ? konfig.mode : "foto",
      fotoUrls,
      videoUrl: typeof konfig?.videoUrl === "string" ? konfig.videoUrl : "",
      posterUrl: typeof konfig?.posterUrl === "string" ? konfig.posterUrl : "",
    } as const;
  })();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Kalau gerak dimatikan, teks dibiarkan apa adanya — jangan disentuh sama sekali.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = root.querySelector<HTMLElement>("#overview");
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
      {tentangAktif && (
        <section id="overview" className={styles.section} aria-labelledby="overview-title">
          <div className={styles.panel} style={gayaPanelTentang}>
            <div className={styles.aboutSection}>
              <div className={`${styles.inner} home-section-container`}>
                <div className={styles.content}>
                  <p
                    className={styles.label}
                    style={{
                      ...gayaEyebrowTentang,
                      color: gayaEyebrowTentang?.color ?? tintaTentang,
                    }}
                  >
                    {labelTentang}
                  </p>
                  <h2
                    id="overview-title"
                    className="section-title"
                    style={{
                      ...gayaJudulTentang,
                      color: gayaJudulTentang?.color ?? tintaTentang,
                    }}
                  >
                    {judulTentang}
                  </h2>
                  <p className={styles.body}>{bodyTentang}</p>
                </div>
                <figure className={styles.aboutVisual}>
                  <AboutMedia
                    {...mediaTentang}
                    fallback="/images/beranda/alumni-discussion.png"
                  />
                  <figcaption className={styles.aboutCaption}>
                    Jejaring yang terus hidup lintas angkatan
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>
      )}

      {limaAktif && (
        <WaysStory
          kicker={kickerLima}
          title={limaKustom ? judulLimaRaw : JUDUL_LIMA_DEFAULT}
          kickerStyle={gayaEyebrowLima}
          titleStyle={gayaJudulLima}
          firstBackground={gayaBackgroundLima?.backgroundColor}
          firstInk={tintaLima}
          items={limaItems.map((item, index) => {
            const fallback = ways[index % ways.length];
            return {
              title: item.judul,
              description: item.deskripsi,
              image: item.fotoUrl || fallback.image,
              showImage: item.tampilkanFoto,
              imageAlt: fallback.imageAlt,
            };
          })}
        />
      )}
    </div>
  );
}
