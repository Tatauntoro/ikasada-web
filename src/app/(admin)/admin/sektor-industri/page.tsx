"use client";

import { Buildings } from "@phosphor-icons/react";
import { MasterDataManager } from "@/components/admin/MasterDataManager";
import { MODUL } from "@/lib/permission";

export default function SektorIndustriPage() {
  return (
    <MasterDataManager
      config={{
        endpoint: "/api/admin/sektor-industri",
        modul: MODUL.SEKTOR_INDUSTRI,
        title: "Sektor Industri",
        description:
          "Kelola daftar sektor industri yang digunakan pada data alumni.",
        fieldName: "namaSektor",
        fieldLabel: "Nama Sektor",
        placeholder: "Nama sektor industri...",
        icon: Buildings,
        addLabel: "Tambah Sektor",
        emptyTitle: "Belum ada sektor industri",
        emptyDescription:
          "Tambahkan sektor industri pertama untuk digunakan pada data alumni.",
        emptyActionLabel: "Tambah Sektor",
        confirmTitle: "Hapus Sektor Industri",
        confirmMessage:
          "Apakah Anda yakin ingin menghapus sektor industri ini? Sektor yang masih digunakan oleh alumni tidak dapat dihapus.",
        loadErrorMessage: "Gagal memuat data sektor industri",
        saveErrorMessage: "Gagal menyimpan sektor industri",
        deleteErrorMessage: "Gagal menghapus sektor industri",
      }}
    />
  );
}
