"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, X } from "@phosphor-icons/react";
import type { PublicKegiatan } from "@/lib/types";
import { useKegiatanPublik, agendaTerpilih, tanggalKegiatan, formatAgenda, labelKategori } from "@/lib/kegiatan-client";
import { keTeksBiasa } from "@/lib/rich-text";
import { sectionAktif, teksSection, useBerandaConfig, gayaSection, gayaBackgroundSection } from "@/lib/beranda-client";
import { FotoKegiatan, MetadataKegiatan } from "./kegiatan/KegiatanMedia";
import styles from "./kegiatan/KegiatanHome.module.css";

function KalenderBeranda({ items }: { items: PublicKegiatan[] }) {
  const [today] = useState(() => tanggalKegiatan(new Date()));
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selection, setSelection] = useState<{ day: string; items: PublicKegiatan[] } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (start.getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Math.ceil((offset + total) / 7) * 7;
  const monthLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" }).format(start);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!selection || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, [selection]);
  function changeMonth(step: number) { setMonth(new Date(Date.UTC(year, monthNumber - 1 + step, 1)).toISOString().slice(0, 7)); }
  function open(day: string, events: PublicKegiatan[], event: MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setSelection({ day, items: events });
  }
  return <>
    <section className={styles.monthCalendar} aria-label="Kalender kegiatan">
      <div className={styles.calendarHeading}><div><h3>Kalender kegiatan</h3><p aria-live="polite">{monthLabel}</p></div><div className={styles.calendarControls}>
        <button type="button" className={styles.todayButton} onClick={() => setMonth(today.slice(0, 7))}>Hari ini</button>
        <button type="button" className={styles.monthButton} aria-label="Bulan sebelumnya" onClick={() => changeMonth(-1)}>‹</button>
        <button type="button" className={styles.monthButton} aria-label="Bulan berikutnya" onClick={() => changeMonth(1)}>›</button>
      </div></div>
      <div className={styles.weekdays} aria-hidden="true">{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => <span key={day}>{day}</span>)}</div>
      <div className={styles.monthGrid} aria-label="Tanggal kegiatan">
        {Array.from({ length: cells }, (_, index) => {
          const date = new Date(Date.UTC(year, monthNumber - 1, 1 - offset + index));
          const key = date.toISOString().slice(0, 10), outside = key.slice(0, 7) !== month;
          const agenda = outside ? [] : items.filter(item => key >= tanggalKegiatan(item.tanggalMulai) && key <= tanggalKegiatan(item.tanggalSelesai || item.tanggalMulai));
          return <div key={key} className={`${styles.dateCell} ${outside ? styles.outside : ""} ${agenda.length ? styles.hasAgenda : ""} ${key === today ? styles.isToday : ""}`}>
            <span className={styles.dayNumber} aria-current={key === today ? "date" : undefined}>{date.getUTCDate()}</span>
            {agenda.slice(0, 2).map(item => <button type="button" key={item.id} className={styles.eventChip} aria-label={`${item.judul}, ${formatAgenda(key + "T00:00:00Z", { day: "numeric", month: "long" })}`} onClick={event => open(key, [item], event)}>{item.judul}</button>)}
            {agenda.length > 2 && <button type="button" className={`${styles.eventChip} ${styles.more}`} onClick={event => open(key, agenda, event)}>+{agenda.length - 2} lainnya</button>}
          </div>;
        })}
      </div>
      <div className={styles.calendarKey}><span><i />Tanggal hijau memiliki kegiatan</span><span>Waktu dalam WIB</span></div>
    </section>
    <dialog ref={dialogRef} className={styles.eventDialog} aria-labelledby="calendar-event-title" onClose={() => { setSelection(null); triggerRef.current?.focus({ preventScroll: true }); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
    }}>
      <div className={styles.dialogTop}><span>KEGIATAN IKASADA</span><button type="button" aria-label="Tutup ringkasan" onClick={() => dialogRef.current?.close()}><X /></button></div>
      {selection && <div className={styles.dialogContent}>
        {selection.items.length > 1 && <h2 id="calendar-event-title">{formatAgenda(selection.day + "T00:00:00Z", { day: "numeric", month: "long", year: "numeric" })}</h2>}
        {selection.items.map(item => <article key={item.id} className={selection.items.length > 1 ? styles.dayAgenda : undefined}>
          <span className={styles.dialogCategory}>{labelKategori(item.kategori)}</span>
          <h2 id={selection.items.length === 1 ? "calendar-event-title" : undefined}>{item.judul}</h2>
          <MetadataKegiatan item={item} className={styles.meta} />
          {item.tanggalSelesai && <p>Sampai {formatAgenda(item.tanggalSelesai, { day: "numeric", month: "long", year: "numeric" })}</p>}
          <p>{keTeksBiasa(item.deskripsiSingkat)}</p><Link href={`/kegiatan/${item.slug}`} className={styles.primary} onClick={() => dialogRef.current?.close()}>Lihat detail kegiatan <ArrowUpRight weight="bold" /></Link>
        </article>)}
      </div>}
    </dialog>
  </>;
}

export default function EventsSection() {
  const beranda = useBerandaConfig();
  const { items, loading, error, retry } = useKegiatanPublik();
  const [now] = useState(() => Date.now());
  const feature = agendaTerpilih(items, now);
  if (!sectionAktif(beranda, "kegiatan")) return null;
  return <section id="kegiatan" className={`home-jakarta-section ${styles.root}`} style={gayaBackgroundSection(beranda, "kegiatan")} aria-labelledby="kegiatan-title">
    <div className="home-section-container">
      <header className={styles.heading}><span className={styles.eyebrow} style={gayaSection(beranda, "kegiatan", "eyebrow")}>{teksSection(beranda, "kegiatan", "eyebrow", "Kegiatan")}</span><h2 id="kegiatan-title" style={gayaSection(beranda, "kegiatan", "judul")}>{teksSection(beranda, "kegiatan", "judul", "Hadiri Kegiatan Kami.")}</h2></header>
      {loading ? <p className={styles.state} role="status">Memuat kegiatan…</p> : error ? <div className={styles.state} role="alert"><p>{error}</p><button type="button" className={styles.primary} onClick={retry}>Coba lagi</button></div> : feature ? <div className={styles.layout}>
        <Link className={styles.feature} href={`/kegiatan/${feature.slug}`} aria-label={`Lihat ${feature.judul}`}>
          <FotoKegiatan item={feature} className={styles.heroPhoto} />
          <span className={styles.featureTag}>{new Date(feature.tanggalMulai).getTime() >= now ? "Agenda terdekat" : "Kegiatan terbaru"}</span>
          <div className={styles.featureCopy}><h3>{feature.judul}</h3><MetadataKegiatan item={feature} className={styles.meta} /><span className={styles.featureArrow}><ArrowUpRight weight="bold" aria-hidden="true" /></span></div>
        </Link>
        <KalenderBeranda items={items} />
      </div> : <p className={styles.state}>Belum ada kegiatan yang tersedia.</p>}
      <div className={styles.allFooter}><Link className={styles.primary} href="/event">Lihat semua kegiatan <ArrowRight weight="bold" aria-hidden="true" /></Link></div>
    </div>
  </section>;
}
