"use client";

import { Files } from "@phosphor-icons/react";
import { MasterDataManager } from "@/components/admin/MasterDataManager";
import { MODUL } from "@/lib/permission";

export default function JenisArsipPage() {
  return (
    <MasterDataManager
      config={{
        endpoint: "/api/admin/jenis-arsip",
        modul: MODUL.JENIS_ARSIP,
        title: "Jenis Arsip",
        description:
          "Kelola daftar jenis dokumen arsip yang dipakai pada arsip dan filter halaman publik.",
        fieldName: "nama",
        fieldLabel: "Nama Jenis",
        placeholder: "Nama jenis arsip...",
        icon: Files,
        addLabel: "Tambah Jenis",
        emptyTitle: "Belum ada jenis arsip",
        emptyDescription:
          "Tambahkan jenis arsip pertama, misalnya Laporan atau Notulen.",
        emptyActionLabel: "Tambah Jenis",
        confirmTitle: "Hapus Jenis Arsip",
        confirmMessage:
          "Apakah Anda yakin ingin menghapus jenis arsip ini? Jenis yang masih dipakai oleh arsip tidak dapat dihapus.",
        loadErrorMessage: "Gagal memuat data jenis arsip",
        saveErrorMessage: "Gagal menyimpan jenis arsip",
        deleteErrorMessage: "Gagal menghapus jenis arsip",
      }}
    />
  );
}
