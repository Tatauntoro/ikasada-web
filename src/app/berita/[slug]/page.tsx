import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import Breadcrumb from "@/components/Breadcrumb";
import RichText from "@/components/RichText";
import ScrollReveal from "@/components/ScrollReveal";
import { ambilBeritaPublik, ambilMediaBeritaPublik } from "@/lib/berita-publik";
import { formatTanggalWIB, formatWaktuWIB } from "@/lib/format";

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

  const isi = berita.deskripsiLengkap?.trim() || berita.deskripsiSingkat;

  return (
    <>
      <div className="public-page relative z-10 min-h-screen">
        <section className="relative min-h-screen overflow-hidden bg-white py-24">
          <div className="relative z-10 mx-auto w-full max-w-3xl px-6">
            <BackButton fallback="/berita" forceFallback />
            <Breadcrumb
              className="mb-10"
              items={[
                { label: "Beranda", href: "/" },
                { label: "Berita", href: "/berita" },
                { label: berita.tipe },
              ]}
            />

            <span className="inline-block rounded-full bg-[#0f1012] px-[11px] py-[5px] text-[10px] uppercase tracking-[0.12em] text-[#fdfdfd]">
              {berita.tipe}
            </span>

            <h1 className="page-title mt-6 text-pretty">{berita.judul}</h1>

            <p className="mt-4 text-[13px] text-black/55">
              {formatTanggalWIB(berita.tanggal)} · {formatWaktuWIB(berita.tanggal)} WIB
            </p>

            {berita.gambarUrl && (
              <div className="mt-10 overflow-hidden rounded-[16px] bg-[#e7e7ec]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={berita.gambarUrl}
                  alt={berita.judul}
                  className="h-auto w-full object-cover"
                />
              </div>
            )}

            <RichText
              teks={isi}
              className="mt-10 space-y-5 text-[15px] leading-relaxed text-black/68 sm:text-base"
            />

            {media.length > 0 && (
              <section className="mt-12 border-t border-black/10 pt-8">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-black/50">
                  Galeri ({media.length})
                </h2>
                <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {media.map((item) => {
                    const sumber = `/api/berita/${berita.slug}/media/${item.id}`;
                    return (
                      <li key={item.id}>
                        {item.jenis === "VIDEO" ? (
                          <video
                            src={sumber}
                            controls
                            preload="metadata"
                            className="w-full rounded-[12px] border border-black/10 bg-black"
                          />
                        ) : (
                          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px] border border-black/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sumber}
                              alt={item.caption ?? berita.judul}
                              loading="lazy"
                              className="h-full w-full object-cover"
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
          </div>
        </section>
      </div>
      <ScrollReveal />
    </>
  );
}
