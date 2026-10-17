import type { Metadata } from "next";
import LupaPasswordForm from "@/components/alumni/LupaPasswordForm";
import { gerbangHalamanAlumni } from "@/lib/akses-alumni";

export const metadata: Metadata = {
  title: "Lupa Kata Sandi - IKASADA FIB UI",
  description: "Ajukan permintaan reset kata sandi akun alumni IKASADA FIB UI.",
};

export default function AlumniLupaPasswordPage() {
  gerbangHalamanAlumni();

  return <LupaPasswordForm />;
}
