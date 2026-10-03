"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk, PaperPlaneRight, Warning } from "@phosphor-icons/react";
import { StatusBerita } from "@/generated/prisma/enums";
import type { BeritaModel as Berita } from "@/generated/prisma/models/Berita";
import type { JenisBeritaModel as JenisBerita } from "@/generated/prisma/models/JenisBerita";
import { beritaCreateSchema } from "@/lib/validations/berita";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";

export type BeritaFormData = {
  judul: string;
  jenisBeritaId: string;
  tanggal: string;
  deskripsiSingkat: string;
  deskripsiLengkap: string;
  gambarUrl: string;
};

function emptyForm(): BeritaFormData {
  return {
    judul: "",
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
  initialData?: Berita;
  id?: string;
};

export function BeritaForm({ mode, initialData, id }: BeritaFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<BeritaFormData>(
    initialData ? beritaToFormData(initialData) : emptyForm()
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
  }

  async function handleSubmit(status: StatusBerita) {
    setServerError(null);

    const parseResult = beritaCreateSchema.safeParse({
      ...form,
      tanggal: form.tanggal || undefined,
      jenisBeritaId: form.jenisBeritaId || undefined,
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <FormField label="Judul" htmlFor="judul" error={errors.judul} required>
            <input
              id="judul"
              type="text"
              value={form.judul}
              onChange={(e) => updateField("judul", e.target.value)}
              placeholder="Judul berita"
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Tipe Berita"
              htmlFor="jenisBeritaId"
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
            error={errors.deskripsiSingkat}
            required
          >
            <textarea
              id="deskripsiSingkat"
              value={form.deskripsiSingkat}
              onChange={(e) => updateField("deskripsiSingkat", e.target.value)}
              placeholder="Ringkasan singkat berita"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all resize-none"
            />
          </FormField>

          <FormField
            label="Deskripsi Lengkap"
            htmlFor="deskripsiLengkap"
            error={errors.deskripsiLengkap}
            hint="Isi berita untuk halaman detail (opsional)."
          >
            <textarea
              id="deskripsiLengkap"
              value={form.deskripsiLengkap}
              onChange={(e) => updateField("deskripsiLengkap", e.target.value)}
              placeholder="Isi berita lengkap (opsional)"
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all resize-none"
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
            hint="Upload gambar terlebih dahulu. Wajib untuk publish."
          />
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
