import { Metadata } from "next";
import { BeritaForm } from "@/components/admin/BeritaForm";

export const metadata: Metadata = {
  title: "Tambah Berita - IKASADA",
};

export default function TambahBeritaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Tambah Berita
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Isi detail berita baru di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <BeritaForm mode="create" />
      </div>
    </div>
  );
}
