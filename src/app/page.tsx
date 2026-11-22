import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import { LoaderProvider } from "@/components/LoaderProvider";
import HeroAksara from "@/components/hero/HeroAksara";
import BerandaIsi from "@/components/beranda/BerandaIsi";
import ScrollReveal from "@/components/ScrollReveal";
import ScrollExperience from "@/components/motion/ScrollExperience";

export default function Home() {
  return (
    <LoaderProvider>
      <Preloader />
      <Navbar />
      <ScrollExperience />
      <main className="public-page home-page relative z-10">
        <HeroAksara />
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
