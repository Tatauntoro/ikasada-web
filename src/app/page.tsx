import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import { LoaderProvider } from "@/components/LoaderProvider";
import GlyphHero from "@/components/hero/GlyphHero";
import OverviewSection from "@/components/OverviewSection";
import WaysSection from "@/components/WaysSection";
import Stats from "@/components/Stats";
import BeritaSection from "@/components/BeritaSection";
import StaffSection from "@/components/StaffSection";
import JournalSection from "@/components/JournalSection";
import AlumniDirectory from "@/components/AlumniDirectory";
import EventsSection from "@/components/EventsSection";
import ArsipSection from "@/components/ArsipSection";
import ContactSection from "@/components/ContactSection";
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
        <OverviewSection />
        <WaysSection />
        <Stats />
        <BeritaSection />
        <AlumniDirectory limit={6} sort="createdAt:desc" />
        <JournalSection />
        <EventsSection />
        <ArsipSection />
        <StaffSection />
        <ContactSection />
      </main>

      <ScrollReveal />
    </LoaderProvider>
  );
}
