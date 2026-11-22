"use client";

import { useMemo, type CSSProperties } from "react";
import FlowWaysStory from "./FlowWaysStory";
import AboutTeks from "./AboutTeks";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";
import { paragrafTentang } from "@/lib/beranda";
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
 * Tentang Kami dirender `AboutTeks` (teks saja, judulnya menyala kata demi
 * kata saat digulir). Section ini hanya menyiapkan teks dan pengaturan dari admin.
 */
// Latar bawaan Tentang Kami (lihat AboutTeks.module.css); dipakai juga oleh Lima cara.
const LATAR_TENTANG_DEFAULT = "#0071e3";
const PARAGRAF_TENTANG_DEFAULT =
  "Jejaring alumni yang tumbuh dari *satu akar*, bergerak lebih jauh bersama. IKASADA merawat hubungan *lintas angkatan* melalui ruang bertemu, berbagi pengetahuan, dan *kontribusi* yang terus hidup di dalam dan di luar kampus.";

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
  const beranda = useBerandaConfig();

  const tentangAktif = sectionAktif(beranda, "tentang-kami");
  const limaAktif = sectionAktif(beranda, "lima-cara");
  const labelTentang = teksSection(
    beranda,
    "tentang-kami",
    "eyebrow",
    "Tentang Kami"
  );
  const sectionTentang = beranda?.sections.find((s) => s.kunci === "tentang-kami");
  const paragrafGabungan = paragrafTentang(
    sectionTentang?.judul,
    sectionTentang?.deskripsi
  );
  // Teks bawaan yang belum pernah diubah admin tidak punya tanda kata kunci;
  // pakai versi bertanda supaya penekanannya tetap muncul.
  const paragrafTentangTeks =
    !paragrafGabungan ||
    paragrafGabungan === PARAGRAF_TENTANG_DEFAULT.replace(/\*/g, "")
      ? PARAGRAF_TENTANG_DEFAULT
      : paragrafGabungan;
  const gayaJudulTentang = gayaSection(beranda, "tentang-kami", "judul");
  const gayaEyebrowTentang = gayaSection(beranda, "tentang-kami", "eyebrow");
  const gayaBackgroundTentang = gayaBackgroundSection(beranda, "tentang-kami");
  const gayaBackgroundLima = gayaBackgroundSection(beranda, "lima-cara");
  const tintaTentang = tintaUntukLatar(
    beranda?.sections.find((s) => s.kunci === "tentang-kami")?.warnaBackground
  );
  const tintaLima = tintaUntukLatar(
    beranda?.sections.find((s) => s.kunci === "lima-cara")?.warnaBackground
  );
  const gayaPanelTentang = gayaPanel(gayaBackgroundTentang, tintaTentang);
  // Poin "lima cara" dari config; jatuh ke daftar bawaan bila belum diatur.
  const limaItems = useMemo(() => {
    const konfig = beranda?.sections.find((s) => s.kunci === "lima-cara")
      ?.konfigurasi as
      | { items?: { judul?: unknown; deskripsi?: unknown; fotoUrl?: unknown; tampilkanFoto?: unknown; warnaLatar?: unknown }[] }
      | null
      | undefined;
    const items = konfig?.items;
    if (Array.isArray(items) && items.length > 0) {
      return items.map((x) => ({
        judul: String(x?.judul ?? ""),
        deskripsi: String(x?.deskripsi ?? ""),
        fotoUrl: typeof x?.fotoUrl === "string" ? x.fotoUrl : "",
        tampilkanFoto: x?.tampilkanFoto !== false,
        warnaLatar: typeof x?.warnaLatar === "string" ? x.warnaLatar : "",
      }));
    }
    return ways.map((w) => ({
      judul: w.title,
      deskripsi: w.headline,
      fotoUrl: "",
      tampilkanFoto: true,
      warnaLatar: "",
    }));
  }, [beranda]);
  const storyItems = useMemo(() => limaItems.map((item, index) => {
    const fallback = ways[index % ways.length];
    return {
      title: item.judul,
      description: item.deskripsi,
      image: item.fotoUrl || fallback.image,
      showImage: item.tampilkanFoto,
      imageAlt: fallback.imageAlt,
      backgroundColor: item.warnaLatar.trim() || undefined,
      inkColor: item.warnaLatar.trim() ? tintaUntukLatar(item.warnaLatar) : undefined,
    };
  }), [limaItems]);
  const skalaJudulRaw = (gayaJudulTentang as Record<string, unknown> | undefined)?.["--skala-judul"];
  const skalaJudulTentang = typeof skalaJudulRaw === "string" ? skalaJudulRaw : undefined;

  if (!tentangAktif && !limaAktif) return null;

  return (
    <div className={styles.stage}>
      {tentangAktif && (
        <AboutTeks
          label={labelTentang}
          labelStyle={{
            ...gayaEyebrowTentang,
            color: gayaEyebrowTentang?.color ?? tintaTentang,
          }}
          text={paragrafTentangTeks}
          textColor={gayaJudulTentang?.color ?? tintaTentang}
          textScale={skalaJudulTentang}
          keywordColor={gayaEyebrowTentang?.color}
          panelStyle={gayaPanelTentang}
        />
      )}

      {limaAktif && (
        <FlowWaysStory
          background={gayaBackgroundTentang?.backgroundColor ?? LATAR_TENTANG_DEFAULT}
          firstBackground={gayaBackgroundLima?.backgroundColor}
          firstInk={tintaLima}
          items={storyItems}
        />
      )}
    </div>
  );
}
