"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  PaperPlaneRight,
  Plus,
  ShieldCheck,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { StatusKerjasama } from "@/generated/prisma/enums";
import type { KerjasamaModel as Kerjasama } from "@/generated/prisma/models/Kerjasama";
import { kerjasamaCreateSchema } from "@/lib/validations/kerjasama";
import { labelPerubahan } from "@/lib/verifikasi-diff";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";
import { ChipBerubah, KELAS_FIELD_BERUBAH } from "./ChipBerubah";
import RichTextEditor from "./RichTextEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  AksiTinjau,
  ajukanVerifikasi,
  BadgeVerifikasi,
  useVerifikatorKonten,
  type StatusVerifikasiUI,
} from "./VerifikasiKonten";

export type KerjasamaFormData = {
  organisasi: string;
  programUtama: string;
  profil: string;
  alt: string;
  urutan: string;
  imageUrl: string;
  linkInstagram: string;
  linkTiktok: string;
  email: string;
  contohKegiatan: string[];
};

function emptyForm(): KerjasamaFormData {
  return {
    organisasi: "",
    programUtama: "",
    profil: "",
    alt: "",
    urutan: "0",
    imageUrl: "",
    linkInstagram: "",
    linkTiktok: "",
    email: "",
    contohKegiatan: [""],
  };
}

function kerjasamaToFormData(kerjasama: Kerjasama): KerjasamaFormData {
  return {
    organisasi: kerjasama.organisasi,
    programUtama: kerjasama.programUtama,
    profil: kerjasama.profil,
    alt: kerjasama.alt,
    urutan: String(kerjasama.urutan),
    imageUrl: kerjasama.imageUrl ?? "",
    linkInstagram: kerjasama.linkInstagram ?? "",
    linkTiktok: kerjasama.linkTiktok ?? "",
    email: kerjasama.email ?? "",
    contohKegiatan:
      kerjasama.contohKegiatan.length > 0 ? kerjasama.contohKegiatan : [""],
  };
}

type FormErrors = Record<string, string>;

export type KerjasamaFormProps = {
  mode: "create" | "edit";
  initialData?: Kerjasama;
  id?: string;
  /** Dibuka dari antrean verifikasi ("Tinjau") — aktifkan pengaman publish. */
  tinjau?: boolean;
  /** Konten sudah pernah diverifikasi/ditolak (ada snapshot) — ini revisi. */
  revisi?: boolean;
  /** Kunci field yang berbeda dari versi terverifikasi. */
  perubahan?: string[];
};

export function KerjasamaForm({
  mode,
  initialData,
  id,
  tinjau = false,
  revisi = false,
  perubahan = [],
}: KerjasamaFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<KerjasamaFormData>(
    initialData ? kerjasamaToFormData(initialData) : emptyForm()
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
  const verifikator = useVerifikatorKonten();
  const [verifikasi, setVerifikasi] = useState<StatusVerifikasiUI>(
    (initialData?.verifikasi as StatusVerifikasiUI | undefined) ?? "BELUM"
  );

  function updateField<K extends keyof KerjasamaFormData>(
    key: K,
    value: KerjasamaFormData[K]
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

  function updateContoh(index: number, value: string) {
    setForm((prev) => {
      const berikutnya = [...prev.contohKegiatan];
      berikutnya[index] = value;
      return { ...prev, contohKegiatan: berikutnya };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`contohKegiatan.${index}`];
      delete next.contohKegiatan;
      return next;
    });
    setServerError(null);
    setBerubah(true);
  }

  function tambahContoh() {
    setForm((prev) => ({
      ...prev,
      contohKegiatan: [...prev.contohKegiatan, ""],
    }));
    setBerubah(true);
  }

  function hapusContoh(index: number) {
    setForm((prev) => ({
      ...prev,
      contohKegiatan: prev.contohKegiatan.filter((_, i) => i !== index),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`contohKegiatan.${index}`];
      delete next.contohKegiatan;
      return next;
    });
    setBerubah(true);
  }

  async function handleSubmit(
    status: StatusKerjasama,
    opsi?: { ajukan?: boolean }
  ) {
    setServerError(null);

    const parseResult = kerjasamaCreateSchema.safeParse({
      ...form,
      contohKegiatan: form.contohKegiatan
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      imageUrl: form.imageUrl || null,
      linkInstagram: form.linkInstagram || null,
      linkTiktok: form.linkTiktok || null,
      email: form.email || null,
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
          ? `/api/admin/kerjasama/${id}`
          : "/api/admin/kerjasama";
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
            result?.error?.message || "Gagal menyimpan kerjasama."
          );
        }
        return;
      }

      const idTersimpan = (result?.data?.id as string | undefined) ?? id;
      if (opsi?.ajukan && idTersimpan) {
        const aj = await ajukanVerifikasi("kerjasama", idTersimpan);
        if (!aj.ok) {
          setServerError(aj.pesan ?? "Gagal mengajukan verifikasi.");
          return;
        }
        setVerifikasi("MENUNGGU");
      }

      router.replace("/admin/kerjasama");
    } catch {
      setServerError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  const pesanContohKegiatan =
    errors.contohKegiatan ?? errors["contohKegiatan.0"];

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
            label="Nama Organisasi"
            htmlFor="organisasi"
            berubah={ubah("organisasi")}
            error={errors.organisasi}
            hint="Dipakai sebagai judul kartu dan slug halaman detail."
            required
          >
            <input
              id="organisasi"
              type="text"
              value={form.organisasi}
              onChange={(e) => updateField("organisasi", e.target.value)}
              placeholder="Contoh: Ruang Berbagi"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Program Utama"
            htmlFor="programUtama"
            berubah={ubah("programUtama")}
            error={errors.programUtama}
            hint="Program/kegiatan utama mitra — tampil sebagai label di kartu."
            required
          >
            <RichTextEditor
              id="programUtama"
              tipe="kerjasama"
              value={form.programUtama}
              onChange={(value) => updateField("programUtama", value)}
              rows={2}
              placeholder="Contoh: Sinau Aksara Jawa"
            />
          </FormField>

          <FormField
            label="Profil"
            htmlFor="profil"
            berubah={ubah("profil")}
            error={errors.profil}
            required
          >
            <RichTextEditor
              id="profil"
              tipe="kerjasama"
              value={form.profil}
              onChange={(value) => updateField("profil", value)}
              rows={5}
              placeholder="Deskripsi singkat organisasi mitra"
            />
          </FormField>

          <FormField
            label="Urutan"
            htmlFor="urutan"
            berubah={ubah("urutan")}
            error={errors.urutan}
            hint="Angka lebih kecil tampil lebih dulu di section publik."
            required
          >
            <input
              id="urutan"
              type="number"
              min={0}
              max={999}
              value={form.urutan}
              onChange={(e) => updateField("urutan", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <div className={`space-y-3 ${ubah("contohKegiatan") ? KELAS_FIELD_BERUBAH : ""}`}>
            <div className="flex items-center justify-between">
              <span
                className={`flex items-center gap-2 text-sm font-semibold ${
                  ubah("contohKegiatan") ? "text-red-700" : "text-[#0f1012]"
                }`}
              >
                <span>
                  Contoh Kegiatan <span className="text-red-500">*</span>
                </span>
                {ubah("contohKegiatan") && <ChipBerubah />}
              </span>
              <button
                type="button"
                onClick={tambahContoh}
                disabled={form.contohKegiatan.length >= 10}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3]/10 text-[#0071e3] text-xs font-bold hover:bg-[#0071e3]/[0.18] disabled:opacity-50 transition-colors"
              >
                <Plus weight="bold" />
                Tambah baris
              </button>
            </div>

            {form.contohKegiatan.map((nilai, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  aria-label={`Contoh kegiatan ${index + 1}`}
                  value={nilai}
                  onChange={(e) => updateContoh(index, e.target.value)}
                  placeholder="Contoh: Pelatihan penulisan tembang daerah"
                  className="flex-1 px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                />
                <button
                  type="button"
                  onClick={() => hapusContoh(index)}
                  disabled={form.contohKegiatan.length <= 1}
                  className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors"
                  aria-label={`Hapus contoh kegiatan ${index + 1}`}
                >
                  <Trash weight="bold" />
                </button>
              </div>
            ))}

            {pesanContohKegiatan && (
              <p className="text-xs text-red-600 font-medium">
                {pesanContohKegiatan}
              </p>
            )}
            <p className="text-xs text-[#8f8f8f]">
              Baris kosong diabaikan saat disimpan. Maksimal 10 baris.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <ImageUpload
            label="Gambar"
            tipe="kerjasama"
            value={form.imageUrl}
            onChange={(url) => updateField("imageUrl", url ?? "")}
            error={errors.imageUrl}
            berubah={ubah("imageUrl")}
            hint="Upload gambar terlebih dahulu. Opsional."
          />

          <FormField
            label="Teks Alternatif Gambar"
            htmlFor="alt"
            berubah={ubah("alt")}
            error={errors.alt}
            hint="Opsional. Deskripsi gambar untuk pembaca layar."
          >
            <input
              id="alt"
              type="text"
              value={form.alt}
              onChange={(e) => updateField("alt", e.target.value)}
              placeholder="Contoh: Alumni berkumpul dalam kegiatan kolaboratif"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <div className="space-y-5 rounded-2xl border border-black/[0.08] bg-[#fdfdfd] p-5">
            <div>
              <h2 className="text-sm font-bold text-[#0f1012]">
                Hubungi Kami
              </h2>
              <p className="mt-1 text-xs text-[#8f8f8f]">
                Kanal kontak mitra di halaman detail. Semua opsional — kanal yang
                kosong tidak ditampilkan, dan bloknya hilang bila ketiganya
                kosong.
              </p>
            </div>

            <FormField
              label="Instagram"
              htmlFor="linkInstagram"
              berubah={ubah("linkInstagram")}
              error={errors.linkInstagram}
              hint="Boleh @username atau URL lengkap."
            >
              <input
                id="linkInstagram"
                type="text"
                value={form.linkInstagram}
                onChange={(e) => updateField("linkInstagram", e.target.value)}
                placeholder="@ruangberbagi atau https://instagram.com/..."
                className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </FormField>

            <FormField
              label="TikTok"
              htmlFor="linkTiktok"
              berubah={ubah("linkTiktok")}
              error={errors.linkTiktok}
              hint="Boleh @username atau URL lengkap."
            >
              <input
                id="linkTiktok"
                type="text"
                value={form.linkTiktok}
                onChange={(e) => updateField("linkTiktok", e.target.value)}
                placeholder="@ruangberbagi atau https://tiktok.com/@..."
                className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </FormField>

            <FormField
              label="Email"
              htmlFor="email"
              berubah={ubah("email")}
              error={errors.email}
              hint="Alamat email yang bisa dihubungi."
            >
              <input
                id="email"
                type="text"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="nama@contoh.or.id"
                className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </FormField>
          </div>
        </div>
      </fieldset>

      {tinjau ? (
        <div className="space-y-3 border-t border-black/[0.08] pt-4">
          <AksiTinjau
            entitas="kerjasama"
            id={id ?? ""}
            nama={form.organisasi}
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
