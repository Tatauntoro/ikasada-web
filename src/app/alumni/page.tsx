import AlumniDirectory from "@/components/AlumniDirectory";
import BackButton from "@/components/BackButton";
import Breadcrumb from "@/components/Breadcrumb";
import ScrollReveal from "@/components/ScrollReveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Direktori Alumni - IKASADA FIB UI",
  description: "Direktori lengkap alumni Sastra Daerah FIB UI.",
};

export default function AlumniPage() {
  return (
    <>
      <div className="public-page relative z-10 min-h-screen">
        <AlumniDirectory
          perPage={9}
          header={
            <>
              <BackButton fallback="/" />
              <Breadcrumb
                items={[
                  { label: "Beranda", href: "/" },
                  { label: "Direktori Alumni" },
                ]}
              />
            </>
          }
        />
      </div>
      <ScrollReveal />
    </>
  );
}
