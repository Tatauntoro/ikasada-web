import type { Metadata } from "next";
import KegiatanCatalog from "@/components/kegiatan/KegiatanCatalog";

export const metadata: Metadata = {
  title: "Agenda & Kegiatan - IKASADA FIB UI",
  description: "Seluruh agenda kebudayaan dan program kerja IKASADA FIB UI.",
};

export default function EventPage() {
  return <KegiatanCatalog />;
}
