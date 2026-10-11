"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  PaperPlaneRight,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react";
import { StatusArsip } from "@/generated/prisma/enums";
import type { AksesArsip } from "@/generated/prisma/enums";
import type { ArsipModel as Arsip } from "@/generated/prisma/models/Arsip";
import type { ArsipMediaModel as ArsipMedia } from "@/generated/prisma/models/ArsipMedia";
import { arsipCreateSchema } from "@/lib/validations/arsip";
import { labelPerubahan } from "@/lib/verifikasi-diff";
import { PILIHAN_AKSES } from "@/lib/akses-arsip";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";
import { BerkasUpload, type BerkasTerunggah } from "./BerkasUpload";
import { MediaUpload, type MediaGaleri } from "./MediaUpload";
import RichTextEditor from "./RichTextEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  AksiTinjau,
  ajukanVerifikasi,
  BadgeVerifikasi,
  useVerifikatorKonten,
  type StatusVerifikasiUI,
} from "./VerifikasiKonten";

type JenisArsip = { id: string; nama: string };

export type ArsipFormData = {
  judul: string;
  jenisArsipId: string;
  /** Siapa yang boleh melihat & mengunduh entri ini. */
  akses: AksesArsip;
  /** Kapan entri ini diisi admin (dulu hanya "Tanggal"). */
  tanggalUpload: string;
  /** Kapan kegiatannya berlangsung; boleh rentang. */
  tanggalKegiatanMulai: string;
  tanggalKegiatanSelesai: string;
  deskripsiSingkat: string;
  deskripsiLengkap: string;
  alt: string;
  gambarSampulUrl: string;
  /**
   * Format boleh diisi tanpa berkas (arsip lama memang begitu: metadatanya ada,
   * berkasnya belum diunggah). Begitu berkas diunggah, nilainya ikut terisi
   * dari berkas itu.
   */
  berkasFormat: string;
};

function hariIni(): string {
  return keTanggalInput(new Date());
}

function emptyForm(): ArsipFormData {
  return {
    judul: "",
    jenisArsipId: "",
    akses: "PUBLIK_UNDUH_ALUMNI",
    tanggalUpload: hariIni(),
    tanggalKegiatanMulai: "",
    tanggalKegiatanSelesai: "",
    deskripsiSingkat: "",
    deskripsiLengkap: "",
    alt: "",
    gambarSampulUrl: "",
    berkasFormat: "",
  };
}

function keTanggalInput(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

function arsipToFormData(arsip: Arsip): ArsipFormData {
  return {
    judul: arsip.judul,
    jenisArsipId: arsip.jenisArsipId,
    akses: arsip.akses,
    tanggalUpload: keTanggalInput(arsip.tanggalUpload),
    tanggalKegiatanMulai: keTanggalInput(arsip.tanggalKegiatanMulai),
    tanggalKegiatanSelesai: keTanggalInput(arsip.tanggalKegiatanSelesai),
    deskripsiSingkat: arsip.deskripsiSingkat,
    deskripsiLengkap: arsip.deskripsiLengkap ?? "",
    alt: arsip.alt ?? "",
    gambarSampulUrl: arsip.gambarSampulUrl ?? "",
    berkasFormat: arsip.berkasFormat ?? "",
  };
}

function berkasDari(arsip: Arsip): BerkasTerunggah | null {
  if (!arsip.berkasId || !arsip.berkasPenyimpanan) return null;

  return {
    berkasId: arsip.berkasId,
    berkasPenyimpanan: arsip.berkasPenyimpanan,
    berkasNama: arsip.berkasNama ?? "berkas",
    berkasFormat: arsip.berkasFormat ?? "",
    berkasUkuran: arsip.berkasUkuran ?? 0,
  };
}

function mediaDari(media: ArsipMedia[]): MediaGaleri[] {
  return media.map((item) => ({
    id: item.id,
    jenis: item.jenis,
    berkasId: item.berkasId,
    penyimpanan: item.penyimpanan,
    namaAsli: item.namaAsli,
    format: item.format,
    ukuran: item.ukuran,
    caption: item.caption,
  }));
}

type FormErrors = Record<string, string>;

export type ArsipFormProps = {
  mode: "create" | "edit";
  initialData?: Arsip;
  /** Baris galeri dari server; ikut payload saat menyimpan. */
  initialMedia?: ArsipMedia[];
  id?: string;
  /** Dibuka dari antrean verifikasi ("Tinjau") — aktifkan pengaman publish. */
  tinjau?: boolean;
  /** Konten sudah pernah diverifikasi/ditolak (ada snapshot) — ini revisi. */
  revisi?: boolean;
  /** Kunci field yang berbeda dari versi terverifikasi. */
  perubahan?: string[];
};

export function ArsipForm({
  mode,
  initialData,
  initialMedia,
  id,
  tinjau = false,
  revisi = false,
  perubahan = [],
}: ArsipFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ArsipFormData>(
    initialData ? arsipToFormData(initialData) : emptyForm()
  );
  const [berkas, setBerkas] = useState<BerkasTerunggah | null>(
    initialData ? berkasDari(initialData) : null
  );
  const [media, setMedia] = useState<MediaGaleri[]>(
    initialMedia ? mediaDari(initialMedia) : []
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

  const [daftarJenis, setDaftarJenis] = useState<JenisArsip[]>([]);
  const [isLoadingJenis, setIsLoadingJenis] = useState(true);

  const fetchJenis = useCallback(async () => {
    setIsLoadingJenis(true);
    try {
      const response = await fetch("/api/admin/jenis-arsip");
      const result = await response.json();
      if (response.ok) {
        setDaftarJenis(result.data || []);
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

  function updateField<K extends keyof ArsipFormData>(
    key: K,
    value: ArsipFormData[K]
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

  function ubahBerkas(baru: BerkasTerunggah | null) {
    setBerkas(baru);
    setBerubah(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.berkasFormat;
      return next;
    });
    setServerError(null);

    if (baru?.berkasFormat) {
      setForm((prev) => ({ ...prev, berkasFormat: baru.berkasFormat }));
    }
  }

  async function handleSubmit(
    status: StatusArsip,
    opsi?: { ajukan?: boolean }
  ) {
    setServerError(null);

    const parseResult = arsipCreateSchema.safeParse({
      ...form,
      tanggalUpload: form.tanggalUpload || undefined,
      tanggalKegiatanMulai: form.tanggalKegiatanMulai || undefined,
      tanggalKegiatanSelesai: form.tanggalKegiatanSelesai || null,
      jenisArsipId: form.jenisArsipId || undefined,
      deskripsiLengkap: form.deskripsiLengkap || null,
      alt: form.alt || null,
      gambarSampulUrl: form.gambarSampulUrl || null,
      berkasFormat: form.berkasFormat || null,
      berkasId: berkas?.berkasId ?? null,
      berkasPenyimpanan: berkas?.berkasPenyimpanan ?? null,
      berkasNama: berkas?.berkasNama ?? null,
      berkasUkuran: berkas?.berkasUkuran ?? null,
      media: media.map((item) => ({
        jenis: item.jenis,
        berkasId: item.berkasId,
        penyimpanan: item.penyimpanan,
        namaAsli: item.namaAsli,
        format: item.format,
        ukuran: item.ukuran,
        caption: item.caption,
      })),
      akses: form.akses,
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
        mode === "edit" && id ? `/api/admin/arsip/${id}` : "/api/admin/arsip";
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
          setServerError(result?.error?.message || "Gagal menyimpan arsip.");
        }
        return;
      }

      const idTersimpan = (result?.data?.id as string | undefined) ?? id;
      if (opsi?.ajukan && idTersimpan) {
        const aj = await ajukanVerifikasi("arsip", idTersimpan);
        if (!aj.ok) {
          setServerError(aj.pesan ?? "Gagal mengajukan verifikasi.");
          return;
        }
        setVerifikasi("MENUNGGU");
      }

      router.replace("/admin/arsip");
    } catch {
      setServerError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {serverError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
            hint="Dipakai juga sebagai slug halaman detail."
            required
          >
            <input
              id="judul"
              type="text"
              value={form.judul}
              onChange={(e) => updateField("judul", e.target.value)}
              placeholder="Contoh: Kumpulan Kegiatan PBJ 2019–2023"
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 text-[#0f1012] transition-all focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </FormField>

          <FormField
            label="Jenis"
            htmlFor="jenisArsipId"
            berubah={ubah("jenisArsipId")}
            error={errors.jenisArsipId}
            required
          >
            <select
              id="jenisArsipId"
              value={form.jenisArsipId}
              onChange={(e) => updateField("jenisArsipId", e.target.value)}
              disabled={isLoadingJenis}
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 text-[#0f1012] transition-all focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-60"
            >
              <option value="">Pilih jenis</option>
              {daftarJenis.map((jenis) => (
                <option key={jenis.id} value={jenis.id}>
                  {jenis.nama}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Akses"
            htmlFor="akses"
            berubah={ubah("akses")}
            error={errors.akses}
            hint={PILIHAN_AKSES.find((p) => p.value === form.akses)?.hint}
            required
          >
            <select
              id="akses"
              value={form.akses}
              onChange={(e) => updateField("akses", e.target.value as AksesArsip)}
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 text-[#0f1012] transition-all focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              {PILIHAN_AKSES.map((pilihan) => (
                <option key={pilihan.value} value={pilihan.value}>
                  {pilihan.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Tanggal Upload"
            htmlFor="tanggalUpload"
            berubah={ubah("tanggalUpload")}
            error={errors.tanggalUpload}
            hint="Kapan entri ini diisi — terisi otomatis dengan tanggal hari ini."
            required
          >
            <input
              id="tanggalUpload"
              type="date"
              value={form.tanggalUpload}
              onChange={(e) => updateField("tanggalUpload", e.target.value)}
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 text-[#0f1012] transition-all focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              label="Tanggal Kegiatan (mulai)"
              htmlFor="tanggalKegiatanMulai"
              berubah={ubah("tanggalKegiatanMulai")}
              error={errors.tanggalKegiatanMulai}
              hint="Kapan kegiatannya berlangsung."
              required
            >
              <input
                id="tanggalKegiatanMulai"
                type="date"
                value={form.tanggalKegiatanMulai}
                onChange={(e) =>
                  updateField("tanggalKegiatanMulai", e.target.value)
                }
                className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 text-[#0f1012] transition-all focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </FormField>

            <FormField
              label="Tanggal Kegiatan (sampai)"
              htmlFor="tanggalKegiatanSelesai"
              berubah={ubah("tanggalKegiatanSelesai")}
              error={errors.tanggalKegiatanSelesai}
              hint="Kosongkan bila hanya sehari."
            >
              <input
                id="tanggalKegiatanSelesai"
                type="date"
                value={form.tanggalKegiatanSelesai}
                onChange={(e) =>
                  updateField("tanggalKegiatanSelesai", e.target.value)
                }
                className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 text-[#0f1012] transition-all focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
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
              tipe="arsip"
              value={form.deskripsiSingkat}
              onChange={(value) => updateField("deskripsiSingkat", value)}
              rows={3}
              placeholder="Ringkasan satu-dua kalimat untuk daftar arsip"
            />
          </FormField>

          <FormField
            label="Deskripsi Lengkap"
            htmlFor="deskripsiLengkap"
            berubah={ubah("deskripsiLengkap")}
            error={errors.deskripsiLengkap}
            hint="Opsional. Pisahkan paragraf dengan baris kosong."
          >
            <RichTextEditor
              id="deskripsiLengkap"
              tipe="arsip"
              value={form.deskripsiLengkap}
              onChange={(value) => updateField("deskripsiLengkap", value)}
              rows={6}
            />
          </FormField>
        </div>

        <div className="space-y-5">
          <MediaUpload
            value={media}
            onChange={(m) => {
              setMedia(m);
              setBerubah(true);
            }}
            slug={initialData?.slug}
            error={errors.media}
            berubah={ubah("media")}
            catatan="Galeri mengikuti tingkat akses arsip ini — kalau arsipnya khusus alumni, foto/videonya juga hanya bisa dibuka alumni yang sudah masuk. Batas ukuran karena unggahan lewat server."
          />

          <BerkasUpload
            value={berkas}
            onChange={ubahBerkas}
            error={errors.berkasId ?? errors.berkasPenyimpanan}
            berubah={ubah("berkasId")}
            hint="Opsional: berkas dokumen (PDF/DOCX/XLSX). Hanya alumni yang sudah masuk yang bisa membuka berkas ini."
          />

          <FormField
            label="Format Dokumen"
            htmlFor="berkasFormat"
            berubah={ubah("berkasFormat")}
            error={errors.berkasFormat}
            hint="Terisi otomatis dari berkas yang diunggah. Bisa diisi manual untuk arsip yang berkasnya belum ada."
          >
            <input
              id="berkasFormat"
              type="text"
              value={form.berkasFormat}
              onChange={(e) => updateField("berkasFormat", e.target.value)}
              placeholder="pdf"
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 uppercase text-[#0f1012] transition-all focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </FormField>

          <ImageUpload
            label="Gambar Sampul"
            tipe="arsip"
            value={form.gambarSampulUrl}
            onChange={(url) => updateField("gambarSampulUrl", url ?? "")}
            error={errors.gambarSampulUrl}
            berubah={ubah("gambarSampulUrl")}
            hint="Opsional. Tampil di halaman detail arsip."
          />

          <FormField
            label="Teks Alternatif Gambar"
            htmlFor="alt"
            berubah={ubah("alt")}
            error={errors.alt}
            hint="Wajib bila ada gambar sampul."
          >
            <input
              id="alt"
              type="text"
              value={form.alt}
              onChange={(e) => updateField("alt", e.target.value)}
              placeholder="Contoh: Ilustrasi sampul dokumen"
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-3 text-[#0f1012] transition-all focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </FormField>
        </div>
      </fieldset>

      {tinjau ? (
        <div className="space-y-3 border-t border-black/[0.08] pt-4">
          <AksiTinjau
            entitas="arsip"
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

        <div className="flex flex-col items-center justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => handleSubmit("DRAFT")}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.08] px-6 py-3 text-sm font-bold text-[#0f1012] transition-colors hover:bg-black/[0.06] disabled:opacity-70 sm:w-auto"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0071e3] px-6 py-3 text-sm font-bold text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.08] disabled:opacity-70 sm:w-auto"
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005fc1] disabled:opacity-70 sm:w-auto"
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
