import AllEventsGrid from "@/components/AllEventsGrid";
import BackButton from "@/components/BackButton";
import Breadcrumb from "@/components/Breadcrumb";
import ScrollReveal from "@/components/ScrollReveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agenda & Kegiatan - IKASADA FIB UI",
  description: "Seluruh agenda kebudayaan dan program kerja IKASADA FIB UI.",
};

export default function EventPage() {
  return (
    <>
      <div className="public-page relative z-10 min-h-screen">
        <section className="relative min-h-screen overflow-hidden bg-white py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
            <BackButton fallback="/#kegiatan" forceFallback />
            <Breadcrumb
              className="mb-10"
              items={[
                { label: "Beranda", href: "/" },
                { label: "Kegiatan" },
              ]}
            />

            <div
              className="mb-12"
              style={{ animation: "fadeSlideIn 0.8s ease-out 0.1s both" }}
            >
              <h1 className="page-title page-title--single">
                Hadiri Kegiatan <span className="text-black/25">Kami.</span>
              </h1>
              <p
                className="mt-5 max-w-2xl text-[15px] leading-relaxed text-black/68 text-pretty sm:text-base"
                style={{ animation: "fadeSlideIn 0.8s ease-out 0.2s both" }}
              >
                Ikuti berbagai agenda kebudayaan, diskusi ilmiah, dan ajang
                kumpul alumni mendatang.
              </p>
            </div>

            <AllEventsGrid perPage={4} />
          </div>
        </section>
      </div>
      <ScrollReveal />
    </>
  );
}
