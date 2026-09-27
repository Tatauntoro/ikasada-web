"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  PaperPlaneRight,
  Plus,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import {
  ProgramStudi,
  StatusAlumni,
} from "@/generated/prisma/enums";
import type { AlumniModel as Alumni } from "@/generated/prisma/models/Alumni";
import type { SektorIndustriModel as SektorIndustri } from "@/generated/prisma/models/SektorIndustri";
import { alumniCreateSchema } from "@/lib/validations/alumni";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";

const CURRENT_YEAR = new Date().getFullYear();
const TAHUN_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1960 + 1 },
  (_, i) => CURRENT_YEAR - i
);

type SosmedItem = {
  platform: string;
  url: string;
};

export type AlumniFormData = {
  namaLengkap: string;
  gelar: string;
  fotoUrl: string;
  angkatan: string;
  programStudi: ProgramStudi | "";
  profesi: string;
  instansi: string;
  sektorIndustriId: string;
  email: string;
  noWhatsapp: string;
  linkInstagram: string;
  linkSosmedLain: SosmedItem[];
};

function emptyForm(): AlumniFormData {
  return {
    namaLengkap: "",
    gelar: "",
    fotoUrl: "",
    angkatan: String(CURRENT_YEAR),
    programStudi: "JAWA",
    profesi: "",
    instansi: "",
    sektorIndustriId: "",
    email: "",
    noWhatsapp: "",
    linkInstagram: "",
    linkSosmedLain: [],
  };
}

function alumniToFormData(alumni: Alumni): AlumniFormData {
  const sosmed: SosmedItem[] = Array.isArray(alumni.linkSosmedLain)
    ? (alumni.linkSosmedLain as SosmedItem[])
    : [];

  return {
    namaLengkap: alumni.namaLengkap,
    gelar: alumni.gelar ?? "",
    fotoUrl: alumni.fotoUrl ?? "",
    angkatan: String(alumni.angkatan),
    programStudi: alumni.programStudi,
    profesi: alumni.profesi,
    instansi: alumni.instansi ?? "",
    sektorIndustriId: alumni.sektorIndustriId,
    email: alumni.email ?? "",
    noWhatsapp: alumni.noWhatsapp ?? "",
    linkInstagram: alumni.linkInstagram ?? "",
    linkSosmedLain: sosmed,
  };
}

type FormErrors = Record<string, string>;

export type AlumniFormProps = {
  mode: "create" | "edit";
  initialData?: Alumni;
  id?: string;
};

export function AlumniForm({ mode, initialData, id }: AlumniFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AlumniFormData>(
    initialData ? alumniToFormData(initialData) : emptyForm()
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [sektorList, setSektorList] = useState<SektorIndustri[]>([]);
  const [isLoadingSektor, setIsLoadingSektor] = useState(true);

  const fetchSektor = useCallback(async () => {
    setIsLoadingSektor(true);
    try {
      const response = await fetch("/api/admin/sektor-industri");
      const result = await response.json();
      if (response.ok) {
        setSektorList(result.data || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingSektor(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSektor();
  }, [fetchSektor]);

  function updateField<K extends keyof AlumniFormData>(
    key: K,
    value: AlumniFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setServerError(null);
  }

  function updateSosmed(index: number, key: keyof SosmedItem, value: string) {
    setForm((prev) => {
      const next = [...prev.linkSosmedLain];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, linkSosmedLain: next };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`linkSosmedLain.${index}.${key}`];
      return next;
    });
  }

  function addSosmed() {
    setForm((prev) => ({
      ...prev,
      linkSosmedLain: [...prev.linkSosmedLain, { platform: "", url: "" }],
    }));
  }

  function removeSosmed(index: number) {
    setForm((prev) => ({
      ...prev,
      linkSosmedLain: prev.linkSosmedLain.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(status: StatusAlumni) {
    setServerError(null);

    const parseResult = alumniCreateSchema.safeParse({
      ...form,
      angkatan: Number(form.angkatan),
      programStudi: form.programStudi || undefined,
      sektorIndustriId: form.sektorIndustriId || undefined,
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
        mode === "edit" && id ? `/api/admin/alumni/${id}` : "/api/admin/alumni";
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
            result?.error?.message || "Gagal menyimpan data alumni."
          );
        }
        return;
      }

      router.replace("/admin/alumni");
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
            label="Nama Lengkap"
            htmlFor="namaLengkap"
            error={errors.namaLengkap}
            required
          >
            <input
              id="namaLengkap"
              type="text"
              value={form.namaLengkap}
              onChange={(e) => updateField("namaLengkap", e.target.value)}
              placeholder="Nama lengkap alumni"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Gelar"
            htmlFor="gelar"
            error={errors.gelar}
            hint="Opsional. Contoh: S.T., M.B.A."
          >
            <input
              id="gelar"
              type="text"
              value={form.gelar}
              onChange={(e) => updateField("gelar", e.target.value)}
              placeholder="Gelar"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Angkatan"
              htmlFor="angkatan"
              error={errors.angkatan}
              required
            >
              <select
                id="angkatan"
                value={form.angkatan}
                onChange={(e) => updateField("angkatan", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
              >
                {TAHUN_OPTIONS.map((t) => (
                  <option key={t} value={String(t)}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>

          </div>

          <FormField
            label="Profesi"
            htmlFor="profesi"
            error={errors.profesi}
            required
          >
            <input
              id="profesi"
              type="text"
              value={form.profesi}
              onChange={(e) => updateField("profesi", e.target.value)}
              placeholder="Profesi saat ini"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Instansi"
            htmlFor="instansi"
            error={errors.instansi}
            hint="Opsional. Nama perusahaan atau organisasi."
          >
            <input
              id="instansi"
              type="text"
              value={form.instansi}
              onChange={(e) => updateField("instansi", e.target.value)}
              placeholder="Instansi"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Sektor Industri"
            htmlFor="sektorIndustriId"
            error={errors.sektorIndustriId}
            required
          >
            <select
              id="sektorIndustriId"
              value={form.sektorIndustriId}
              onChange={(e) =>
                updateField("sektorIndustriId", e.target.value)
              }
              disabled={isLoadingSektor}
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all disabled:opacity-60"
            >
              <option value="">
                {isLoadingSektor ? "Memuat..." : "Pilih sektor industri"}
              </option>
              {sektorList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.namaSektor}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="space-y-5">
          <ImageUpload
            label="Foto Alumni"
            tipe="alumni"
            value={form.fotoUrl}
            onChange={(url) => updateField("fotoUrl", url ?? "")}
            error={errors.fotoUrl}
            hint="Opsional. Upload foto terbaik alumni."
          />

          <FormField
            label="Email"
            htmlFor="email"
            error={errors.email}
            hint="Opsional. Email kontak alumni."
          >
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="No. WhatsApp"
            htmlFor="noWhatsapp"
            error={errors.noWhatsapp}
            hint="Opsional. Boleh 08xx atau +62, akan dirapikan otomatis."
          >
            <input
              id="noWhatsapp"
              type="text"
              value={form.noWhatsapp}
              onChange={(e) => updateField("noWhatsapp", e.target.value)}
              placeholder="0812-3456-7890"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <FormField
            label="Link Instagram"
            htmlFor="linkInstagram"
            error={errors.linkInstagram}
            hint="Opsional. Boleh username (@nama) atau URL penuh."
          >
            <input
              id="linkInstagram"
              type="text"
              value={form.linkInstagram}
              onChange={(e) => updateField("linkInstagram", e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#0f1012]">
              Link Sosial Media Lain
            </label>
            {form.linkSosmedLain.map((item, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-black/[0.08] bg-[#f2f2f4]"
              >
                <input
                  type="text"
                  value={item.platform}
                  onChange={(e) =>
                    updateSosmed(index, "platform", e.target.value)
                  }
                  placeholder="Platform (mis. LinkedIn)"
                  className="flex-1 px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                />
                <input
                  type="text"
                  value={item.url}
                  onChange={(e) => updateSosmed(index, "url", e.target.value)}
                  placeholder="https://..."
                  className="flex-[2] px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                />
                <button
                  type="button"
                  onClick={() => removeSosmed(index)}
                  className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="Hapus"
                >
                  <Trash weight="bold" />
                </button>
              </div>
            ))}
            {errors["linkSosmedLain"] && (
              <p className="text-xs text-red-600 font-medium">
                {errors["linkSosmedLain"]}
              </p>
            )}
            <button
              type="button"
              onClick={addSosmed}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/[0.08] text-[#0f1012] font-semibold text-sm hover:bg-black/[0.06] transition-colors"
            >
              <Plus weight="bold" />
              Tambah Sosmed
            </button>
          </div>

        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-black/[0.08]">
        <button
          type="button"
          onClick={() => handleSubmit("HIDDEN")}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl border border-black/[0.08] text-[#0f1012] font-bold text-sm hover:bg-black/[0.06] disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
        >
          <FloppyDisk weight="bold" />
          {isLoading ? "Menyimpan..." : "Simpan sebagai Hidden"}
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
