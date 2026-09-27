import { LoaderProvider } from "@/components/LoaderProvider";
import Preloader from "@/components/Preloader";
import GlyphHero from "@/components/hero/GlyphHero";

export const metadata = {
  title: "Pratinjau glyph — IKASADA",
};

/**
 * Halaman pratinjau hero Glyph Portal.
 *
 * Sengaja dipisah dari beranda: portal ini menggerakkan kameranya lewat scroll
 * beberapa tinggi layar, jadi memasangnya di beranda berarti menimpa alur hero
 * yang sudah ada. Di sini ia bisa dinilai hidup apa adanya tanpa mengubah
 * beranda. `LoaderProvider` + `Preloader` ikut dipasang supaya handoff-nya sama
 * dengan rute asli — dan supaya PP Neue Montreal pasti sudah termuat sebelum
 * GlyphPortal mengukur tinta hurufnya.
 */
export default function GlyphPreviewPage() {
  return (
    <LoaderProvider>
      <Preloader latar="#ffffff" tintaTerang="#0f1012" />
      <main className="public-page relative z-10">
        <GlyphHero />

        {/* Section pendek supaya sambungan setelah portal terlihat jelas. */}
        <section className="mx-auto w-full max-w-[1180px] px-6 py-24">
          <p className="section-label">Setelah portal</p>
          <h2 className="section-title mt-4">
            Jejaring alumni yang tumbuh dari satu akar, bergerak lebih jauh
            bersama.
          </h2>
        </section>
      </main>
    </LoaderProvider>
  );
}
