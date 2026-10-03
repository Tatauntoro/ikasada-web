"use client";

import { Newspaper } from "@phosphor-icons/react";
import { MasterDataManager } from "@/components/admin/MasterDataManager";
import { MODUL } from "@/lib/permission";

export default function JenisBeritaPage() {
  return (
    <MasterDataManager
      config={{
        endpoint: "/api/admin/jenis-berita",
        modul: MODUL.JENIS_BERITA,
        title: "Jenis Berita",
        description:
          "Kelola daftar tipe berita yang dipakai pada berita dan badge di halaman publik.",
        fieldName: "nama",
        fieldLabel: "Nama Jenis",
        placeholder: "Nama jenis berita...",
        icon: Newspaper,
        addLabel: "Tambah Jenis",
        emptyTitle: "Belum ada jenis berita",
        emptyDescription:
          "Tambahkan jenis berita pertama, misalnya Prestasi atau Kegiatan.",
        emptyActionLabel: "Tambah Jenis",
        confirmTitle: "Hapus Jenis Berita",
        confirmMessage:
          "Apakah Anda yakin ingin menghapus jenis berita ini? Jenis yang masih dipakai oleh berita tidak dapat dihapus.",
        loadErrorMessage: "Gagal memuat data jenis berita",
        saveErrorMessage: "Gagal menyimpan jenis berita",
        deleteErrorMessage: "Gagal menghapus jenis berita",
      }}
    />
  );
}
