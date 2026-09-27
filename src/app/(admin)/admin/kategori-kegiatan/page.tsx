"use client";

import { Tag } from "@phosphor-icons/react";
import { MasterDataManager } from "@/components/admin/MasterDataManager";
import { MODUL } from "@/lib/permission";

export default function KategoriKegiatanPage() {
  return (
    <MasterDataManager
      config={{
        endpoint: "/api/admin/kategori-kegiatan",
        modul: MODUL.KATEGORI_KEGIATAN,
        title: "Kategori Kegiatan",
        description: "Kelola daftar kategori yang digunakan pada data kegiatan.",
        fieldName: "namaKategori",
        fieldLabel: "Nama Kategori",
        placeholder: "Nama kategori kegiatan...",
        icon: Tag,
        addLabel: "Tambah Kategori",
        emptyTitle: "Belum ada kategori kegiatan",
        emptyDescription:
          "Tambahkan kategori pertama untuk digunakan pada data kegiatan.",
        emptyActionLabel: "Tambah Kategori",
        confirmTitle: "Hapus Kategori Kegiatan",
        confirmMessage:
          "Apakah Anda yakin ingin menghapus kategori kegiatan ini? Kategori yang masih digunakan oleh kegiatan tidak dapat dihapus.",
        loadErrorMessage: "Gagal memuat data kategori kegiatan",
        saveErrorMessage: "Gagal menyimpan kategori kegiatan",
        deleteErrorMessage: "Gagal menghapus kategori kegiatan",
      }}
    />
  );
}
