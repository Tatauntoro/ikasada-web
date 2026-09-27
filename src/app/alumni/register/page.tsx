import type { Metadata } from "next";
import { Suspense } from "react";
import AlumniAuthPage from "@/components/alumni/AlumniAuthPage";

export const metadata: Metadata = {
  title: "Daftar Alumni - IKASADA FIB UI",
  description: "Daftar untuk bergabung dengan jejaring alumni IKASADA FIB UI.",
};

export default function AlumniRegisterPage() {
  return (
    <Suspense fallback={null}>
      <AlumniAuthPage mode="register" />
    </Suspense>
  );
}
