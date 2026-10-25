import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarBlank, User } from "@phosphor-icons/react/dist/ssr";
import BackButton from "@/components/BackButton";
import Breadcrumb from "@/components/Breadcrumb";
import RichText from "@/components/RichText";
import ScrollReveal from "@/components/ScrollReveal";
import { ambilBeritaPublik, ambilMediaBeritaPublik } from "@/lib/berita-publik";
import { formatTanggalWIB, formatWaktuWIB } from "@/lib/format";
import styles from "./berita-detail.module.css";

type Params = { params: Promise<{ slug: string }> };

// Halaman ini membaca database — lihat komentar di `src/app/berita/page.tsx`.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const berita = await ambilBeritaPublik(slug);

  if (!berita) return { title: "Berita tidak ditemukan - IKASADA FIB UI" };

  return {
    title: `${berita.judul} - IKASADA FIB UI`,
    description: berita.deskripsiSingkat,
  };
}

/** Halaman detail berita. */
export default async function BeritaDetailPage({ params }: Params) {
  const { slug } = await params;
  const [berita, media] = await Promise.all([
    ambilBeritaPublik(slug),
    ambilMediaBeritaPublik(slug),
  ]);

  if (!berita) notFound();

  const ringkasan = berita.deskripsiSingkat?.trim();
  const isi = berita.deskripsiLengkap?.trim();

  return (
    <>
      <div className="public-page relative z-10 min-h-screen">
        <section className={styles.section}>
          <article className={styles.article}>
            <BackButton fallback="/berita" forceFallback />
            <Breadcrumb
              className={styles.breadcrumb}
              items={[
                { label: "Beranda", href: "/" },
                { label: "Berita", href: "/berita" },
                { label: berita.tipe },
              ]}
            />

            <span className="inline-block rounded-full bg-[#F4C430] px-[11px] py-[5px] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0f1012]">
              {berita.tipe}
            </span>

            <h1 className={styles.title}>{berita.judul}</h1>

            <div className={styles.metadata}>
              <div className={styles.date}>
                <CalendarBlank size={18} aria-hidden="true" />
                <time dateTime={berita.tanggal}>
                  {formatTanggalWIB(berita.tanggal)} · {formatWaktuWIB(berita.tanggal)} WIB
                </time>
              </div>
              <span className={styles.metadataDivider} aria-hidden="true" />
              <span className={styles.author}>
                <User size={17} aria-hidden="true" />
                <span>Penulis: {berita.penulis}</span>
              </span>
            </div>

            {berita.gambarUrl && (
              <div className={styles.cover}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={berita.gambarUrl}
                  alt={berita.judul}
                  className={styles.coverImage}
                />
              </div>
            )}

            {ringkasan && <p className={styles.summary}>{ringkasan}</p>}

            <RichText
              teks={isi}
              className={styles.body}
            />

            {media.length > 0 && (
              <section className="mt-12 border-t border-[#0B5ED7]/15 pt-8">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-black/50">
                  Galeri ({media.length})
                </h2>
                <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {media.map((item) => {
                    const sumber = `/api/berita/${berita.slug}/media/${item.id}`;
                    return (
                      <li key={item.id}>
                        {item.jenis === "VIDEO" ? (
                          <video
                            src={sumber}
                            controls
                            preload="metadata"
                            className="w-full rounded-[12px] border border-[#0B5ED7]/15 bg-black"
                          />
                        ) : (
                          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px] border border-[#0B5ED7]/15 bg-[#f3f4f6]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sumber}
                              alt={item.caption ?? berita.judul}
                              loading="lazy"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                        {item.caption && (
                          <p className="mt-2 text-[13px] leading-relaxed text-black/60">
                            {item.caption}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </article>
        </section>
      </div>
      <ScrollReveal />
    </>
  );
}
