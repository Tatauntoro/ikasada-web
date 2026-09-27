"use client";

import { useState, useRef, useId, ChangeEvent } from "react";
import Image from "next/image";
import { UploadSimple, Trash, Spinner } from "@phosphor-icons/react";

export type ImageUploadProps = {
  label?: string;
  tipe: "kegiatan" | "alumni" | "kerjasama" | "arsip";
  value?: string | null;
  onChange: (url: string | null) => void;
  error?: string;
  hint?: string;
};

export function ImageUpload({
  label = "Gambar",
  tipe,
  value,
  onChange,
  error,
  hint,
}: ImageUploadProps) {
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
      formData.append("tipe", tipe);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result?.error?.message || "Upload gambar gagal.";
        setUploadError(message);
        return;
      }

      onChange(result.data.url);
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

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-[#0f1012]"
      >
        {label}
      </label>

      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-black/[0.08] bg-[#fdfdfd]">
          <div className="relative w-full aspect-video">
            <Image
              src={value}
              alt={label}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 500px"
            />
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-[#fdfdfd]/95 text-[#0f1012] text-xs font-bold shadow hover:bg-[#f2f2f4] transition-colors disabled:opacity-70"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold shadow hover:bg-red-600 transition-colors disabled:opacity-70"
            >
              <Trash weight="bold" className="inline mr-1" />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={`w-full flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-2xl border-2 border-dashed transition-colors ${
            error || uploadError
              ? "border-red-300 bg-red-50"
              : "border-black/[0.16] bg-[#f2f2f4] hover:border-[#0071e3]/50"
          }`}
        >
          {isUploading ? (
            <>
              <Spinner weight="bold" className="text-2xl animate-spin text-[#0071e3]" />
              <span className="text-sm font-semibold text-[#5e5e5e]">
                Mengunggah...
              </span>
            </>
          ) : (
            <>
              <UploadSimple weight="bold" className="text-2xl text-[#0071e3]" />
              <span className="text-sm font-semibold text-[#0f1012]">
                Klik untuk unggah gambar
              </span>
              <span className="text-xs text-[#8f8f8f]">
                JPG, JPEG, PNG, WEBP (maks. 2 MB)
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        aria-label={label}
        className="hidden"
      />

      {hint && !error && !uploadError && (
        <p className="text-xs text-[#8f8f8f]">{hint}</p>
      )}
      {(error || uploadError) && (
        <p className="text-xs text-red-600 font-medium">
          {uploadError || error}
        </p>
      )}
    </div>
  );
}
