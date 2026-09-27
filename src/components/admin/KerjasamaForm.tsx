"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  PaperPlaneRight,
  Plus,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { StatusKerjasama } from "@/generated/prisma/enums";
import type { KerjasamaModel as Kerjasama } from "@/generated/prisma/models/Kerjasama";
import { kerjasamaCreateSchema } from "@/lib/validations/kerjasama";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";

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
};

export function KerjasamaForm({ mode, initialData, id }: KerjasamaFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<KerjasamaFormData>(
    initialData ? kerjasamaToFormData(initialData) : emptyForm()
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
  }

  function tambahContoh() {
    setForm((prev) => ({
      ...prev,
      contohKegiatan: [...prev.contohKegiatan, ""],
    }));
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
  }

  async function handleSubmit(status: StatusKerjasama) {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <FormField
            label="Nama Organisasi"
            htmlFor="organisasi"
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
            error={errors.programUtama}
            hint="Program/kegiatan utama mitra — tampil sebagai label di kartu."
            required
          >
            <input
              id="programUtama"
              type="text"
              value={form.programUtama}
              onChange={(e) => updateField("programUtama", e.target.value)}
              placeholder="Contoh: Sinau Aksara Jawa"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Profil"
            htmlFor="profil"
            error={errors.profil}
            required
          >
            <textarea
              id="profil"
              value={form.profil}
              onChange={(e) => updateField("profil", e.target.value)}
              placeholder="Deskripsi singkat organisasi mitra"
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all resize-none"
            />
          </FormField>

          <FormField
            label="Urutan"
            htmlFor="urutan"
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0f1012]">
                Contoh Kegiatan <span className="text-red-500">*</span>
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
            hint="Upload gambar terlebih dahulu. Wajib untuk publish."
          />

          <FormField
            label="Teks Alternatif Gambar"
            htmlFor="alt"
            error={errors.alt}
            hint="Deskripsi gambar untuk pembaca layar."
            required
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
