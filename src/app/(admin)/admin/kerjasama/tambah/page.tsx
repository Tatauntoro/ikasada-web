import { Metadata } from "next";
import { KerjasamaForm } from "@/components/admin/KerjasamaForm";

export const metadata: Metadata = {
  title: "Tambah Kerjasama - IKASADA",
};

export default function TambahKerjasamaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Tambah Kerjasama
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Isi detail organisasi mitra baru di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <KerjasamaForm mode="create" />
      </div>
    </div>
  );
}
