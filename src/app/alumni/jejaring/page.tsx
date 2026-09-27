import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import RuangAlumni from "@/components/alumni/RuangAlumni";
import AlumniNetworkPage, {
  type TabJejaring,
} from "@/components/alumni/AlumniNetworkPage";
import { akunAlumniAktifHalaman } from "@/lib/halaman-alumni";

export const metadata: Metadata = {
  title: "Jejaring Alumni - IKASADA FIB UI",
  description:
    "Permintaan koneksi antar alumni IKASADA FIB UI beserta daftar koneksi yang sudah diterima.",
};

export const dynamic = "force-dynamic";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const TAB: TabJejaring[] = ["incoming", "outgoing", "accepted"];

/**
 * Halaman Jejaring (Task 14).
 *
 * Hanya untuk akun `ACTIVE` — endpoint koneksi menolak session lain, jadi
 * halaman ini tidak boleh tampil lebih dulu lalu gagal. Tab aktif dibaca dari
 * query string supaya tautan dari kartu direktori bisa langsung membuka daftar
 * yang tepat.
 */
export default async function JejaringPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TAB.find((nilai) => nilai === params.tab) ?? "incoming";

  await akunAlumniAktifHalaman("/alumni/jejaring");

  return (
    <RuangAlumni
      aktif
      navAktif="jejaring"
      fontClassName={`${plusJakartaSans.className} alumni-jejaring-page`}
    >
      <AlumniNetworkPage tabAwal={tab} />
    </RuangAlumni>
  );
}
