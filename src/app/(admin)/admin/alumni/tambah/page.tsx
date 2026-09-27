import { Metadata } from "next";
import { AlumniForm } from "@/components/admin/AlumniForm";

export const metadata: Metadata = {
  title: "Tambah Alumni - IKASADA",
};

export default function TambahAlumniPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Tambah Alumni
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Isi data alumni baru di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <AlumniForm mode="create" />
      </div>
    </div>
  );
}
