import { Suspense } from "react";
import { JejaringAlumni } from "@/components/admin/JejaringAlumni";

export const metadata = {
  title: "Jejaring Alumni - Portal IKASADA",
};

export default function JejaringPage() {
  return (
    <Suspense fallback={null}>
      <JejaringAlumni />
    </Suspense>
  );
}
