"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  PaperPlaneRight,
  ShieldCheck,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { StatusKegiatan } from "@/generated/prisma/enums";
import type { KegiatanModel as Kegiatan } from "@/generated/prisma/models/Kegiatan";
import type { KategoriKegiatanModel as KategoriKegiatan } from "@/generated/prisma/models/KategoriKegiatan";
import { kegiatanCreateSchema } from "@/lib/validations/kegiatan";
import { isValidYoutubeUrl, urlEmbed, ekstrakVideoId } from "@/lib/youtube";
import { labelPerubahan } from "@/lib/verifikasi-diff";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";
import RichTextEditor from "./RichTextEditor";
import { MediaUpload, type MediaGaleri } from "./MediaUpload";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  AksiTinjau,
  ajukanVerifikasi,
  BadgeVerifikasi,
  useVerifikatorKonten,
  type StatusVerifikasiUI,
} from "./VerifikasiKonten";

/** Media tersimpan yang dikirim halaman edit (relasi `KegiatanMedia`). */
type MediaAwal = {
  id: string;
  jenis: "FOTO" | "VIDEO";
  berkasId: string;
  penyimpanan: "R2" | "LOKAL";
  namaAsli: string | null;
  format: string | null;
  ukuran: number | null;
  caption: string | null;
};

function mediaDari(list: MediaAwal[] | undefined): MediaGaleri[] {
  return (list ?? []).map((m) => ({
    id: m.id,
    jenis: m.jenis,
    berkasId: m.berkasId,
    penyimpanan: m.penyimpanan,
    namaAsli: m.namaAsli,
    format: m.format,
    ukuran: m.ukuran,
    caption: m.caption,
  }));
}

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
  initialData?: Kegiatan & { media?: MediaAwal[] };
  id?: string;
  /** Dibuka dari antrean verifikasi ("Tinjau") — aktifkan pengaman publish. */
  tinjau?: boolean;
  /** Konten sudah pernah diverifikasi/ditolak (ada snapshot) — ini revisi. */
  revisi?: boolean;
  /** Kunci field yang berbeda dari versi terverifikasi. */
  perubahan?: string[];
};

export function KegiatanForm({
  mode,
  initialData,
  id,
  tinjau = false,
  revisi = false,
  perubahan = [],
}: KegiatanFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<KegiatanFormData>(
    initialData ? kegiatanToFormData(initialData) : emptyForm()
  );
  const [media, setMedia] = useState<MediaGaleri[]>(() =>
    mediaDari(initialData?.media)
  );
  const verifikator = useVerifikatorKonten();
  const [verifikasi, setVerifikasi] = useState<StatusVerifikasiUI>(
    (initialData?.verifikasi as StatusVerifikasiUI | undefined) ?? "BELUM"
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  /** Ada perubahan isi sejak halaman dibuka (membatalkan verifikasi lama). */
  const [berubah, setBerubah] = useState(false);
  const [konfirmasiPublish, setKonfirmasiPublish] = useState(false);

  /** Penanda "Diubah" per field (mode tinjau). */
  const ubah = (kunci: string) => perubahan.includes(kunci);
  const labelBerubah = labelPerubahan(perubahan);

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
    setBerubah(true);
  }

  async function handleSubmit(
    status: StatusKegiatan,
    opsi?: { ajukan?: boolean }
  ) {
    setServerError(null);

    const parseResult = kegiatanCreateSchema.safeParse({
      ...form,
      tanggalMulai: form.tanggalMulai || undefined,
      tanggalSelesai: form.tanggalSelesai || null,
      kategori: form.kategori || undefined,
      media,
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

      const idTersimpan = (result?.data?.id as string | undefined) ?? id;
      if (opsi?.ajukan && idTersimpan) {
        const aj = await ajukanVerifikasi("kegiatan", idTersimpan);
        if (!aj.ok) {
          setServerError(aj.pesan ?? "Gagal mengajukan verifikasi.");
          return;
        }
        setVerifikasi("MENUNGGU");
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

      {tinjau && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <Warning weight="bold" className="mt-0.5 shrink-0" />
            <span>
              <strong>Mode Tinjau.</strong> Form dikunci — perubahan tidak
              tersimpan.
              {verifikator
                ? " Gunakan tombol Verifikasi atau Tolak di bagian bawah untuk memutuskan."
                : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-6">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${
                revisi
                  ? "bg-amber-200 text-amber-900"
                  : "bg-[#0071e3]/15 text-[#005bbb]"
              }`}
            >
              {revisi ? "Konten revisi" : "Konten baru"}
            </span>
            {revisi &&
              (labelBerubah.length > 0 ? (
                <span className="text-xs">
                  Bagian yang berubah: {labelBerubah.join(", ")}.
                </span>
              ) : (
                <span className="text-xs">
                  Tidak ada perubahan isi dibanding versi terverifikasi.
                </span>
              ))}
          </div>
        </div>
      )}

      <fieldset
        disabled={tinjau}
        className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="space-y-5">
          <FormField
            label="Judul"
            htmlFor="judul"
            berubah={ubah("judul")}
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
            berubah={ubah("deskripsiSingkat")}
            error={errors.deskripsiSingkat}
            required
          >
            <RichTextEditor
              id="deskripsiSingkat"
              tipe="kegiatan"
              value={form.deskripsiSingkat}
              onChange={(value) => updateField("deskripsiSingkat", value)}
              rows={3}
              placeholder="Deskripsi singkat untuk card kegiatan"
            />
          </FormField>

          <FormField
            label="Deskripsi Lengkap"
            htmlFor="deskripsiLengkap"
            berubah={ubah("deskripsiLengkap")}
            error={errors.deskripsiLengkap}
          >
            <RichTextEditor
              id="deskripsiLengkap"
              tipe="kegiatan"
              value={form.deskripsiLengkap}
              onChange={(value) => updateField("deskripsiLengkap", value)}
              rows={5}
              placeholder="Deskripsi lengkap halaman detail (opsional)"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Tanggal Mulai"
              htmlFor="tanggalMulai"
              berubah={ubah("tanggalMulai")}
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
              berubah={ubah("tanggalSelesai")}
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
            berubah={ubah("lokasi")}
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
            berubah={ubah("kategoriKegiatanId")}
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
            berubah={ubah("gambarThumbnailUrl")}
            hint="Upload gambar terlebih dahulu. Opsional."
          />

          <MediaUpload
            value={media}
            onChange={(m) => {
              setMedia(m);
              setBerubah(true);
            }}
            maks={12}
            error={errors.media}
            berubah={ubah("media")}
            urlPratinjau={(m) =>
              m.id && initialData?.slug
                ? `/api/kegiatan/${initialData.slug}/media/${m.id}`
                : null
            }
            catatan="Galeri foto & video (opsional, maks 12). Video: MP4/WEBM/MOV. Batas ukuran karena unggahan lewat server."
          />

          <FormField
            label="Link Video YouTube"
            htmlFor="videoYoutubeUrl"
            berubah={ubah("videoYoutubeUrl")}
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
            berubah={ubah("linkPendaftaran")}
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
      </fieldset>

      {tinjau ? (
        <div className="space-y-3 border-t border-black/[0.08] pt-4">
          <AksiTinjau
            entitas="kegiatan"
            id={id ?? ""}
            nama={form.judul}
            bolehUbah={verifikator}
            onBerhasil={() => router.replace("/admin/verifikasi")}
          />
        </div>
      ) : (
        <div className="space-y-3 border-t border-black/[0.08] pt-4">
        {!verifikator && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5e5e5e]">
            <BadgeVerifikasi verifikasi={verifikasi} />
            <span>
              {verifikasi === "DISETUJUI"
                ? berubah
                  ? "Sudah diverifikasi, tetapi isinya berubah — ajukan verifikasi ulang sebelum menerbitkan."
                  : "Sudah diverifikasi — Anda bisa menerbitkan."
                : "Konten harus diverifikasi Ketua Umum sebelum bisa diterbitkan."}
            </span>
          </div>
        )}

        {!verifikator && verifikasi === "DITOLAK" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">Verifikasi ditolak verifikator.</p>
            <p className="mt-1 whitespace-pre-wrap">
              {initialData?.catatanVerifikasi
                ? `Alasan: ${initialData.catatanVerifikasi}`
                : "Tidak ada catatan alasan dari verifikator."}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleSubmit("DRAFT")}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-black/[0.08] text-[#0f1012] font-bold text-sm hover:bg-black/[0.06] disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
          >
            <FloppyDisk weight="bold" />
            {isLoading ? "Menyimpan..." : "Simpan sebagai Draft"}
          </button>
          {!verifikator &&
            (verifikasi === "BELUM" ||
              verifikasi === "DITOLAK" ||
              (verifikasi === "DISETUJUI" && berubah)) && (
              <button
                type="button"
                onClick={() => handleSubmit("DRAFT", { ajukan: true })}
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#0071e3] text-[#0071e3] font-bold text-sm hover:bg-[#0071e3]/[0.08] disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck weight="bold" />
                {isLoading
                  ? "Memproses..."
                  : verifikasi === "DISETUJUI" || verifikasi === "DITOLAK"
                    ? "Ajukan Verifikasi Ulang"
                    : "Ajukan Verifikasi"}
              </button>
            )}
          <button
            type="button"
            onClick={() =>
              verifikator && tinjau
                ? setKonfirmasiPublish(true)
                : handleSubmit("PUBLISHED")
            }
            disabled={
              isLoading ||
              (!verifikator && (verifikasi !== "DISETUJUI" || berubah))
            }
            title={
              !verifikator
                ? verifikasi !== "DISETUJUI"
                  ? "Menunggu verifikasi Ketua Umum"
                  : berubah
                    ? "Konten diubah — ajukan verifikasi ulang"
                    : undefined
                : undefined
            }
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0071e3] text-white font-bold text-sm hover:bg-[#005fc1] disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
          >
            <PaperPlaneRight weight="bold" />
            {isLoading ? "Menyimpan..." : "Publish"}
          </button>
        </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={konfirmasiPublish}
        title="Terbitkan konten ini?"
        message="Konten akan langsung tayang di halaman publik. Pastikan sudah selesai ditinjau sebelum menerbitkan."
        confirmLabel="Ya, Terbitkan"
        onConfirm={() => {
          setKonfirmasiPublish(false);
          handleSubmit("PUBLISHED");
        }}
        onCancel={() => setKonfirmasiPublish(false)}
        isLoading={isLoading}
      />
    </form>
  );
}
