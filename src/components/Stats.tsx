"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { m } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import type { PublicStatistik } from "@/lib/types";
import { reportAssetError } from "@/lib/asset-error";
import WorldSebaranMap from "./WorldSebaranMap";
import { useBerandaConfig } from "@/lib/beranda-client";
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

function formatTanggalMono(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
  const month = new Intl.DateTimeFormat("id-ID", {
    month: "short",
    timeZone: "Asia/Jakarta",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
  const year = new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${day} ${month} ${year}`;
}

/**
 * Statistik beranda.
 *
 * Satu section, latar putih, tanpa blok gelap: angka ringkas, peta sebaran, dan
 * sebaran angkatan semuanya duduk di permukaan yang sama. Sebelumnya angka
 * menduduki kartu setinggi ~420px dan sebaran angkatan terkunci di dalam kotak
 * hitam terpisah — dua-duanya memakan ruang tanpa menambah informasi.
 */
export default function Stats() {
  const [statistik, setStatistik] = useState<PublicStatistik | null>(null);
  const beranda = useBerandaConfig();
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const barisAngkaRef = useRef<HTMLDivElement>(null);
  const [angkaTerlihat, setAngkaTerlihat] = useState(false);
  const sectionClassName = `${styles.section} ${plusJakartaSans.className}`;

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
      try {
        const res = await fetch("/api/public/statistik");
        const hasil = await res.json();
        if (res.ok) {
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
      <section id="statistik" className={sectionClassName}>
        <div className={styles.shell}>
          <div className="animate-pulse">
            <div className="h-3 w-24 bg-[#0f1012]/10" />
            <div className="mt-5 h-10 w-64 max-w-full bg-[#0f1012]/10" />
            <div className={`${styles.figureGrid} mt-10`}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={styles.figureCard}>
                  <div className="h-9 w-24 bg-[#0f1012]/10" />
                  <div className="mt-3 h-3 w-20 bg-[#0f1012]/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (failed || !statistik) {
    return (
      <section id="statistik" className={sectionClassName}>
        <div className={`${styles.shell} ${styles.failure}`}>
          Statistik sedang tidak tersedia. Silakan coba beberapa saat lagi.
        </div>
      </section>
    );
  }

  const { angkatanPerDekade } = statistik;

  const decadeRange =
    angkatanPerDekade.length > 0
      ? `${angkatanPerDekade[0].dekade}-an – ${
          angkatanPerDekade[angkatanPerDekade.length - 1].dekade
        }-an`
      : "—";

  const figures = [
    { label: "Alumni terdaftar", value: statistik.totalAlumni, animated: true },
    { label: "Kegiatan terselenggara", value: statistik.totalKegiatan, animated: true },
    { label: "Pengurus inti", value: statistik.totalPengurus, animated: true },
    { label: "Rentang angkatan", value: decadeRange, animated: false },
  ];

  const sek = (kunci: string) =>
    beranda?.sections.find((s) => s.kunci === kunci);
  const aktif = (kunci: string) => sek(kunci)?.aktif ?? true;
  const teks = (nilai: string | null | undefined, fallback: string) =>
    nilai && nilai.trim() ? nilai : fallback;

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

  return (
    <section id="statistik" className={sectionClassName}>
      <div className={styles.shell}>
        {aktif("statistik") && (
          <>
            {/* Header */}
            <m.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: EASE }}
              className={styles.intro}
            >
              <div>
                <span className={`${styles.eyebrow} section-label`}>
                  {teks(sek("statistik")?.eyebrow, "Statistik")}
                </span>
                <h2 className={`${styles.heading} section-title`}>
                  {teks(sek("statistik")?.judul, "Sejauh ini")}
                </h2>
              </div>
              <p className={styles.introCopy}>
                {teks(
                  sek("statistik")?.deskripsi,
                  "Jejak alumni kami yang terus bertambah, dan apa yang sedang kami siapkan."
                )}
              </p>
            </m.div>

            {/* Angka ringkas — satu baris, bukan kartu setinggi layar */}
            <m.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              ref={barisAngkaRef}
              className={styles.figureGrid}
            >
              {figures.map((figure) => (
                <div key={figure.label} className={styles.figureCard}>
                  <div className={styles.figureValue}>
                    {figure.animated ? (
                      <AnimatedNumber
                        value={figure.value as number}
                        aktif={angkaTerlihat}
                      />
                    ) : (
                      figure.value
                    )}
                  </div>
                  <div className={styles.figureLabel}>{figure.label}</div>
                </div>
              ))}
            </m.div>
          </>
        )}
      </div>

      {aktif("sebaran-geografis") && (
        <m.div
          className={styles.geoSection}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        >
          <div className={styles.shell}>
            {/* Peta sebaran */}
            <WorldSebaranMap
              titik={beranda?.sebaran}
              asal={asalSebaran}
              eyebrow={sek("sebaran-geografis")?.eyebrow}
              judul={sek("sebaran-geografis")?.judul}
              deskripsi={sek("sebaran-geografis")?.deskripsi}
            />
          </div>
        </m.div>
      )}

      {(aktif("sebaran-angkatan") || aktif("agenda")) && (
        <m.div
          className={styles.detailsSection}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
        >
          <div className={styles.shell}>
            <div className={styles.details}>
              {/* Sebaran angkatan */}
              {aktif("sebaran-angkatan") && (
                <div>
                  <h3 className={styles.detailTitle}>
                    {teks(sek("sebaran-angkatan")?.judul, "Sebaran angkatan")}
                  </h3>
                  {angkatanPerDekade.length === 0 ? (
                    <p className={styles.detailEmpty}>
                      Data angkatan belum tersedia.
                    </p>
                  ) : (
                    <table className={styles.tabel}>
                      <caption className="sr-only">
                        Sebaran alumni per dekade angkatan
                      </caption>
                      <tbody>
                        {angkatanPerDekade.map((d) => (
                          <tr key={d.dekade}>
                            <th scope="row">{d.dekade}-an</th>
                            <td>{d.jumlah}</td>
                          </tr>
                        ))}
                        <tr className={styles.tabelTotal}>
                          <th scope="row">Total</th>
                          <td>{statistik.totalAlumni}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Agenda */}
              {aktif("agenda") && (
                <div className={styles.agenda}>
                  <div>
                    <h3 className={styles.detailTitle}>Terakhir</h3>
                    {statistik.kegiatanTerakhir ? (
                      <Link
                        href={`/kegiatan/${statistik.kegiatanTerakhir.slug}`}
                        className={styles.agendaLink}
                      >
                        <div className={styles.agendaDate}>
                          {formatTanggalMono(
                            statistik.kegiatanTerakhir.tanggalMulai
                          )}
                        </div>
                        <div className={styles.agendaJudul}>
                          {statistik.kegiatanTerakhir.judul}
                        </div>
                      </Link>
                    ) : (
                      <p className={styles.detailEmpty}>Belum ada kegiatan.</p>
                    )}
                  </div>

                  <div>
                    <h3 className={styles.detailTitle}>Akan datang</h3>
                    {statistik.kegiatanMendatang.length === 0 ? (
                      <p className={styles.detailEmpty}>
                        Belum ada agenda terjadwal.
                      </p>
                    ) : (
                      <ul className={styles.agendaList}>
                        {statistik.kegiatanMendatang.map((k) => (
                          <li key={k.id}>
                            <Link
                              href={`/kegiatan/${k.slug}`}
                              className={styles.agendaItem}
                            >
                              <span className={styles.agendaDate}>
                                {formatTanggalMono(k.tanggalMulai)}
                              </span>
                              <span className={styles.agendaJudul}>
                                {k.judul}
                              </span>
                              <ArrowRight
                                weight="bold"
                                className={styles.agendaArrow}
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </m.div>
      )}
    </section>
  );
}
