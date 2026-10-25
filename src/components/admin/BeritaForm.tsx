"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk, PaperPlaneRight, ShieldCheck, Warning } from "@phosphor-icons/react";
import { StatusBerita } from "@/generated/prisma/enums";
import type { BeritaModel as Berita } from "@/generated/prisma/models/Berita";
import type { JenisBeritaModel as JenisBerita } from "@/generated/prisma/models/JenisBerita";
import { beritaCreateSchema } from "@/lib/validations/berita";
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

/** Media tersimpan yang dikirim halaman edit (relasi `BeritaMedia`). */
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

export type BeritaFormData = {
  judul: string;
  penulis: string;
  jenisBeritaId: string;
  tanggal: string;
  deskripsiSingkat: string;
  deskripsiLengkap: string;
  gambarUrl: string;
};

function emptyForm(): BeritaFormData {
  return {
    judul: "",
    penulis: "Redaksi IKASADA",
    jenisBeritaId: "",
    tanggal: "",
    deskripsiSingkat: "",
    deskripsiLengkap: "",
    gambarUrl: "",
  };
}

function toDatetimeLocal(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function beritaToFormData(berita: Berita): BeritaFormData {
  return {
    judul: berita.judul,
    penulis: berita.penulis,
    jenisBeritaId: berita.jenisBeritaId,
    tanggal: toDatetimeLocal(berita.tanggal),
    deskripsiSingkat: berita.deskripsiSingkat,
    deskripsiLengkap: berita.deskripsiLengkap ?? "",
    gambarUrl: berita.gambarUrl ?? "",
  };
}

type FormErrors = Record<string, string>;

export type BeritaFormProps = {
  mode: "create" | "edit";
  initialData?: Berita & { media?: MediaAwal[] };
  id?: string;
  /** Dibuka dari antrean verifikasi ("Tinjau") — aktifkan pengaman publish. */
  tinjau?: boolean;
  /** Konten sudah pernah diverifikasi/ditolak (ada snapshot) — ini revisi. */
  revisi?: boolean;
  /** Kunci field yang berbeda dari versi terverifikasi. */
  perubahan?: string[];
};

export function BeritaForm({
  mode,
  initialData,
  id,
  tinjau = false,
  revisi = false,
  perubahan = [],
}: BeritaFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<BeritaFormData>(
    initialData ? beritaToFormData(initialData) : emptyForm()
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

  const [jenisList, setJenisList] = useState<JenisBerita[]>([]);
  const [isLoadingJenis, setIsLoadingJenis] = useState(true);

  const fetchJenis = useCallback(async () => {
    setIsLoadingJenis(true);
    try {
      const response = await fetch("/api/admin/jenis-berita");
      const result = await response.json();
      if (response.ok) {
        setJenisList(result.data || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingJenis(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJenis();
  }, [fetchJenis]);

  function updateField<K extends keyof BeritaFormData>(
    key: K,
    value: BeritaFormData[K]
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
    status: StatusBerita,
    opsi?: { ajukan?: boolean }
  ) {
    setServerError(null);

    const parseResult = beritaCreateSchema.safeParse({
      ...form,
      tanggal: form.tanggal || undefined,
      jenisBeritaId: form.jenisBeritaId || undefined,
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
        mode === "edit" && id ? `/api/admin/berita/${id}` : "/api/admin/berita";
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
          setServerError(result?.error?.message || "Gagal menyimpan berita.");
        }
        return;
      }

      const idTersimpan = (result?.data?.id as string | undefined) ?? id;
      if (opsi?.ajukan && idTersimpan) {
        const aj = await ajukanVerifikasi("berita", idTersimpan);
        if (!aj.ok) {
          setServerError(aj.pesan ?? "Gagal mengajukan verifikasi.");
          return;
        }
        setVerifikasi("MENUNGGU");
      }

      router.replace("/admin/berita");
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
              placeholder="Judul berita"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Nama Penulis"
            htmlFor="penulis"
            berubah={ubah("penulis")}
            error={errors.penulis}
            hint="Nama yang ditampilkan pada halaman berita. Bisa nama individu atau tim redaksi."
            required
          >
            <input
              id="penulis"
              name="penulis"
              type="text"
              value={form.penulis}
              onChange={(e) => updateField("penulis", e.target.value)}
              maxLength={120}
              required
              placeholder="Contoh: Redaksi IKASADA"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Tipe Berita"
              htmlFor="jenisBeritaId"
              berubah={ubah("jenisBeritaId")}
              error={errors.jenisBeritaId}
              required
            >
              <select
                id="jenisBeritaId"
                value={form.jenisBeritaId}
                onChange={(e) => updateField("jenisBeritaId", e.target.value)}
                disabled={isLoadingJenis}
                className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all disabled:opacity-60"
              >
                <option value="">Pilih tipe</option>
                {jenisList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Tanggal & Waktu"
              htmlFor="tanggal"
              berubah={ubah("tanggal")}
              error={errors.tanggal}
              required
            >
              <input
                id="tanggal"
                type="datetime-local"
                value={form.tanggal}
                onChange={(e) => updateField("tanggal", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </FormField>
          </div>

          <FormField
            label="Deskripsi Singkat"
            htmlFor="deskripsiSingkat"
            berubah={ubah("deskripsiSingkat")}
            error={errors.deskripsiSingkat}
            required
          >
            <RichTextEditor
              id="deskripsiSingkat"
              tipe="berita"
              value={form.deskripsiSingkat}
              onChange={(value) => updateField("deskripsiSingkat", value)}
              rows={3}
              placeholder="Ringkasan singkat berita"
            />
          </FormField>

          <FormField
            label="Deskripsi Lengkap"
            htmlFor="deskripsiLengkap"
            berubah={ubah("deskripsiLengkap")}
            error={errors.deskripsiLengkap}
            hint="Isi berita untuk halaman detail (opsional)."
          >
            <RichTextEditor
              id="deskripsiLengkap"
              tipe="berita"
              value={form.deskripsiLengkap}
              onChange={(value) => updateField("deskripsiLengkap", value)}
              rows={8}
              placeholder="Isi berita lengkap (opsional)"
            />
          </FormField>
        </div>

        <div className="space-y-5">
          <ImageUpload
            label="Gambar"
            tipe="berita"
            value={form.gambarUrl}
            onChange={(url) => updateField("gambarUrl", url ?? "")}
            error={errors.gambarUrl}
            berubah={ubah("gambarUrl")}
            hint="Upload gambar terlebih dahulu. Opsional."
          />

          <MediaUpload
            value={media}
            onChange={(m) => {
              setMedia(m);
              setBerubah(true);
            }}
            hanyaFoto
            maks={12}
            error={errors.media}
            berubah={ubah("media")}
            urlPratinjau={(m) =>
              m.id && initialData?.slug
                ? `/api/berita/${initialData.slug}/media/${m.id}`
                : null
            }
            catatan="Galeri foto berita (opsional, maks 12). Batas ukuran karena unggahan lewat server."
          />
        </div>
      </fieldset>

      {tinjau ? (
        <div className="space-y-3 border-t border-black/[0.08] pt-4">
          <AksiTinjau
            entitas="berita"
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
