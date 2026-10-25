import AllEventsGrid from "@/components/AllEventsGrid";
import BackButton from "@/components/BackButton";
import Breadcrumb from "@/components/Breadcrumb";
import ScrollReveal from "@/components/ScrollReveal";
import type { Metadata } from "next";
import styles from "./EventPage.module.css";

export const metadata: Metadata = {
  title: "Agenda & Kegiatan - IKASADA FIB UI",
  description: "Seluruh agenda kebudayaan dan program kerja IKASADA FIB UI.",
};

export default function EventPage() {
  return (
    <>
      <main className="public-page relative z-10 min-h-screen">
        <section className={styles.hero} aria-labelledby="event-page-title">
          <div className={styles.heroInner}>
            <div className={styles.utility}>
              <BackButton fallback="/#kegiatan" forceFallback />
              <Breadcrumb
                tone="dark"
                items={[
                  { label: "Beranda", href: "/" },
                  { label: "Kegiatan" },
                ]}
              />
            </div>

            <div className={styles.intro}>
              <h1 id="event-page-title" className={styles.title}>
                Hadiri Kegiatan Kami.
              </h1>
              <p className={styles.lead}>
                Ikuti berbagai agenda kebudayaan, diskusi ilmiah, dan ajang kumpul
                alumni mendatang.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.catalogSurface} aria-label="Daftar kegiatan IKASADA">
          <div className={styles.catalog}>
            <AllEventsGrid perPage={6} />
          </div>
        </section>
      </main>
      <ScrollReveal />
    </>
  );
}
