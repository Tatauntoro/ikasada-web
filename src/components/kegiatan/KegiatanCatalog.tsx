"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { useKegiatanPublik, tanggalKegiatan, labelKategori, agendaTerpilih } from "@/lib/kegiatan-client";
import { keTeksBiasa } from "@/lib/rich-text";
import BackButton from "../BackButton";
import Breadcrumb from "../Breadcrumb";
import Pagination from "../Pagination";
import { FotoKegiatan, MetadataKegiatan } from "./KegiatanMedia";
import styles from "./KegiatanCatalog.module.css";

function HitungMundur({ start }: { start: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((new Date(start).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.floor((new Date(start).getTime() - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [start]);
  const units = [Math.floor(remaining / 86400), Math.floor(remaining % 86400 / 3600), Math.floor(remaining % 3600 / 60), remaining % 60];
  return <div className={styles.countdown}><span>{remaining ? "Kegiatan dimulai dalam" : "Jadwal kegiatan telah dimulai"}</span><div className={styles.timer} aria-label="Waktu menuju kegiatan">{units.map((value, index) => <div key={index}><b>{String(value).padStart(2, "0")}</b><small>{["Hari", "Jam", "Menit", "Detik"][index]}</small></div>)}</div></div>;
}

export default function KegiatanCatalog() {
  const { items, loading, error, retry } = useKegiatanPublik();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const [today] = useState(() => tanggalKegiatan(new Date()));
  const categories = [...new Set(items.map(item => item.kategori))];
  const [now] = useState(() => Date.now());
  const feature = agendaTerpilih(items, now);
  const search = query.trim().toLocaleLowerCase("id-ID");
  const results = items.filter(item => (category === "all" || category === item.kategori) && (!search || `${item.judul} ${keTeksBiasa(item.deskripsiSingkat)}`.toLocaleLowerCase("id-ID").includes(search)) && (period === "all" || (period === "upcoming" && tanggalKegiatan(item.tanggalMulai) >= today) || (period === "past" && tanggalKegiatan(item.tanggalMulai) < today) || (period === "month" && tanggalKegiatan(item.tanggalMulai).startsWith(today.slice(0, 7))))).sort((a, b) => sort === "latest" ? new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime() : new Date(a.tanggalMulai).getTime() - new Date(b.tanggalMulai).getTime());
  const start = (page - 1) * 6;
  function reset() { setQuery(""); setCategory("all"); setPeriod("all"); setPage(1); }
  function changeCategory(value: string) { setCategory(value); setPage(1); }
  return <main className={`public-page ${styles.root}`}>
    <div className={styles.wrap}>
      <div className={styles.backTop}><BackButton fallback="/#kegiatan" forceFallback /></div>
      <div className={styles.breadcrumb}><Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Kegiatan" }]} /></div>
      <header className={styles.intro}><h1>Hadiri Kegiatan Kami</h1><p>Jelajahi seluruh kegiatan IKASADA. Temukan ruang bertemu, berbagi, dan merawat kebudayaan bersama.</p>
        <form className={styles.searchBar} onSubmit={event => event.preventDefault()}>
          <MagnifyingGlass weight="bold" aria-hidden="true" /><input type="search" aria-label="Cari kegiatan" placeholder="Cari kegiatan atau topik…" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />
          <button className={styles.primary} type="submit">Cari</button>
        </form>
      </header>
      {loading ? <p className={styles.state} role="status">Memuat kegiatan…</p> : error ? <div className={styles.state} role="alert"><p>{error}</p><button type="button" className={styles.primary} onClick={retry}>Coba lagi</button></div> : !items.length ? <p className={styles.state}>Belum ada kegiatan yang tersedia.</p> : <>
        {feature && <section className={styles.featured} aria-label="Kegiatan unggulan"><FotoKegiatan item={feature} className={styles.heroPhoto} /><div className={styles.featuredCopy}><h2>{feature.judul}</h2><p>{keTeksBiasa(feature.deskripsiSingkat)}</p><MetadataKegiatan item={feature} className={styles.meta} /><Link className={styles.primary} href={`/kegiatan/${feature.slug}`}>Lihat kegiatan <ArrowRight weight="bold" aria-hidden="true" /></Link></div><HitungMundur key={feature.id} start={feature.tanggalMulai} /></section>}
        <div className={styles.catalog}>
          <button type="button" className={styles.mobileFilter} aria-expanded={filtersOpen} aria-controls="event-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Filter kegiatan <span>⌄</span></button>
          <aside className={`${styles.filters} ${filtersOpen ? styles.open : ""}`} id="event-filters" aria-label="Filter kegiatan"><div className={styles.filterHeading}><h2>Filter kegiatan</h2><button type="button" className={styles.textButton} onClick={reset}>Reset</button></div>
            <fieldset className={styles.filterGroup}><legend>Kategori</legend>{["all", ...categories].map(value => <label key={value}><input type="radio" name="category" value={value} checked={value === category} onChange={() => changeCategory(value)} />{value === "all" ? "Semua kategori" : labelKategori(value)}</label>)}</fieldset>
            <fieldset className={styles.filterGroup}><legend>Waktu kegiatan</legend>{[["all", "Semua waktu"], ["upcoming", "Akan datang"], ["month", "Bulan ini"], ["past", "Sudah berlangsung"]].map(([value, text]) => <label key={value}><input type="radio" name="period" value={value} checked={value === period} onChange={() => { setPeriod(value); setPage(1); }} />{text}</label>)}</fieldset>
            <p className={styles.filterNote}>Tanggal dan waktu mengikuti WIB. Pilih kartu untuk membuka detail kegiatan.</p>
          </aside>
          <section ref={resultsRef} className={styles.results} aria-labelledby="hasil-kegiatan"><div className={styles.resultHead}><h2 id="hasil-kegiatan">Semua kegiatan <span role="status">({results.length ? `${start + 1}–${Math.min(start + 6, results.length)} dari ${results.length}` : "0 ditemukan"})</span></h2><select aria-label="Urutan kegiatan" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="latest">Tanggal terbaru</option><option value="nearest">Tanggal terdekat</option></select></div>
            <div className={styles.cards}>{results.slice(start, start + 6).map(item => <Link className={styles.card} key={item.id} href={`/kegiatan/${item.slug}`} aria-label={`Lihat ${item.judul}`}><div className={styles.cardImage}><FotoKegiatan item={item} /><span className={styles.tag}>{labelKategori(item.kategori)}</span></div><div className={styles.cardCopy}><h3>{item.judul}</h3><MetadataKegiatan item={item} className={styles.meta} /><p className={styles.description}>{keTeksBiasa(item.deskripsiSingkat)}</p><div className={styles.cardBottom}><span className={tanggalKegiatan(item.tanggalMulai) >= today ? styles.upcoming : undefined}>{tanggalKegiatan(item.tanggalMulai) >= today ? "Akan datang" : "Sudah berlangsung"}</span></div><span className={styles.cardLink}>Lihat kegiatan <ArrowRight weight="bold" aria-hidden="true" /></span></div></Link>)}{results.length === 0 && <p className={styles.empty}><strong>Belum ada kegiatan yang cocok.</strong><br />Ubah kata pencarian atau reset filter.</p>}</div>
            <Pagination page={page} totalPages={Math.max(1, Math.ceil(results.length / 6))} tone="gold" className={styles.pagination} onPageChange={value => { setPage(value); resultsRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }} />
          </section>
        </div>
      </>}
    </div>
  </main>;
}
