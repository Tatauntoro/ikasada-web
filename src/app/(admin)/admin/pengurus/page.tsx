"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash } from "@phosphor-icons/react";
import Image from "next/image";
import type { PengurusModel as Pengurus } from "@/generated/prisma/models/Pengurus";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { FormField } from "@/components/admin/FormField";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { pengurusCreateSchema } from "@/lib/validations/pengurus";
import { getInitials } from "@/lib/format";

type FormData = {
  nama: string;
  jabatan: string;
  angkatan: string;
  ket: string;
  fotoUrl: string;
  urutan: string;
};

function emptyForm(): FormData {
  return {
    nama: "",
    jabatan: "",
    angkatan: "",
    ket: "",
    fotoUrl: "",
    urutan: "0",
  };
}

function pengurusToForm(p: Pengurus): FormData {
  return {
    nama: p.nama,
    jabatan: p.jabatan,
    angkatan: p.angkatan ?? "",
    ket: p.ket ?? "",
    fotoUrl: p.fotoUrl ?? "",
    urutan: String(p.urutan),
  };
}

export default function PengurusPage() {
  const [data, setData] = useState<Pengurus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/pengurus?limit=100");
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message || "Gagal memuat data pengurus");
        return;
      }
      setData(result.data || []);
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setFieldErrors({});
  }

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    setError(null);
    setFieldErrors({});

    const parsed = pengurusCreateSchema.safeParse({
      ...form,
      fotoUrl: form.fotoUrl.trim() || null,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? "form";
        errors[key] = issue.message;
      });
      setFieldErrors(errors);
      setError("Mohon periksa kembali isian form.");
      return;
    }

    setIsSaving(true);

    const payload = parsed.data;

    try {
      const url = editingId
        ? `/api/admin/pengurus/${editingId}`
        : "/api/admin/pengurus";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result?.error?.code === "VALIDATION_ERROR" && result?.error?.fields) {
          setFieldErrors(result.error.fields);
        }
        setError(result?.error?.message || "Gagal menyimpan pengurus");
        return;
      }

      resetForm();
      fetchData();
    } catch {
      setError("Terjadi kesalahan jaringan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(p: Pengurus) {
    setForm(pengurusToForm(p));
    setEditingId(p.id);
    setError(null);
    setFieldErrors({});
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/pengurus/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || "Gagal menghapus pengurus");
        return;
      }

      setDeleteId(null);
      fetchData();
    } catch {
      setError("Terjadi kesalahan jaringan saat menghapus.");
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    {
      key: "foto",
      header: "Foto",
      className: "w-20",
      cell: (row: Pengurus) =>
        row.fotoUrl ? (
          <div className="relative w-12 h-12 rounded-full overflow-hidden border border-black/[0.08]">
            <Image
              src={row.fotoUrl}
              alt={row.nama}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-black/[0.05] text-[#0071e3] flex items-center justify-center text-xs font-bold">
            {getInitials(row.nama)}
          </div>
        ),
    },
    {
      key: "nama",
      header: "Nama",
      cell: (row: Pengurus) => (
        <span className="font-semibold text-[#0f1012]">
          {row.nama}
        </span>
      ),
    },
    {
      key: "jabatan",
      header: "Jabatan",
      cell: (row: Pengurus) => row.jabatan,
    },
    {
      key: "angkatan",
      header: "Angkatan",
      className: "hidden sm:table-cell",
      cell: (row: Pengurus) => row.angkatan || "-",
    },
    {
      key: "urutan",
      header: "Urutan",
      className: "w-24",
      cell: (row: Pengurus) => row.urutan,
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "w-32",
      cell: (row: Pengurus) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => startEdit(row)}
            className="p-2 rounded-lg bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.18] transition-colors"
            aria-label="Edit"
          >
            <Pencil weight="bold" />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            aria-label="Hapus"
          >
            <Trash weight="bold" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          Pengurus Inti
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          Kelola daftar pengurus inti yang ditampilkan di halaman publik.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-2xl bg-[#fdfdfd] border border-black/[0.08] space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nama" htmlFor="nama" required error={fieldErrors.nama}>
            <input
              id="nama"
              type="text"
              value={form.nama}
              onChange={(e) => updateForm("nama", e.target.value)}
              placeholder="Nama lengkap pengurus"
              className={`w-full px-4 py-2.5 rounded-xl bg-[#fdfdfd] border text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all ${
                fieldErrors.nama
                  ? "border-red-300 focus:ring-red-500"
                  : "border-black/[0.08]"
              }`}
            />
          </FormField>

          <FormField label="Jabatan" htmlFor="jabatan" required error={fieldErrors.jabatan}>
            <input
              id="jabatan"
              type="text"
              value={form.jabatan}
              onChange={(e) => updateForm("jabatan", e.target.value)}
              placeholder="Jabatan di kepengurusan"
              className={`w-full px-4 py-2.5 rounded-xl bg-[#fdfdfd] border text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all ${
                fieldErrors.jabatan
                  ? "border-red-300 focus:ring-red-500"
                  : "border-black/[0.08]"
              }`}
            />
          </FormField>

          <FormField label="Angkatan" htmlFor="angkatan" error={fieldErrors.angkatan}>
            <input
              id="angkatan"
              type="text"
              value={form.angkatan}
              onChange={(e) => updateForm("angkatan", e.target.value)}
              placeholder="Contoh: Sastra Jawa 1998"
              className={`w-full px-4 py-2.5 rounded-xl bg-[#fdfdfd] border text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all ${
                fieldErrors.angkatan
                  ? "border-red-300 focus:ring-red-500"
                  : "border-black/[0.08]"
              }`}
            />
          </FormField>

          <FormField label="Urutan Tampil" htmlFor="urutan" error={fieldErrors.urutan}>
            <input
              id="urutan"
              type="number"
              value={form.urutan}
              onChange={(e) => updateForm("urutan", e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl bg-[#fdfdfd] border text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all ${
                fieldErrors.urutan
                  ? "border-red-300 focus:ring-red-500"
                  : "border-black/[0.08]"
              }`}
            />
          </FormField>
        </div>

        <FormField label="Keterangan" htmlFor="ket" error={fieldErrors.ket}>
          <input
            id="ket"
            type="text"
            value={form.ket}
            onChange={(e) => updateForm("ket", e.target.value)}
            placeholder="Profesi singkat atau keterangan lain"
            className={`w-full px-4 py-2.5 rounded-xl bg-[#fdfdfd] border text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all ${
              fieldErrors.ket
                ? "border-red-300 focus:ring-red-500"
                : "border-black/[0.08]"
            }`}
          />
        </FormField>

        <ImageUpload
          label="Foto Profil"
          tipe="alumni"
          value={form.fotoUrl}
          onChange={(url) => updateForm("fotoUrl", url ?? "")}
          error={fieldErrors.fotoUrl}
          hint="Upload foto terlebih dahulu. Disarankan foto berbentuk persegi."
        />

        <div className="flex gap-2 pt-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl border border-black/[0.08] text-[#0f1012] font-semibold text-sm hover:bg-black/[0.06] transition-colors"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#0071e3] text-white font-bold text-sm hover:bg-[#005fc1] transition-colors disabled:opacity-70 inline-flex items-center gap-2"
          >
            <Plus weight="bold" />
            {isSaving
              ? "Menyimpan..."
              : editingId
              ? "Simpan Perubahan"
              : "Tambah Pengurus"}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="font-bold hover:underline">
            Coba lagi
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : data.length === 0 ? (
        <EmptyState
          title="Belum ada pengurus"
          description="Tambahkan data pengurus inti pertama untuk ditampilkan di halaman publik."
          actionLabel="Tambah Pengurus"
          onAction={() => {
            const input = document.querySelector<HTMLInputElement>("#nama");
            input?.focus();
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(row) => row.id}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Hapus Pengurus"
        message="Apakah Anda yakin ingin menghapus data pengurus ini?"
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
