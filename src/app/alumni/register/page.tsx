import type { Metadata } from "next";
import { Suspense } from "react";
import AlumniAuthPage from "@/components/alumni/AlumniAuthPage";
import { gerbangHalamanAlumni } from "@/lib/akses-alumni";

export const metadata: Metadata = {
  title: "Daftar Alumni - IKASADA FIB UI",
  description: "Daftar untuk bergabung dengan jejaring alumni IKASADA FIB UI.",
};

export default function AlumniRegisterPage() {
  gerbangHalamanAlumni();

  return (
    <Suspense fallback={null}>
      <AlumniAuthPage mode="register" />
    </Suspense>
  );
}
