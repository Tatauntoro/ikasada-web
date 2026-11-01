import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatTanggalWIB, formatWaktuWIB } from "@/lib/format";
import Link from "next/link";
import styles from "./KegiatanDetail.module.css";
import BackButton from "@/components/BackButton";
import Breadcrumb from "@/components/Breadcrumb";
import RichText from "@/components/RichText";
import VideoPreviewCard from "@/components/VideoPreviewCard";
import { MorphHeroImage } from "@/components/motion/ImageMorph";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const kegiatan = await prisma.kegiatan.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
  });

  if (!kegiatan) {
    return { title: "Kegiatan Tidak Ditemukan - IKASADA" };
  }

  return {
    title: `${kegiatan.judul} - IKASADA`,
    description: kegiatan.deskripsiSingkat,
  };
}

export default async function KegiatanDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const kegiatan = await prisma.kegiatan.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: {
      kategoriKegiatan: true,
      media: { orderBy: { urutan: "asc" } },
    },
  });

  if (!kegiatan) {
    notFound();
  }

  const namaKategori = kegiatan.kategoriKegiatan.namaKategori;

  const videoId = kegiatan.videoYoutubeId;

  const durasiHari = kegiatan.tanggalSelesai
    ? Math.max(
        1,
        Math.round(
          (new Date(kegiatan.tanggalSelesai).getTime() -
            new Date(kegiatan.tanggalMulai).getTime()) /
            86400000
        ) + 1
      )
    : 1;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    kegiatan.lokasi
  )}`;

  const tanggal =
    formatTanggalWIB(kegiatan.tanggalMulai) +
    (kegiatan.tanggalSelesai
      ? ` – ${formatTanggalWIB(kegiatan.tanggalSelesai)}`
      : "");

  const lainnya = await prisma.kegiatan.findMany({
    where: { status: "PUBLISHED", deletedAt: null, id: { not: kegiatan.id } },
    orderBy: { tanggalMulai: "desc" },
    take: 2,
  });

  return (
    <main className={`public-page ${styles.page}`}>
      <div className={styles.wrap}>
        <div className={styles.navigation}>
          <BackButton fallback="/event" />
          <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Kegiatan", href: "/event" }, { label: namaKategori }]} />
        </div>
        <div className={styles.hero}>
          {kegiatan.gambarThumbnailUrl ? <MorphHeroImage src={kegiatan.gambarThumbnailUrl} alt={kegiatan.judul} className={styles.heroImage} /> : <div className={styles.imageFallback}>IKASADA / KEGIATAN</div>}
        </div>
        <section className={styles.ticket} aria-labelledby="judul-kegiatan">
          <div className={styles.ticketInfo}>
            <span className={styles.tag}>{namaKategori}</span>
            <h1 id="judul-kegiatan">{kegiatan.judul}</h1>
            <dl className={styles.facts}>
              <div><dt>Tanggal kegiatan</dt><dd>{tanggal}</dd></div>
              <div><dt>Waktu mulai</dt><dd>{formatWaktuWIB(kegiatan.tanggalMulai)} WIB</dd></div>
              <div className={styles.location}><dt>Lokasi</dt><dd>{kegiatan.lokasi}</dd></div>
            </dl>
          </div>
          <div className={styles.ticketAction}>
            <h2>{kegiatan.linkPendaftaran ? "Ikuti kegiatannya." : "Informasi kegiatan"}</h2>
            {kegiatan.linkPendaftaran ? <>
              <p>Buka tautan pendaftaran dari penyelenggara untuk mengikuti kegiatan ini.</p>
              <a className={styles.primary} href={kegiatan.linkPendaftaran} target="_blank" rel="noopener noreferrer">Daftar / Ikuti Kegiatan <span aria-hidden="true">↗</span></a>
            </> : <p>Tautan pendaftaran belum dicantumkan untuk kegiatan ini.</p>}
          </div>
        </section>
        <div className={styles.content}>
          <div>
            <section aria-labelledby="tentang-kegiatan">
              <h2 id="tentang-kegiatan">Tentang kegiatan</h2>
              <RichText teks={kegiatan.deskripsiSingkat} className={styles.prose} />
              <RichText teks={kegiatan.deskripsiLengkap} className={styles.prose} />
            </section>
            {videoId && <section className={styles.documentation} aria-labelledby="video-kegiatan">
              <h2 id="video-kegiatan">Lihat video</h2>
              <VideoPreviewCard videoId={videoId} kategori={namaKategori} durasi={`${durasiHari} Hari`} description="Tonton rekaman dokumentasi kegiatan ini." />
            </section>}
            {kegiatan.media.length > 0 && <section className={styles.documentation} aria-labelledby="galeri-kegiatan">
              <h2 id="galeri-kegiatan">Galeri Foto &amp; Video ({kegiatan.media.length})</h2>
              <ul className={styles.gallery}>
                {kegiatan.media.map(media => {
                  const sumber = `/api/kegiatan/${kegiatan.slug}/media/${media.id}`;
                  return <li key={media.id}>
                    {media.jenis === "VIDEO" ? <video src={sumber} controls preload="metadata" className={styles.galleryVideo} /> :
                      <a href={sumber} target="_blank" rel="noopener noreferrer" aria-label={`Buka foto: ${media.caption || kegiatan.judul}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sumber} alt={media.caption ?? kegiatan.judul} loading="lazy" className={styles.galleryImage} />
                      </a>}
                    {media.caption && <p className={styles.caption}>{media.caption}</p>}
                  </li>;
                })}
              </ul>
            </section>}
            {lainnya.length > 0 && <section className={styles.documentation} aria-labelledby="kegiatan-lain">
              <h2 id="kegiatan-lain">Kegiatan lainnya</h2>
              <div className={styles.related}>
                {lainnya.map(item => <Link key={item.id} href={`/kegiatan/${item.slug}`}>
                  {item.gambarThumbnailUrl ?
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.gambarThumbnailUrl} alt="" loading="lazy" /> : <div className={styles.relatedFallback}>IKASADA</div>}
                  <h3>{item.judul}</h3>
                </Link>)}
              </div>
            </section>}
            <Link href="/event" className={styles.backLink}>← Kembali ke semua kegiatan</Link>
          </div>
          <aside className={styles.organizer} aria-label="Penyelenggara kegiatan">
            <div className={styles.organizerHeading}><span className={styles.monogram} aria-hidden="true">IKA</span><div><small>Penyelenggara</small><h2>IKASADA FIB UI</h2></div></div>
            <p>Ikatan Alumni Sastra Daerah<br />Fakultas Ilmu Pengetahuan Budaya<br />Universitas Indonesia</p>
            <dl className={styles.organizerFacts}>
              <div><dt>Kategori kegiatan</dt><dd>{namaKategori}</dd></div>
              <div><dt>Durasi</dt><dd>{durasiHari} Hari</dd></div>
              <div><dt>Lokasi</dt><dd>{kegiatan.lokasi}</dd></div>
            </dl>
            <a className={styles.backLink} href={mapsUrl} target="_blank" rel="noopener noreferrer">Lihat lokasi ↗</a>
          </aside>
        </div>
      </div>
    </main>
  );
}
