"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarBlank, CaretLeft, CaretRight, Clock, MagnifyingGlass, MapPin, X } from "@phosphor-icons/react";
import type { PublicKegiatan } from "@/lib/types";
import { formatTanggalWIB, formatWaktuWIB } from "@/lib/format";
import { keTeksBiasa } from "@/lib/rich-text";
import { rekamAsalMorphDari } from "./motion/ImageMorph";
import styles from "./EventsSection.module.css";
import { sectionAktif, teksSection, useBerandaConfig, gayaSection, gayaBackgroundSection } from "@/lib/beranda-client";

const LIMIT = 4;
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const keyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
const shortFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short" });
const dateKey = (value: string) => keyFormatter.format(new Date(value));
const categoryLabel = (value: string) => value ? value.toLocaleLowerCase("id-ID").replace(/(^|[\s_-])\S/g, c => c.toLocaleUpperCase("id-ID")).replace(/[_-]/g, " ") : "Kegiatan";

function Thumbnail({ item, className }: { item: PublicKegiatan; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!item.gambarThumbnailUrl || failed) return <span className={`${className} ${styles.imageFallback}`} aria-hidden="true"><CalendarBlank /></span>;
  // Thumbnail public API can contain remote images as well as local uploads.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={item.gambarThumbnailUrl} alt="" width={800} height={600} loading="lazy" onError={() => setFailed(true)} />;
}

function EventMetadata({ item }: { item: PublicKegiatan }) {
  return <div className={styles.meta}>
    <span><CalendarBlank aria-hidden="true" /><time dateTime={item.tanggalMulai}>{shortFormatter.format(new Date(item.tanggalMulai))}</time></span>
    <span><Clock aria-hidden="true" />{formatWaktuWIB(item.tanggalMulai)} WIB</span>
  </div>;
}

function KegiatanAgenda({ items }: { items: PublicKegiatan[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [month, setMonth] = useState(() => dateKey(items[0].tanggalMulai).slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(() => dateKey(items[0].tanggalMulai));
  const [selectedEvent, setSelectedEvent] = useState<PublicKegiatan | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const categories = [...new Set(items.map(item => item.kategori))];
  const search = query.trim().toLocaleLowerCase("id-ID");
  const visible = items.filter(item => (category === null || item.kategori === category) && `${item.judul} ${item.lokasi} ${keTeksBiasa(item.deskripsiSingkat)}`.toLocaleLowerCase("id-ID").includes(search));
  const agenda = visible.filter(item => selectedDay ? dateKey(item.tanggalMulai) === selectedDay : dateKey(item.tanggalMulai).startsWith(month));
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthLabel = monthFormatter.format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const upcoming = visible.filter(item => dateKey(item.tanggalMulai) >= dateKey(new Date().toISOString()));

  useEffect(() => {
    const days = daysRef.current;
    const targetKey = selectedDay || items.map(item => dateKey(item.tanggalMulai)).find(key => key.startsWith(month));
    const target = days?.querySelector<HTMLElement>(`[data-day="${targetKey}"]`);
    if (days) days.scrollLeft = target ? target.offsetLeft - days.clientWidth / 2 + target.offsetWidth / 2 : 0;
  }, [month, selectedDay, items]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!selectedEvent || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedEvent]);

  function resetCarousel() {
    setIndex(0);
    railRef.current?.scrollTo({ left: 0, behavior: "instant" });
  }

  function move(direction: number) {
    const rail = railRef.current;
    const cards = rail?.querySelectorAll<HTMLElement>("[data-event-card]");
    const next = Math.max(0, Math.min(visible.length - 1, index + direction));
    if (!rail || !cards?.[next]) return;
    setIndex(next);
    rail.scrollTo({ left: cards[next].offsetLeft - cards[0].offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function syncCarousel() {
    const rail = railRef.current;
    const cards = rail?.querySelectorAll<HTMLElement>("[data-event-card]");
    if (!rail || !cards?.length) return;
    let closest = 0;
    cards.forEach((card, i) => {
      if (Math.abs(card.offsetLeft - cards[0].offsetLeft - rail.scrollLeft) < Math.abs(cards[closest].offsetLeft - cards[0].offsetLeft - rail.scrollLeft)) closest = i;
    });
    setIndex(closest);
  }

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    setMonth(next.toISOString().slice(0, 7));
    setSelectedDay(null);
  }

  function openDetail(item: PublicKegiatan, event: SyntheticEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setSelectedEvent(item);
  }

  return <>
    <div className={styles.workspace}>
      <div className={styles.discover}>
        <label className={styles.search}><MagnifyingGlass aria-hidden="true" /><input type="search" aria-label="Cari kegiatan" placeholder="Cari kegiatan, topik, atau lokasi…" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); resetCarousel(); }} /></label>
        <nav className={styles.categories} aria-label="Filter kategori kegiatan">
          <button type="button" className={styles.pill} aria-pressed={category === null} onClick={() => { setCategory(null); resetCarousel(); }}>Semua kategori</button>
          {categories.map(value => <button type="button" className={styles.pill} key={value} aria-pressed={category === value} onClick={() => { setCategory(value); resetCarousel(); }}>{categoryLabel(value)}</button>)}
        </nav>
        <div key={JSON.stringify([category, query])} className={styles.rail} ref={railRef} onScroll={syncCarousel} aria-label="Pilihan kegiatan">
          {visible.map(item => <button type="button" key={item.id} className={styles.feature} data-event-card aria-label={`Lihat detail ${item.judul}`} onClick={event => openDetail(item, event)}>
            <Thumbnail item={item} className={styles.featureImage} />
            <span className={styles.tag}>{categoryLabel(item.kategori)}</span>
            <div className={styles.featureCopy}><h3>{item.judul}</h3><EventMetadata item={item} /><span className={styles.featureArrow}><ArrowUpRight aria-hidden="true" /></span></div>
          </button>)}
          {visible.length === 0 && <p className={styles.empty}>Tidak ada kegiatan yang cocok.<br />Coba kata lain atau pilih Semua kategori.</p>}
        </div>
        <div className={styles.carouselFooter}>
          <span className={styles.count} role="status">{visible.length ? `${String(index + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")} kegiatan` : "0 kegiatan"}</span>
          <div className={styles.controls}><button type="button" className={styles.iconButton} aria-label="Kegiatan sebelumnya" disabled={index === 0} onClick={() => move(-1)}><ArrowLeft aria-hidden="true" /></button><button type="button" className={styles.iconButton} aria-label="Kegiatan berikutnya" disabled={index >= visible.length - 1} onClick={() => move(1)}><ArrowRight aria-hidden="true" /></button></div>
        </div>
        <div className={styles.subheading}><h3>Ruang untuk bertemu.</h3><span>Agenda mendatang</span></div>
        <div className={styles.compactList}>
          {upcoming.slice(0, 3).map(item => <button type="button" key={item.id} className={styles.compact} onClick={event => openDetail(item, event)}>
            <Thumbnail item={item} className={styles.compactImage} /><span className={styles.compactCopy}><strong>{item.judul}</strong><span>{shortFormatter.format(new Date(item.tanggalMulai))} · {categoryLabel(item.kategori)}</span></span><ArrowUpRight aria-hidden="true" />
          </button>)}
          {upcoming.length === 0 && <p className={styles.empty}>Belum ada agenda mendatang yang cocok.</p>}
        </div>
      </div>
      <aside className={styles.agenda} aria-label="Kalender kegiatan">
        <div className={styles.agendaTop}>
          <div className={styles.agendaTitle}><h3>Kalender kegiatan</h3><span className={styles.calendarIcon}><CalendarBlank aria-hidden="true" /></span></div>
          <div className={styles.monthNav}><button type="button" className={styles.iconButton} aria-label="Bulan sebelumnya" onClick={() => shiftMonth(-1)}><CaretLeft aria-hidden="true" /></button><strong aria-live="polite">{monthLabel}</strong><button type="button" className={styles.iconButton} aria-label="Bulan berikutnya" onClick={() => shiftMonth(1)}><CaretRight aria-hidden="true" /></button></div>
          <div className={styles.days} ref={daysRef} aria-label="Pilih tanggal kegiatan">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const key = `${month}-${String(i + 1).padStart(2, "0")}`;
              const hasEvent = visible.some(item => dateKey(item.tanggalMulai) === key);
              const weekday = weekdayFormatter.format(new Date(Date.UTC(year, monthNumber - 1, i + 1)));
              return <button type="button" key={key} className={`${styles.day} ${hasEvent ? styles.hasEvent : ""}`} data-day={key} aria-pressed={selectedDay === key} aria-label={`${i + 1} ${monthLabel}${hasEvent ? ", ada kegiatan" : ""}`} onClick={() => setSelectedDay(key)}><b>{i + 1}</b><span>{weekday}</span></button>;
            })}
          </div>
          <div className={styles.agendaCaption}><span role="status">{agenda.length} kegiatan · {selectedDay ? "tanggal dipilih" : "bulan ini"}</span><button type="button" className={styles.textButton} disabled={!selectedDay} onClick={() => setSelectedDay(null)}>Semua tanggal</button></div>
        </div>
        <div className={styles.agendaBody}>
          {agenda.map(item => <button type="button" key={item.id} className={styles.agendaCard} onClick={event => openDetail(item, event)}>
            <span className={styles.tag}>{categoryLabel(item.kategori)}</span><h4>{item.judul}</h4><EventMetadata item={item} /><p className={styles.place}><MapPin aria-hidden="true" />{item.lokasi}</p><span className={styles.detailLabel}>Lihat kegiatan <ArrowUpRight aria-hidden="true" /></span>
          </button>)}
          {agenda.length === 0 && <p className={styles.empty}>Belum ada kegiatan yang cocok.<br />Pilih bulan lain, Semua tanggal, atau ubah filter.</p>}
        </div>
        <p className={styles.agendaBottom}>Pilih tanggal bertitik biru untuk melihat kegiatan.<br />Seluruh waktu ditampilkan dalam WIB.</p>
      </aside>
    </div>
    <div className={styles.agendaFooter}>
      <Link href="/event" className={styles.allLink}>Lihat semua kegiatan <ArrowUpRight aria-hidden="true" /></Link>
    </div>
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="kegiatan-detail-title" onClose={() => { setSelectedEvent(null); triggerRef.current?.focus({ preventScroll: true }); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
    }}>
      {selectedEvent && <article>
        <div className={styles.modalHead}><span>DETAIL KEGIATAN</span><button type="button" className={styles.iconButton} aria-label="Tutup detail kegiatan" onClick={() => dialogRef.current?.close()}><X aria-hidden="true" /></button></div>
        <Thumbnail key={selectedEvent.id} item={selectedEvent} className={styles.modalImage} />
        <div className={styles.modalContent}><span className={styles.tag}>{categoryLabel(selectedEvent.kategori)}</span><h3 id="kegiatan-detail-title">{selectedEvent.judul}</h3><EventMetadata item={selectedEvent} />{selectedEvent.tanggalSelesai && <p className={styles.endDate}>Sampai {formatTanggalWIB(selectedEvent.tanggalSelesai)} · {formatWaktuWIB(selectedEvent.tanggalSelesai)} WIB</p>}<p className={styles.place}><MapPin aria-hidden="true" />{selectedEvent.lokasi}</p><p className={styles.description}>{keTeksBiasa(selectedEvent.deskripsiSingkat)}</p>
          <Link href={`/kegiatan/${selectedEvent.slug}`} className={styles.detailLink} onClick={event => { rekamAsalMorphDari(event.currentTarget); dialogRef.current?.close(); }}>Kegiatan selengkapnya <ArrowUpRight aria-hidden="true" /></Link>
        </div>
      </article>}
    </dialog>
  </>;
}

export default function EventsSection() {
  const beranda = useBerandaConfig();
  const [data, setData] = useState<PublicKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/kegiatan?limit=${LIMIT}`, { signal });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error?.message || "Gagal memuat kegiatan");
        return;
      }
      const now = Date.now();
      setData((result.data as PublicKegiatan[]).sort((a, b) => {
        const first = new Date(a.tanggalMulai).getTime(), second = new Date(b.tanggalMulai).getTime();
        if (first >= now && second >= now) return first - second;
        if (first < now && second < now) return second - first;
        return first >= now ? -1 : 1;
      }));
    } catch {
      if (!signal?.aborted) setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  if (!sectionAktif(beranda, "kegiatan")) return null;
  return <section id="kegiatan" className={`home-jakarta-section ${plusJakartaSans.className} ${styles.section}`} style={gayaBackgroundSection(beranda, "kegiatan")} aria-labelledby="kegiatan-title">
    <div className="home-section-container">
      <header className={styles.heading}>
        <span className={styles.eyebrow} style={gayaSection(beranda, "kegiatan", "eyebrow")}>{teksSection(beranda, "kegiatan", "eyebrow", "Kegiatan")}</span>
        <div className={styles.headingRow}><h2 id="kegiatan-title" className={styles.headingTitle} style={gayaSection(beranda, "kegiatan", "judul")}>{teksSection(beranda, "kegiatan", "judul", "Hadiri Kegiatan Kami.")}</h2></div>
      </header>
      {isLoading && <div className={styles.loading} aria-label="Memuat kegiatan" role="status"><div /><div /><span>Memuat kegiatan…</span></div>}
      {!isLoading && error && <div className={styles.message} role="alert"><p>{error}</p><button type="button" onClick={() => void fetchData()} className={styles.detailLink}>Coba Lagi <ArrowRight aria-hidden="true" /></button></div>}
      {!isLoading && !error && data.length === 0 && <p className={styles.message}>Belum ada kegiatan yang tersedia.</p>}
      {!isLoading && !error && data.length > 0 && <KegiatanAgenda items={data} />}
    </div>
  </section>;
}
