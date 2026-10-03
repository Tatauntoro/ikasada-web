import type { Metadata } from "next";
import BackButton from "@/components/BackButton";
import Breadcrumb from "@/components/Breadcrumb";
import ScrollReveal from "@/components/ScrollReveal";
import BeritaDirectory from "@/components/BeritaDirectory";
import { PER_PAGE_BERITA, daftarBeritaPublik } from "@/lib/berita-publik";

export const metadata: Metadata = {
  title: "Berita - IKASADA FIB UI",
  description:
    "Berita terkini seputar prestasi, kegiatan, dan pengumuman IKASADA FIB UI.",
};

/*
 * Halaman ini membaca database, jadi harus dirender per permintaan. Tanpa ini
 * Next mem-prerender-nya saat build dan daftar beritanya membeku sampai deploy
 * berikutnya. Pola yang sama dipakai halaman arsip.
 */
export const dynamic = "force-dynamic";

/**
 * Halaman daftar berita.
 *
 * Halaman pertama diambil di server dan diteruskan ke `BeritaDirectory`
 * sebagai data awal, supaya HTML pertama sudah berisi berita. Pergantian
 * halaman berikutnya berjalan lewat `/api/public/berita`.
 */
export default async function BeritaPage() {
  const { items, total } = await daftarBeritaPublik({
    page: 1,
    limit: PER_PAGE_BERITA,
  });

  return (
    <>
      <div className="public-page relative z-10 min-h-screen">
        <section className="relative min-h-screen overflow-hidden bg-white py-24">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
            <BackButton fallback="/#berita" forceFallback />
            <Breadcrumb
              className="mb-10"
              items={[{ label: "Beranda", href: "/" }, { label: "Berita" }]}
            />

            <div className="mb-12">
              <h1 className="page-title page-title--single">
                Berita <span className="text-black/25">Terkini.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-black/68 text-pretty sm:text-base">
                Kabar terbaru seputar prestasi, kegiatan, dan pengumuman IKASADA
                FIB UI.
              </p>
            </div>

            <BeritaDirectory awal={items} totalAwal={total} />
          </div>
        </section>
      </div>
      <ScrollReveal />
    </>
  );
}
