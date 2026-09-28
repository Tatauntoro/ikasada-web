"use client";

import { useRef, useState, useId, type ChangeEvent } from "react";
import {
  FileDoc,
  FilePdf,
  FileXls,
  Spinner,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { formatUkuranBerkas } from "@/lib/format";

/**
 * Metadata berkas yang disimpan di form. Sengaja **tanpa URL**: berkas arsip
 * hanya keluar lewat `GET /api/arsip/[slug]/unduh` yang memeriksa sesi alumni,
 * jadi tidak ada alamat yang bisa dipakai untuk melewati pemeriksaan itu.
 */
export type BerkasTerunggah = {
  berkasId: string;
  berkasPenyimpanan: "R2" | "LOKAL";
  berkasNama: string;
  berkasFormat: string;
  berkasUkuran: number;
};

type HasilUpload = {
  success?: boolean;
  data?: {
    berkasId?: string;
    penyimpanan?: "R2" | "LOKAL";
    namaAsli?: string;
    format?: string;
    ukuran?: number;
  };
  error?: { message?: string };
};

export type BerkasUploadProps = {
  label?: string;
  value: BerkasTerunggah | null;
  onChange: (berkas: BerkasTerunggah | null) => void;
  error?: string;
  hint?: string;
};

export function BerkasUpload({
  label = "Berkas Dokumen",
  value,
  onChange,
  error,
  hint,
}: BerkasUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload/berkas", {
        method: "POST",
        body: formData,
      });

      const result: HasilUpload = await response.json();

      if (!response.ok || !result.data?.berkasId) {
        setUploadError(result?.error?.message || "Upload berkas gagal.");
        return;
      }

      onChange({
        berkasId: result.data.berkasId,
        berkasPenyimpanan: result.data.penyimpanan ?? "LOKAL",
        berkasNama: result.data.namaAsli ?? file.name,
        berkasFormat: result.data.format ?? "",
        berkasUkuran: result.data.ukuran ?? file.size,
      });
    } catch {
      setUploadError("Terjadi kesalahan jaringan saat upload.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleRemove() {
    onChange(null);
    setUploadError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const IkonBerkas = value?.berkasFormat?.toLowerCase() === "pdf"
    ? FilePdf
    : value?.berkasFormat?.toLowerCase().startsWith("xls")
      ? FileXls
      : FileDoc;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-[#0f1012]"
      >
        {label}
      </label>

      {value ? (
        <div className="flex items-center gap-4 rounded-2xl border border-black/[0.08] bg-[#fdfdfd] px-5 py-4">
          <IkonBerkas weight="bold" className="flex-none text-2xl text-[#0071e3]" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0f1012]">
              {value.berkasNama}
            </p>
            <p className="text-xs text-[#5e5e5e]">
              {value.berkasFormat.toUpperCase()} •{" "}
              {formatUkuranBerkas(value.berkasUkuran)}
            </p>
          </div>

          <div className="flex flex-none gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="rounded-lg bg-[#0071e3]/10 px-3 py-1.5 text-xs font-bold text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.18] disabled:opacity-70"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUploading}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-70"
            >
              <Trash weight="bold" className="mr-1 inline" />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
            error || uploadError
              ? "border-red-300 bg-red-50"
              : "border-black/[0.16] bg-[#f2f2f4] hover:border-[#0071e3]/50"
          }`}
        >
          {isUploading ? (
            <>
              <Spinner weight="bold" className="animate-spin text-2xl text-[#0071e3]" />
              <span className="text-sm font-semibold text-[#5e5e5e]">
                Mengunggah...
              </span>
            </>
          ) : (
            <>
              <UploadSimple weight="bold" className="text-2xl text-[#0071e3]" />
              <span className="text-sm font-semibold text-[#0f1012]">
                Klik untuk unggah berkas
              </span>
              <span className="text-xs text-[#8f8f8f]">
                PDF, DOC, DOCX, XLS, XLSX (maks. 4 MB)
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf"
        onChange={handleFileChange}
        aria-label={label}
        className="hidden"
      />

      {hint && !error && !uploadError && (
        <p className="text-xs text-[#8f8f8f]">{hint}</p>
      )}
      {(error || uploadError) && (
        <p className="text-xs font-medium text-red-600">{uploadError || error}</p>
      )}
    </div>
  );
}
