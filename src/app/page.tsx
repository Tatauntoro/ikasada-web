import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import { LoaderProvider } from "@/components/LoaderProvider";
import GlyphHero from "@/components/hero/GlyphHero";
import BerandaIsi from "@/components/beranda/BerandaIsi";
import ScrollReveal from "@/components/ScrollReveal";
import ScrollExperience from "@/components/motion/ScrollExperience";

export default function Home() {
  return (
    <LoaderProvider>
      {/* Preloader dan hero memakai putih yang sama agar handoff tanpa flash. */}
      <Preloader latar="#ffffff" tintaTerang="#0f1012" />
      <Navbar />
      <ScrollExperience />
      <main className="public-page relative z-10">
        <GlyphHero />
        {/*
          Section-section di bawah dirender lewat `BerandaIsi` supaya urutannya
          bisa diatur dari Kelola Beranda (Portal Admin).
        */}
        <BerandaIsi />
      </main>

      <ScrollReveal />
    </LoaderProvider>
  );
}
