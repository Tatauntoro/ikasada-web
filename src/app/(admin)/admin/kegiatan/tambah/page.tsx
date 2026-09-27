import { Metadata } from "next";
import { KegiatanForm } from "@/components/admin/KegiatanForm";

export const metadata: Metadata = {
  title: "Tambah Kegiatan - IKASADA",
};

export default function TambahKegiatanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Tambah Kegiatan
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Isi detail kegiatan baru di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <KegiatanForm mode="create" />
      </div>
    </div>
  );
}
