"use client";

import { Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import {
  emailKontakBeranda,
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";
import styles from "./ContactSection.module.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const navigasi = [
  { id: "hero", label: "Beranda" },
  { id: "alumni", label: "Direktori Alumni", kunci: "direktori-alumni" },
  { id: "berita", label: "Berita", kunci: "berita" },
  { id: "kegiatan", label: "Kegiatan", kunci: "kegiatan" },
  { id: "arsip", label: "Arsip", kunci: "arsip" },
  { id: "overview", label: "Tentang Kami", kunci: "tentang-kami" },
];

const JUDUL = "Mari saling terhubung dengan kami.";
const DESKRIPSI =
  "Mau daftar jadi anggota, memperbarui data alumni, atau sekadar bertanya soal kegiatan kami? Sampaikan saja—kami senang mendengarnya.";

export default function ContactSection() {
  const beranda = useBerandaConfig();

  if (!sectionAktif(beranda, "kontak")) return null;

  const email = emailKontakBeranda(beranda);
  const gayaJudulKontak = gayaSection(beranda, "kontak", "judul");
  const gayaBackgroundKontak = gayaBackgroundSection(beranda, "kontak");
  const judul = teksSection(beranda, "kontak", "judul", JUDUL);
  const deskripsi = teksSection(beranda, "kontak", "deskripsi", DESKRIPSI);
  const tautan = navigasi.filter(
    (item) => !item.kunci || sectionAktif(beranda, item.kunci)
  );

  return (
    <section
      id="kontak"
      style={gayaBackgroundKontak}
      aria-labelledby="kontak-title"
      className={`home-jakarta-section ${plusJakartaSans.className} ${styles.contactSection} reveal-section`}
    >
      <div className={`${styles.shell} home-section-container`}>
        <div className={styles.invitation}>
          <div className={styles.invitationCopy}>
            <h2
              id="kontak-title"
              className={`${styles.title} section-title`}
              style={gayaJudulKontak}
            >
              {judul}
            </h2>
            <p className={styles.copy}>{deskripsi}</p>
          </div>
          <a className={styles.cta} href={`mailto:${email}`}>
            Hubungi pengurus
            <ArrowRight size={24} aria-hidden="true" />
          </a>
        </div>
        <footer
          className={styles.footer}
          role="contentinfo"
          aria-label="IKASADA FIB UI"
        >
          <div className={styles.grid}>
            <div className={styles.brand}>
              <div className={styles.identity}>
                <div className={styles.logo}>
                  <Image
                    src="/logo/ikasada-logo.jpeg"
                    alt=""
                    width={80}
                    height={100}
                    sizes="80px"
                  />
                </div>
                <span className={styles.wordmark}>IKASADA FIB UI</span>
              </div>
              <p className={styles.brandCopy}>
                Ruang silaturahmi, kolaborasi, dan kontribusi lintas angkatan.
              </p>
            </div>
            <nav aria-labelledby="footer-navigation-title">
              <h3 id="footer-navigation-title" className={styles.columnTitle}>
                Jelajahi
              </h3>
              <ul className={styles.links}>
                {tautan.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <h3 className={styles.columnTitle}>Sekretariat</h3>
              <address className={styles.address}>
                Gedung IX FIB UI<br />
                Kampus Depok<br />
                Jawa Barat 16424
                <a className={styles.email} href={`mailto:${email}`}>
                  {email}
                </a>
              </address>
            </div>
          </div>
          <div className={styles.footerLine}>
            <span>IKASADA FIB UI</span>
            <span>Depok / Jawa Barat</span>
          </div>
        </footer>
      </div>
    </section>
  );
}
