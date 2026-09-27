import type { Metadata } from "next";
import { Suspense } from "react";
import AlumniAuthPage from "@/components/alumni/AlumniAuthPage";

export const metadata: Metadata = {
  title: "Masuk Alumni - IKASADA FIB UI",
  description: "Masuk ke ruang jejaring alumni IKASADA FIB UI.",
};

export default function AlumniLoginPage() {
  return (
    <Suspense fallback={null}>
      <AlumniAuthPage mode="login" />
    </Suspense>
  );
}
