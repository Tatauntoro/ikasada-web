"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  PaperPlaneRight,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { StatusKegiatan } from "@/generated/prisma/enums";
import type { KegiatanModel as Kegiatan } from "@/generated/prisma/models/Kegiatan";
import type { KategoriKegiatanModel as KategoriKegiatan } from "@/generated/prisma/models/KategoriKegiatan";
import { kegiatanCreateSchema } from "@/lib/validations/kegiatan";
import { isValidYoutubeUrl, urlEmbed, ekstrakVideoId } from "@/lib/youtube";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";

export type KegiatanFormData = {
  judul: string;
  deskripsiSingkat: string;
  deskripsiLengkap: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
  kategori: string;
  videoYoutubeUrl: string;
  linkPendaftaran: string;
  gambarThumbnailUrl: string;
};

function emptyForm(): KegiatanFormData {
  return {
    judul: "",
    deskripsiSingkat: "",
    deskripsiLengkap: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    lokasi: "",
    kategori: "",
    videoYoutubeUrl: "",
    linkPendaftaran: "",
    gambarThumbnailUrl: "",
  };
}

function kegiatanToFormData(kegiatan: Kegiatan): KegiatanFormData {
  return {
    judul: kegiatan.judul,
    deskripsiSingkat: kegiatan.deskripsiSingkat,
    deskripsiLengkap: kegiatan.deskripsiLengkap ?? "",
    tanggalMulai: toDatetimeLocal(kegiatan.tanggalMulai),
    tanggalSelesai: kegiatan.tanggalSelesai
      ? toDatetimeLocal(kegiatan.tanggalSelesai)
      : "",
    lokasi: kegiatan.lokasi,
    kategori: kegiatan.kategoriKegiatanId,
    videoYoutubeUrl: kegiatan.videoYoutubeUrl ?? "",
    linkPendaftaran: kegiatan.linkPendaftaran ?? "",
    gambarThumbnailUrl: kegiatan.gambarThumbnailUrl ?? "",
  };
}

function toDatetimeLocal(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type FormErrors = Record<string, string>;

export type KegiatanFormProps = {
  mode: "create" | "edit";
  initialData?: Kegiatan;
  id?: string;
};

export function KegiatanForm({ mode, initialData, id }: KegiatanFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<KegiatanFormData>(
    initialData ? kegiatanToFormData(initialData) : emptyForm()
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [kategoriList, setKategoriList] = useState<KategoriKegiatan[]>([]);
  const [isLoadingKategori, setIsLoadingKategori] = useState(true);

  const fetchKategori = useCallback(async () => {
    setIsLoadingKategori(true);
    try {
      const response = await fetch("/api/admin/kategori-kegiatan");
      const result = await response.json();
      if (response.ok) {
        setKategoriList(result.data || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingKategori(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKategori();
  }, [fetchKategori]);

  const isVideoValid = useMemo(() => {
    if (!form.videoYoutubeUrl) return true;
    return isValidYoutubeUrl(form.videoYoutubeUrl);
  }, [form.videoYoutubeUrl]);

  function updateField<K extends keyof KegiatanFormData>(
    key: K,
    value: KegiatanFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setServerError(null);
  }

  async function handleSubmit(status: StatusKegiatan) {
    setServerError(null);

    const parseResult = kegiatanCreateSchema.safeParse({
      ...form,
      tanggalMulai: form.tanggalMulai || undefined,
      tanggalSelesai: form.tanggalSelesai || null,
      kategori: form.kategori || undefined,
      status,
    });

    if (!parseResult.success) {
      const nextErrors: FormErrors = {};
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join(".");
        if (!nextErrors[path]) {
          nextErrors[path] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);

    try {
      const url =
        mode === "edit" && id
          ? `/api/admin/kegiatan/${id}`
          : "/api/admin/kegiatan";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseResult.data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result?.error?.fields) {
          setErrors(result.error.fields);
        } else {
          setServerError(
            result?.error?.message || "Gagal menyimpan kegiatan."
          );
        }
        return;
      }

      router.replace("/admin/kegiatan");
    } catch {
      setServerError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {serverError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <Warning weight="bold" className="mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <FormField
            label="Judul"
            htmlFor="judul"
            error={errors.judul}
            required
          >
            <input
              id="judul"
              type="text"
              value={form.judul}
              onChange={(e) => updateField("judul", e.target.value)}
              placeholder="Judul kegiatan"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Deskripsi Singkat"
            htmlFor="deskripsiSingkat"
            error={errors.deskripsiSingkat}
            required
          >
            <textarea
              id="deskripsiSingkat"
              value={form.deskripsiSingkat}
              onChange={(e) => updateField("deskripsiSingkat", e.target.value)}
              placeholder="Deskripsi singkat untuk card kegiatan"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all resize-none"
            />
          </FormField>

          <FormField
            label="Deskripsi Lengkap"
            htmlFor="deskripsiLengkap"
            error={errors.deskripsiLengkap}
          >
            <textarea
              id="deskripsiLengkap"
              value={form.deskripsiLengkap}
              onChange={(e) => updateField("deskripsiLengkap", e.target.value)}
              placeholder="Deskripsi lengkap halaman detail (opsional)"
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all resize-none"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Tanggal Mulai"
              htmlFor="tanggalMulai"
              error={errors.tanggalMulai}
              required
            >
              <input
                id="tanggalMulai"
                type="datetime-local"
                value={form.tanggalMulai}
                onChange={(e) => updateField("tanggalMulai", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </FormField>

            <FormField
              label="Tanggal Selesai"
              htmlFor="tanggalSelesai"
              error={errors.tanggalSelesai}
            >
              <input
                id="tanggalSelesai"
                type="datetime-local"
                value={form.tanggalSelesai}
                onChange={(e) => updateField("tanggalSelesai", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </FormField>
          </div>

          <FormField
            label="Lokasi"
            htmlFor="lokasi"
            error={errors.lokasi}
            required
          >
            <input
              id="lokasi"
              type="text"
              value={form.lokasi}
              onChange={(e) => updateField("lokasi", e.target.value)}
              placeholder="Lokasi kegiatan"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Kategori"
            htmlFor="kategori"
            error={errors.kategori}
            required
          >
            <select
              id="kategori"
              value={form.kategori}
              onChange={(e) => updateField("kategori", e.target.value)}
              disabled={isLoadingKategori}
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all disabled:opacity-60"
            >
              <option value="">Pilih kategori</option>
              {kategoriList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKategori}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="space-y-5">
          <ImageUpload
            label="Thumbnail"
            tipe="kegiatan"
            value={form.gambarThumbnailUrl}
            onChange={(url) => updateField("gambarThumbnailUrl", url ?? "")}
            error={errors.gambarThumbnailUrl}
            hint="Upload gambar terlebih dahulu. Wajib untuk publish."
          />

          <FormField
            label="Link Video YouTube"
            htmlFor="videoYoutubeUrl"
            error={errors.videoYoutubeUrl || (!isVideoValid ? "URL YouTube tidak valid" : undefined)}
            hint="Opsional. Tempel URL YouTube untuk menampilkan video di halaman detail."
          >
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  id="videoYoutubeUrl"
                  type="text"
                  value={form.videoYoutubeUrl}
                  onChange={(e) =>
                    updateField("videoYoutubeUrl", e.target.value)
                  }
                  placeholder="https://youtu.be/..."
                  className="flex-1 px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                />
                {form.videoYoutubeUrl && (
                  <button
                    type="button"
                    onClick={() => updateField("videoYoutubeUrl", "")}
                    className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="Hapus video"
                  >
                    <Trash weight="bold" />
                  </button>
                )}
              </div>

              {form.videoYoutubeUrl && isVideoValid && (
                <div className="rounded-xl overflow-hidden border border-black/[0.08] aspect-video">
                  <iframe
                    src={urlEmbed(ekstrakVideoId(form.videoYoutubeUrl) ?? "")}
                    title="Preview video"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </FormField>

          <FormField
            label="Link Pendaftaran"
            htmlFor="linkPendaftaran"
            error={errors.linkPendaftaran}
            hint="Opsional. URL pendaftaran peserta kegiatan."
          >
            <input
              id="linkPendaftaran"
              type="text"
              value={form.linkPendaftaran}
              onChange={(e) => updateField("linkPendaftaran", e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-black/[0.08]">
        <button
          type="button"
          onClick={() => handleSubmit("DRAFT")}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl border border-black/[0.08] text-[#0f1012] font-bold text-sm hover:bg-black/[0.06] disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
        >
          <FloppyDisk weight="bold" />
          {isLoading ? "Menyimpan..." : "Simpan sebagai Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("PUBLISHED")}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0071e3] text-white font-bold text-sm hover:bg-[#005fc1] disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
        >
          <PaperPlaneRight weight="bold" />
          {isLoading ? "Menyimpan..." : "Publish"}
        </button>
      </div>
    </form>
  );
}
