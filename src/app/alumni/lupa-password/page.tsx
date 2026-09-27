import type { Metadata } from "next";
import LupaPasswordForm from "@/components/alumni/LupaPasswordForm";

export const metadata: Metadata = {
  title: "Lupa Kata Sandi - IKASADA FIB UI",
  description: "Ajukan permintaan reset kata sandi akun alumni IKASADA FIB UI.",
};

export default function AlumniLupaPasswordPage() {
  return <LupaPasswordForm />;
}
