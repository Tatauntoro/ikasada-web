import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import RuangAlumni from "@/components/alumni/RuangAlumni";
import AlumniProfileSettings from "@/components/alumni/AlumniProfileSettings";
import { akunAlumniAktifHalaman } from "@/lib/halaman-alumni";

export const metadata: Metadata = {
  title: "Profil Alumni - IKASADA FIB UI",
  description:
    "Profil dan pengaturan privasi jejaring alumni IKASADA FIB UI.",
};

export const dynamic = "force-dynamic";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Halaman profil dan preferensi (Task 15).
 *
 * Hanya untuk akun `ACTIVE` — endpoint profil menolak session lain. Tidak ada
 * parameter id di URL: pemiliknya selalu diambil dari session, jadi tidak ada
 * jalur untuk membuka atau mengubah preferensi akun lain.
 */
export default async function ProfilAlumniPage() {
  await akunAlumniAktifHalaman("/alumni/profil");

  return (
    <RuangAlumni
      aktif
      navAktif="profil"
      fontClassName={`${plusJakartaSans.className} alumni-profile-page`}
    >
      <AlumniProfileSettings />
    </RuangAlumni>
  );
}
