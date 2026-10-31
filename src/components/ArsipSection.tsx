"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, ArrowUpRight, LockSimple } from "@phosphor-icons/react";
import { bacaDataBeranda, simpanDataBeranda } from "@/lib/home-data-cache";
import type { PublicArsip } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { reportAssetError } from "@/lib/asset-error";
import { keTeksBiasa } from "@/lib/rich-text";
import WaysStory from "./WaysStory";
import { bacaWarnaPanelArsip, tintaPanelArsip, WARNA_PANEL_ARSIP_BAWAAN } from "@/lib/arsip-panels";
import styles from "./ArsipSection.module.css";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";

const TAMPIL = 4;
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

function SampulArsip({ item }: { item: PublicArsip }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = item.terkunci ? null : item.gambarSampulUrl;
  return (
    <figure className={styles.cover}>
      {url && failedUrl !== url ? (
        <Image
          src={url}
          alt={item.alt || ""}
          fill
          unoptimized
          sizes="(max-width: 700px) 53vw, 38vw"
          onError={() => {
            reportAssetError(url, "image");
            setFailedUrl(url);
          }}
        />
      ) : (
        <div className={styles.coverFallback}>
          {item.terkunci ? <><LockSimple aria-hidden="true" size={22} />Arsip khusus alumni</> : "Sampul belum tersedia"}
        </div>
      )}
    </figure>
  );
}

/** Empat arsip publik terbaru dengan pola panel WaysStory. */
export default function ArsipSection() {
  const beranda = useBerandaConfig();
  const [dokumen, setDokumen] = useState<PublicArsip[]>(() => bacaDataBeranda<PublicArsip[]>("arsip") ?? []);
  const [isLoading, setIsLoading] = useState(() => bacaDataBeranda("arsip") === undefined);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      if (bacaDataBeranda("arsip") !== undefined) return;
      const hasil = await panggilApi<PublicArsip[]>(`/api/public/arsip?limit=${TAMPIL}`);
      if (!active) return;
      if (hasil.ok) {
        simpanDataBeranda("arsip", hasil.data);
        setDokumen(hasil.data);
      } else {
        reportAssetError("/api/public/arsip", "api");
      }
      setIsLoading(false);
    }
    fetchData();
    return () => { active = false; };
  }, []);

  const eyebrow = teksSection(beranda, "arsip", "eyebrow", "Arsip");
  const title = teksSection(beranda, "arsip", "judul", "Dokumen & Laporan.");
  const titleStyle = gayaSection(beranda, "arsip", "judul");
  const kickerStyle = gayaSection(beranda, "arsip", "eyebrow");
  const backgroundStyle = gayaBackgroundSection(beranda, "arsip");
  const ampersandIndex = title.indexOf("&");
  const warnaPanel = bacaWarnaPanelArsip(beranda?.sections.find(s => s.kunci === "arsip")?.konfigurasi);

  if (!sectionAktif(beranda, "arsip") || (!isLoading && dokumen.length === 0)) return null;

  return (
    <section id="arsip" style={backgroundStyle} aria-labelledby="arsip-title" className={`home-jakarta-section ${plusJakartaSans.className} ${styles.section}`}>
      <header className={`${styles.header} home-section-container`}>
        <span className={`section-label ${styles.eyebrow}`} style={kickerStyle}>{eyebrow}</span>
        <h2 id="arsip-title" className={`section-title ${styles.title}`} style={titleStyle}>
          {ampersandIndex === -1 ? title : <>{title.slice(0, ampersandIndex)}<span className={titleStyle?.color ? undefined : styles.ampersand}>&amp;</span>{title.slice(ampersandIndex + 1)}</>}
        </h2>
      </header>
      {isLoading ? (
        <div className="home-section-container" role="status">
          <span className="sr-only">Memuat arsip</span>
          {Array.from({ length: TAMPIL }, (_, index) => <div key={index} className={styles.skeleton} aria-hidden="true" />)}
        </div>
      ) : (
        <WaysStory
          sectionId="arsip-story"
          showIntro={false}
          itemNoun="arsip"
          variant="archive"
          kicker={eyebrow}
          title={title}
          firstInk="#0f1012"
          items={dokumen.map((item, index) => {
            const kustom = warnaPanel[index]?.trim();
            const backgroundColor = kustom && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(kustom)
              ? kustom : WARNA_PANEL_ARSIP_BAWAAN[index % 4];
            const inkColor = tintaPanelArsip(backgroundColor);
            const accent = inkColor === "#ffffff" ? "#ffffff" : "#0b5ed7";
            const muted = inkColor === "#ffffff" ? "rgba(255,255,255,.85)" : "#666b73";
            return {
            title: item.judul,
            label: "Arsip IKASADA",
            description: item.terkunci ? "Arsip ini tersedia khusus untuk alumni." : keTeksBiasa(item.deskripsiSingkat),
            image: "",
            imageAlt: "",
            backgroundColor,
            inkColor,
            subtitle: <p className={styles.subtitle} style={{ color: accent }}>{item.jenis.nama} · {item.berkasFormat?.toUpperCase() || "ARSIP"} · {new Date(item.tanggalUpload).getFullYear()}</p>,
            media: <SampulArsip key={item.id} item={item} />,
            action: <>
              <div className={styles.access} style={{ color: muted }}>
                {item.terkunci ? <><LockSimple aria-hidden="true" size={13} /> Khusus alumni · terkunci</> : item.akses === "PUBLIK" ? "Arsip publik" : "Unduh untuk alumni"}
              </div>
              <Link href={`/arsip/${item.slug}`} className={styles.detail} style={{ color: accent }}>
                {item.terkunci ? "Lihat akses arsip" : "Lihat arsip"}<ArrowUpRight aria-hidden="true" size={18} />
              </Link>
            </>,
          };
          })}
        />
      )}
      {!isLoading && <div className={`${styles.footer} home-section-container`}>
        <Link href="/arsip" className="augen-cta whitespace-nowrap px-5">Lihat semua arsip<ArrowRight weight="bold" aria-hidden="true" /></Link>
      </div>}
    </section>
  );
}
