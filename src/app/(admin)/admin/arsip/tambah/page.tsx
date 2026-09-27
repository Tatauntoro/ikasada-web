import { Metadata } from "next";
import { ArsipForm } from "@/components/admin/ArsipForm";

export const metadata: Metadata = {
  title: "Tambah Arsip - IKASADA",
};

export default function TambahArsipPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Tambah Arsip
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Isi detail dokumen arsip baru di bawah ini.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:p-8">
        <ArsipForm mode="create" />
      </div>
    </div>
  );
}
