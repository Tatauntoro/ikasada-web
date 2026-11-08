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
import { labelStatusKegiatan, statusKegiatan } from "@/lib/status-kegiatan";
import KegiatanDetailGallery from "./KegiatanDetailGallery";

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
  const statusWaktu = statusKegiatan(kegiatan.tanggalMulai, kegiatan.tanggalSelesai);
  const labelStatusWaktu = labelStatusKegiatan(statusWaktu);

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

  const mapsUrl = kegiatan.urlGoogleMaps?.trim() || null;

  const tanggalMulai = formatTanggalWIB(kegiatan.tanggalMulai);
  const tanggalSelesai = kegiatan.tanggalSelesai
    ? formatTanggalWIB(kegiatan.tanggalSelesai)
    : null;
  const tanggal =
    tanggalMulai +
    (tanggalSelesai && tanggalSelesai !== tanggalMulai
      ? ` – ${tanggalSelesai}`
      : "");
  const waktu =
    formatWaktuWIB(kegiatan.tanggalMulai) +
    (kegiatan.tanggalSelesai
      ? ` – ${formatWaktuWIB(kegiatan.tanggalSelesai)}`
      : "");

  const galeri = kegiatan.media.map((media) => ({
    id: media.id,
    jenis: media.jenis,
    src: `/api/kegiatan/${kegiatan.slug}/media/${media.id}`,
    caption: media.caption,
  }));

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
            <div className={styles.tags}>
              <span className={styles.tag}>{namaKategori}</span>
              <span className={`${styles.statusBadge} ${styles[`status_${statusWaktu}`]}`}>{labelStatusWaktu}</span>
            </div>
            <h1 id="judul-kegiatan">{kegiatan.judul}</h1>
            <dl className={styles.facts}>
              <div><dt>Tanggal kegiatan</dt><dd>{tanggal}</dd></div>
              <div><dt>Waktu kegiatan</dt><dd>{waktu} WIB</dd></div>
              <div className={styles.location}><dt>Lokasi</dt><dd><span>{kegiatan.lokasi}</span>{kegiatan.alamatLokasi && <span className={styles.locationAddress}>{kegiatan.alamatLokasi}</span>}{mapsUrl && <a className={styles.locationLink} href={mapsUrl} target="_blank" rel="noopener noreferrer">Lihat lokasi ↗</a>}</dd></div>
              <div><dt>Durasi</dt><dd>{durasiHari} Hari</dd></div>
            </dl>
          </div>
          <div className={styles.ticketAction}>
            <h2>{statusWaktu === "SUDAH_BERLANGSUNG" ? "Kegiatan telah berlangsung." : statusWaktu === "SEDANG_BERLANGSUNG" ? "Kegiatan sedang berlangsung." : kegiatan.linkPendaftaran ? "Ikuti kegiatannya." : "Informasi kegiatan"}</h2>
            {statusWaktu === "SUDAH_BERLANGSUNG" ? (
              <p>Kegiatan ini sudah selesai.</p>
            ) : kegiatan.linkPendaftaran ? <>
              <p>{statusWaktu === "SEDANG_BERLANGSUNG" ? "Kegiatan sedang berlangsung. Buka tautan penyelenggara untuk melihat informasi selengkapnya." : "Buka tautan pendaftaran dari penyelenggara untuk mengikuti kegiatan ini."}</p>
              <a className={styles.primary} href={kegiatan.linkPendaftaran} target="_blank" rel="noopener noreferrer">{statusWaktu === "SEDANG_BERLANGSUNG" ? "Buka tautan kegiatan" : "Daftar / Ikuti Kegiatan"} <span aria-hidden="true">↗</span></a>
            </> : <p>{statusWaktu === "SEDANG_BERLANGSUNG" ? "Kegiatan sedang berlangsung saat ini." : "Tautan pendaftaran belum dicantumkan untuk kegiatan ini."}</p>}
            <p className={styles.organizerCredit}>Penyelenggara<br /><strong>IKASADA FIB UI</strong></p>
          </div>
        </section>
        <div className={styles.content}>
          <section aria-labelledby="tentang-kegiatan">
            <h2 id="tentang-kegiatan">Tentang kegiatan</h2>
            <RichText teks={kegiatan.deskripsiSingkat} className={styles.prose} />
            <RichText teks={kegiatan.deskripsiLengkap} className={styles.prose} />
          </section>
        </div>
        {galeri.length > 0 && (
          <section className={styles.gallerySection} aria-labelledby="galeri-kegiatan">
            <div className={styles.galleryHeading}>
              <div>
                <span>Dokumentasi</span>
                <h2 id="galeri-kegiatan">Foto &amp; video kegiatan</h2>
              </div>
            </div>
            <KegiatanDetailGallery key={kegiatan.id} items={galeri} judul={kegiatan.judul} />
          </section>
        )}
        {videoId && <section className={styles.videoSection} aria-labelledby="video-kegiatan">
          <h2 id="video-kegiatan">Lihat di Kanal YouTube</h2>
          <VideoPreviewCard videoId={videoId} title={kegiatan.judul} />
        </section>}
        <Link href="/event" className={styles.backLink}>← Kembali ke semua kegiatan</Link>
      </div>
    </main>
  );
}
