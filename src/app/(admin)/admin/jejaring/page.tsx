import { Suspense } from "react";
import { redirect } from "next/navigation";
import { JejaringAlumni } from "@/components/admin/JejaringAlumni";
import { FITUR_JEJARING_ALUMNI } from "@/lib/fitur";

export const metadata = {
  title: "Jejaring Alumni - Portal IKASADA",
};

export default function JejaringPage() {
  /*
   * Mode jejaring dimatikan (`@/lib/fitur`): halaman ini disembunyikan dari
   * menu dan dialihkan bila dibuka langsung. Komponennya tetap utuh.
   */
  if (!FITUR_JEJARING_ALUMNI) redirect("/admin");

  return (
    <Suspense fallback={null}>
      <JejaringAlumni />
    </Suspense>
  );
}
