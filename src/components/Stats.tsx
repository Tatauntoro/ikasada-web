"use client";

import { bacaDataBeranda, simpanDataBeranda } from "@/lib/home-data-cache";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { m } from "framer-motion";
import type { PublicStatistik } from "@/lib/types";
import { reportAssetError } from "@/lib/asset-error";
import WorldSebaranMap from "./WorldSebaranMap";
import {
  gayaBackgroundSection,
  useBerandaConfig,
  gayaSection,
} from "@/lib/beranda-client";
import styles from "./Stats.module.css";

const EASE = [0.22, 0.61, 0.36, 1] as const;

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Angka yang naik menghitung.
 *
 * Hitungannya baru mulai saat `aktif` — yaitu ketika baris angka ini benar-benar
 * masuk viewport. Sebelumnya efek ini jalan saat mount, jadi angkanya sudah
 * selesai berhitung jauh sebelum section-nya terlihat.
 */
function AnimatedNumber({ value, aktif }: { value: number; aktif: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!aktif) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) {
      const frame = requestAnimationFrame(() => setDisplayValue(value));
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now();
    const duration = 900;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [aktif, value]);

  return <span>{displayValue.toLocaleString("id-ID")}</span>;
}

/**
 * Statistik beranda: angka ringkas, peta, angkatan, sektor, dan relevansi
 * sementara berdasarkan profesi. Semua angka dihitung dari data publik.
 */
export default function Stats() {
  const [statistik, setStatistik] = useState<PublicStatistik | null>(() => bacaDataBeranda<PublicStatistik | null>("statistik") ?? null);
  const beranda = useBerandaConfig();
  const [isLoading, setIsLoading] = useState(() => bacaDataBeranda("statistik") === undefined);
  const [failed, setFailed] = useState(false);
  const barisAngkaRef = useRef<HTMLDivElement>(null);
  const [angkaTerlihat, setAngkaTerlihat] = useState(false);
  const sectionClassName = `${styles.section} ${plusJakartaSans.className}`;
  const gayaBackgroundStatistik = (() => {
    const background = beranda?.sections.find((s) => s.kunci === "statistik")?.warnaBackground;
    const match = background?.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    let luminance = 1; // Default kanvas putih pada layout terpadu.
    if (match) {
      const hex = match[1].length === 3
        ? match[1].split("").map((digit) => digit + digit).join("")
        : match[1];
      const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
      const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    }
    const terang = luminance > 0.42;
    return {
      ...gayaBackgroundSection(beranda, "statistik"),
      "--stats-ink": terang ? "#0f1012" : "#ffffff",
      "--stats-muted": terang ? "rgba(15, 16, 18, 0.68)" : "rgba(255, 255, 255, 0.85)",
      "--stats-rule": terang ? "rgba(15, 16, 18, 0.18)" : "rgba(255, 255, 255, 0.3)",
      "--stats-blue": terang ? "#0071e3" : "#b7d8ff",
    } as CSSProperties;
  })();

  /*
   * Pemicu hitungan, dipasang sendiri dengan IntersectionObserver.
   *
   * Bukan `useInView` dari framer-motion: komponen ini lebih dulu merender
   * skeleton saat `isLoading`, jadi pada render pertama ref-nya belum menunjuk
   * elemen apa pun. Hook itu memasang observer sekali per objek ref, dan objek
   * ref-nya stabil antar render — akibatnya ia tidak pernah mengamati elemen
   * yang sebenarnya, dan angkanya tersangkut di 0. Efek ini ikut jalan lagi
   * begitu skeleton berganti jadi isi.
   */
  useEffect(() => {
    const el = barisAngkaRef.current;
    if (!el) return;

    const pengamat = new IntersectionObserver(
      (entri) => {
        if (!entri.some((e) => e.isIntersecting)) return;
        pengamat.disconnect();
        setAngkaTerlihat(true);
      },
      { threshold: 0.4 }
    );
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [isLoading]);

  useEffect(() => {
    async function ambil() {
      if (bacaDataBeranda("statistik") !== undefined) return;
      try {
        const res = await fetch("/api/public/statistik");
        const hasil = await res.json();
        if (res.ok) {
          simpanDataBeranda("statistik", hasil.data);
      setStatistik(hasil.data);
        } else {
          setFailed(true);
        }
      } catch {
        reportAssetError("/api/public/statistik", "api");
        setFailed(true);
      } finally {
        setIsLoading(false);
      }
    }
    ambil();
  }, []);

  if (isLoading) {
    return (
      <section id="statistik" className={sectionClassName} style={gayaBackgroundStatistik}>
        <div className={styles.shell}>
          <div className="animate-pulse">
            <div className="h-3 w-32 bg-[#0f1012]/10" />
            <div className="mt-7 h-20 w-96 max-w-full bg-[#0f1012]/10" />
            <div className={`${styles.loadingGrid} mt-10`}>
              <div className={styles.loadingPanel} />
              <div className={styles.loadingPanel} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (failed || !statistik) {
    return (
      <section id="statistik" className={sectionClassName} style={gayaBackgroundStatistik}>
        <div className={`${styles.shell} ${styles.failure}`}>
          Statistik sedang tidak tersedia. Silakan coba beberapa saat lagi.
        </div>
      </section>
    );
  }

  const { angkatanPerDekade, sebaranSektor, relevansiPekerjaan } = statistik;

  const figures = [
    { label: "Alumni terdaftar", value: statistik.totalAlumni },
    { label: "Kegiatan terselenggara", value: statistik.totalKegiatan },
    { label: "Pengurus inti", value: statistik.totalPengurus },
  ];

  const sek = (kunci: string) =>
    beranda?.sections.find((s) => s.kunci === kunci);
  const aktif = (kunci: string) => sek(kunci)?.aktif ?? true;
  const tampilStatistik = aktif("statistik");
  const tampilGeografis = aktif("sebaran-geografis");
  const tampilAngkatan = aktif("sebaran-angkatan");
  // "agenda" tetap menjadi kunci sakelar sektor dan relevansi di admin.
  const tampilDetailAlumni = aktif("agenda");
  const teks = (nilai: string | null | undefined, fallback: string) =>
    nilai && nilai.trim() ? nilai : fallback;
  const gayaJudulStatistik = gayaSection(beranda, "statistik", "judul");
  const gayaEyebrowStatistik = gayaSection(beranda, "statistik", "eyebrow");
  const cohortMaksimum = Math.max(1, ...angkatanPerDekade.map((item) => item.jumlah));
  const sektorMaksimum = Math.max(1, ...sebaranSektor.map((item) => item.jumlah));

  // Titik asal busur (almamater) dari Kelola Beranda.
  const asalSebaran = (() => {
    const konfig = sek("sebaran-geografis")?.konfigurasi as
      | { asal?: { nama?: unknown; lat?: unknown; lng?: unknown } }
      | null
      | undefined;
    const a = konfig?.asal;
    if (
      a &&
      typeof a.nama === "string" &&
      a.nama.trim() &&
      typeof a.lat === "number" &&
      typeof a.lng === "number"
    ) {
      return { nama: a.nama.trim(), lat: a.lat, lng: a.lng };
    }
    return undefined;
  })();

  const topGridClass = `${styles.topGrid} ${tampilAngkatan && tampilGeografis ? "" : styles.topGridSingle}`;
  const persentaseSesuai = relevansiPekerjaan.persenSesuai ?? 0;
  const gayaBar = (nilai: number, maksimum: number): CSSProperties => ({
    width: `${maksimum > 0 ? Math.max(0, Math.min(100, (nilai / maksimum) * 100)) : 0}%`,
  });
  const formatPersen = (nilai: number | null) =>
    nilai === null
      ? "—"
      : `${nilai.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

  return (
    <section id="statistik" className={sectionClassName} style={gayaBackgroundStatistik}>
      <div className={styles.shell}>
        {tampilStatistik && (
          <m.header
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={styles.intro}
          >
            <span className={`${styles.eyebrow} section-label`} style={gayaEyebrowStatistik}>
              {teks(sek("statistik")?.eyebrow, "IKASADA / Data Alumni")}
            </span>
            <h2 className={`${styles.heading} section-title`} style={gayaJudulStatistik}>
              {teks(sek("statistik")?.judul, "Sejauh ini.")}
            </h2>
            <p className={styles.introCopy}>
              {teks(
                sek("statistik")?.deskripsi,
                "Statistik alumni, sebaran jejaring, dan perjalanan angkatan."
              )}
            </p>
          </m.header>
        )}

        {(tampilAngkatan || tampilGeografis) && (
          <div className={topGridClass}>
            {tampilAngkatan && (
              <section className={styles.panel} aria-labelledby="angkatan-title">
                <p className={styles.panelLabel} style={gayaSection(beranda, "sebaran-angkatan", "eyebrow")}>
                  01 / {teks(sek("sebaran-angkatan")?.judul, "Sebaran Angkatan")}
                </p>
                <h3 id="angkatan-title" className={styles.panelHeading}>
                  Alumni per dekade
                </h3>
                {angkatanPerDekade.length > 0 ? (
                  <div className={styles.cohorts} aria-label="Jumlah alumni menurut dekade angkatan">
                    {angkatanPerDekade.map((item) => (
                      <div className={styles.cohortRow} key={item.dekade}>
                        <span>{item.dekade}-an</span>
                        <span className={styles.track} aria-hidden="true">
                          <span className={styles.fill} style={gayaBar(item.jumlah, cohortMaksimum)} />
                        </span>
                        <strong aria-label={`${item.jumlah} alumni`}>
                          {item.jumlah.toLocaleString("id-ID")}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.empty}>Data angkatan belum tersedia.</p>
                )}
              </section>
            )}

            {tampilGeografis && (
              <section className={`${styles.panel} ${styles.mapPanel}`} aria-labelledby="geografis-title">
                <p className={styles.panelLabel} style={gayaSection(beranda, "sebaran-geografis", "eyebrow")}>
                  02 / {[sek("sebaran-geografis")?.eyebrow, sek("sebaran-geografis")?.judul]
                    .filter((nilai): nilai is string => Boolean(nilai?.trim()))
                    .join(" ") || "Sebaran Geografis"}
                </p>
                <h3 id="geografis-title" className={styles.panelHeading}>
                  Titik jejaring lintas wilayah
                </h3>
                <WorldSebaranMap titik={beranda?.sebaran} asal={asalSebaran} />
              </section>
            )}
          </div>
        )}

        {tampilDetailAlumni && (
          <div className={styles.detailGrid}>
            <section className={styles.panel} aria-labelledby="sektor-title">
              <p className={styles.panelLabel}>03 / Sebaran Sektor</p>
              <h3 id="sektor-title" className={styles.panelHeading}>
                {statistik.totalAlumni.toLocaleString("id-ID")} alumni menurut sektor industri
              </h3>
              {sebaranSektor.length > 0 ? (
                <div className={styles.sectors} aria-label="Jumlah alumni menurut sektor industri">
                  {sebaranSektor.map((sektor) => (
                    <div className={styles.sectorRow} key={sektor.id ?? "belum-diketahui"}>
                      <span>{sektor.nama}</span>
                      <span className={styles.track} aria-hidden="true">
                        <span className={styles.fill} style={gayaBar(sektor.jumlah, sektorMaksimum)} />
                      </span>
                      <strong aria-label={`${sektor.jumlah} alumni`}>
                        {sektor.jumlah.toLocaleString("id-ID")}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Data sektor belum tersedia.</p>
              )}
            </section>

            <section className={styles.panel} aria-labelledby="relevansi-title">
              <p className={styles.panelLabel}>04 / Relevansi Pekerjaan</p>
              <h3 id="relevansi-title" className={styles.panelHeading}>
                Klasifikasi sementara berdasarkan profesi
              </h3>
              <div className={styles.relevanceNumbers}>
                <div className={styles.suitable}>
                  <strong>{formatPersen(relevansiPekerjaan.persenSesuai)}</strong>
                  <span>
                    Sesuai{relevansiPekerjaan.totalDinilai > 0 && ` · ${relevansiPekerjaan.sesuai.toLocaleString("id-ID")} alumni`}
                  </span>
                </div>
                <div>
                  <strong>{formatPersen(relevansiPekerjaan.persenTidakSesuai)}</strong>
                  <span>
                    Tidak sesuai{relevansiPekerjaan.totalDinilai > 0 && ` · ${relevansiPekerjaan.tidakSesuai.toLocaleString("id-ID")} alumni`}
                  </span>
                </div>
              </div>
              <div
                className={styles.relevanceTrack}
                role="img"
                aria-label={
                  relevansiPekerjaan.totalDinilai > 0
                    ? `${formatPersen(relevansiPekerjaan.persenSesuai)} sesuai, ${formatPersen(relevansiPekerjaan.persenTidakSesuai)} tidak sesuai`
                    : "Data profesi belum tersedia"
                }
              >
                <span style={{ width: `${persentaseSesuai}%` }} />
              </div>
              <p className={styles.relevanceNote}>
                Sesuai: dosen, guru, atau pengajar. Klasifikasi sementara, belum berdasarkan survei.
                {relevansiPekerjaan.belumDiketahui > 0 && (
                  <> {relevansiPekerjaan.belumDiketahui.toLocaleString("id-ID")} alumni tanpa profesi belum dihitung.</>
                )}
              </p>
              {relevansiPekerjaan.totalDinilai === 0 && (
                <p className={styles.empty}>Data profesi belum tersedia.</p>
              )}
            </section>
          </div>
        )}

        {tampilStatistik && (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
            ref={barisAngkaRef}
            className={styles.metrics}
            aria-label="Angka utama"
          >
            {figures.map((figure) => (
              <div key={figure.label} className={styles.metric}>
                <strong>
                  <AnimatedNumber value={figure.value} aktif={angkaTerlihat} />
                </strong>
                <span>{figure.label}</span>
              </div>
            ))}
          </m.div>
        )}
      </div>
    </section>
  );
}
