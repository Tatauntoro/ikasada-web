import { KONTAK } from "@/data/kontak";
import { Plus_Jakarta_Sans } from "next/font/google";
import styles from "./ContactSection.module.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function ContactSection() {
  return (
    <section
      id="kontak"
      className={`home-jakarta-section ${plusJakartaSans.className} ${styles.contactSection} reveal-section`}
    >
      <div className={styles.shell}>
        <div className={styles.grid}>
          <div className={styles.lead}>
            <h2 className={`${styles.title} section-title`}>
              Mari saling terhubung dengan kami.
            </h2>
            <p className={styles.copy}>
              Mau daftar jadi anggota, memperbarui data alumni, atau sekadar
              bertanya soal kegiatan kami? Sampaikan saja—kami senang
              mendengarnya.
            </p>
            <a className={styles.email} href={`mailto:${KONTAK.email}`}>
              {KONTAK.email}
            </a>
            <p className={styles.location}>
              Sekretariat Gedung IX FIB UI<br />
              Kampus Depok, Jawa Barat 16424
            </p>
          </div>
        </div>
        <div className={styles.footerLine}>
          <span>IKASADA FIB UI</span>
          <span>Depok / Jawa Barat</span>
        </div>
      </div>
    </section>
  );
}
