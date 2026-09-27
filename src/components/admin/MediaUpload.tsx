"use client";

import { useRef, useState, useId, type ChangeEvent } from "react";
import {
  FileImage,
  FilmSlate,
  Spinner,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { formatUkuranBerkas } from "@/lib/format";
import { MAX_UKURAN_FOTO, MAX_UKURAN_VIDEO } from "@/lib/batas-media";

/**
 * Satu media galeri seperti yang disimpan di form.
 *
 * Media tidak punya URL publik (mengikuti aturan akses arsipnya), jadi yang
 * disimpan hanya identitas berkas. Dua field terakhir murni untuk pratinjau di
 * form dan tidak ikut dikirim ke server:
 * - `pratinjau`: object URL berkas yang baru diunggah di sesi form ini.
 * - `id`: baris tersimpan; pratinjaunya diambil lewat endpoint berpenjaga.
 */
export type MediaGaleri = {
  jenis: "FOTO" | "VIDEO";
  berkasId: string;
  penyimpanan: "CLOUDINARY" | "LOKAL";
  namaAsli: string | null;
  format: string | null;
  ukuran: number | null;
  caption: string | null;
  pratinjau?: string;
  id?: string;
};

type HasilUpload = {
  success?: boolean;
  data?: {
    berkasId?: string;
    penyimpanan?: "CLOUDINARY" | "LOKAL";
    namaAsli?: string;
    format?: string;
    ukuran?: number;
    jenis?: "FOTO" | "VIDEO";
  };
  error?: { message?: string };
};

export type MediaUploadProps = {
  value: MediaGaleri[];
  onChange: (media: MediaGaleri[]) => void;
  /** Slug arsip, dipakai membangun URL pratinjau untuk media yang tersimpan. */
  slug?: string;
  maks?: number;
  error?: string;
};

export function MediaUpload({
  value,
  onChange,
  slug,
  maks = 30,
  error,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [sedangUnggah, setSedangUnggah] = useState(0);
  const [galat, setGalat] = useState<string | null>(null);

  /** Pratinjau: object URL (baru diunggah) atau endpoint tergate (sudah tersimpan). */
  function sumberPratinjau(media: MediaGaleri): string | null {
    if (media.pratinjau) return media.pratinjau;
    if (media.id && slug) return `/api/arsip/${slug}/media/${media.id}`;
    return null;
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const daftar = Array.from(e.target.files ?? []);
    if (daftar.length === 0) return;

    setGalat(null);
    setSedangUnggah(daftar.length);

    const berhasil: MediaGaleri[] = [];
    let pesanGagal: string | null = null;

    for (const file of daftar) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/admin/upload/media", {
          method: "POST",
          body: formData,
        });

        const hasil: HasilUpload = await response.json();

        if (!response.ok || !hasil.data?.berkasId) {
          pesanGagal =
            hasil?.error?.message || `Gagal mengunggah ${file.name}.`;
          continue;
        }

        berhasil.push({
          jenis: hasil.data.jenis ?? "FOTO",
          berkasId: hasil.data.berkasId,
          penyimpanan: hasil.data.penyimpanan ?? "LOKAL",
          namaAsli: hasil.data.namaAsli ?? file.name,
          format: hasil.data.format ?? null,
          ukuran: hasil.data.ukuran ?? file.size,
          caption: null,
          pratinjau: URL.createObjectURL(file),
        });
      } catch {
        pesanGagal = "Terjadi kesalahan jaringan saat mengunggah media.";
      }

      setSedangUnggah((sisa) => sisa - 1);
    }

    if (berhasil.length > 0) {
      onChange([...value, ...berhasil].slice(0, maks));
    }
    if (pesanGagal) {
      setGalat(pesanGagal);
    }

    setSedangUnggah(0);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function ubahCaption(index: number, caption: string) {
    onChange(
      value.map((item, i) => (i === index ? { ...item, caption } : item))
    );
  }

  function hapus(index: number) {
    const dibuang = value[index];
    if (dibuang?.pratinjau) URL.revokeObjectURL(dibuang.pratinjau);
    onChange(value.filter((_, i) => i !== index));
  }

  const penuh = value.length >= maks;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#0f1012]">
          Galeri Foto &amp; Video
        </span>
        <span className="text-xs text-[#8f8f8f]">
          {value.length}/{maks} media
        </span>
      </div>

      {value.length > 0 && (
        <ul className="space-y-3">
          {value.map((media, index) => {
            const sumber = sumberPratinjau(media);

            return (
              <li
                key={media.id ?? `${media.berkasId}-${index}`}
                className="flex gap-3 rounded-2xl border border-black/[0.08] bg-[#fdfdfd] p-3"
              >
                <div className="relative flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-xl bg-[#f2f2f4]">
                  {!sumber ? (
                    media.jenis === "VIDEO" ? (
                      <FilmSlate weight="bold" className="text-2xl text-[#8f8f8f]" />
                    ) : (
                      <FileImage weight="bold" className="text-2xl text-[#8f8f8f]" />
                    )
                  ) : media.jenis === "VIDEO" ? (
                    <video
                      src={sumber}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={sumber}
                      alt={media.caption ?? media.namaAsli ?? "Media galeri"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#5e5e5e]">
                    {media.jenis === "VIDEO" ? (
                      <FilmSlate weight="bold" />
                    ) : (
                      <FileImage weight="bold" />
                    )}
                    <span className="truncate">
                      {media.namaAsli ?? media.berkasId}
                    </span>
                    <span className="flex-none">
                      {formatUkuranBerkas(media.ukuran)}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={media.caption ?? ""}
                    onChange={(e) => ubahCaption(index, e.target.value)}
                    placeholder="Keterangan (opsional)"
                    aria-label={`Keterangan media ${index + 1}`}
                    className="w-full rounded-lg border border-black/[0.08] bg-[#fdfdfd] px-3 py-2 text-xs text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => hapus(index)}
                  className="flex-none self-start rounded-lg bg-red-50 px-2.5 py-2 text-red-600 transition-colors hover:bg-red-100"
                  aria-label={`Hapus media ${index + 1}`}
                >
                  <Trash weight="bold" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={sedangUnggah > 0 || penuh}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 transition-colors ${
          error || galat
            ? "border-red-300 bg-red-50"
            : "border-black/[0.16] bg-[#f2f2f4] hover:border-[#0071e3]/50"
        } disabled:opacity-60`}
      >
        {sedangUnggah > 0 ? (
          <>
            <Spinner weight="bold" className="animate-spin text-2xl text-[#0071e3]" />
            <span className="text-sm font-semibold text-[#5e5e5e]">
              Mengunggah {sedangUnggah} berkas...
            </span>
          </>
        ) : (
          <>
            <UploadSimple weight="bold" className="text-2xl text-[#0071e3]" />
            <span className="text-sm font-semibold text-[#0f1012]">
              {penuh ? `Batas ${maks} media tercapai` : "Klik untuk pilih foto/video"}
            </span>
            <span className="text-xs text-[#8f8f8f]">
              Bisa pilih beberapa berkas sekaligus. Foto: JPG/PNG/WEBP maks{" "}
              {Math.round(MAX_UKURAN_FOTO / (1024 * 1024))} MB. Video:
              MP4/WEBM/MOV maks {Math.round(MAX_UKURAN_VIDEO / (1024 * 1024))} MB.
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        onChange={handleFiles}
        aria-label="Pilih foto atau video"
        className="hidden"
      />

      <p className="text-xs text-[#8f8f8f]">
        Galeri mengikuti tingkat akses arsip ini — kalau arsipnya khusus alumni,
        foto/videonya juga hanya bisa dibuka alumni yang sudah masuk. Batas
        ukuran karena unggahan lewat server; bisa dinaikkan setelah penyimpanan
        pindah ke penyimpanan objek/CDN.
      </p>

      {(error || galat) && (
        <p className="text-xs font-medium text-red-600">{galat || error}</p>
      )}
    </div>
  );
}
