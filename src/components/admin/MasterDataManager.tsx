"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash, type Icon } from "@phosphor-icons/react";
import { DataTable } from "./DataTable";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import { TableSkeleton } from "./TableSkeleton";
import { useIzin } from "./IzinProvider";
import { AKSI, type ModulSlug } from "@/lib/permission";

export type MasterDataConfig = {
  endpoint: string;
  /** Modul izin yang menggerbangi halaman master data ini. */
  modul: ModulSlug;
  title: string;
  description: string;
  fieldName: string;
  fieldLabel: string;
  placeholder: string;
  icon: Icon;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel: string;
  confirmTitle: string;
  confirmMessage: string;
  loadErrorMessage: string;
  saveErrorMessage: string;
  deleteErrorMessage: string;
};

type MasterItem = {
  id: string;
  nama: string;
};

export function MasterDataManager({ config }: { config: MasterDataConfig }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nama, setNama] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { endpoint, fieldName } = config;
  const { boleh } = useIzin();
  const bisaTambah = boleh(config.modul, AKSI.TAMBAH);
  const bisaUbah = boleh(config.modul, AKSI.UBAH);
  const bisaHapus = boleh(config.modul, AKSI.HAPUS);
  // Form dipakai untuk tambah dan ubah; tampil bila salah satu diizinkan.
  const tampilkanForm = editingId ? bisaUbah : bisaTambah;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint);
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message || config.loadErrorMessage);
        return;
      }
      setData(
        (result.data || []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          nama: String(row[fieldName] ?? ""),
        }))
      );
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, fieldName, config.loadErrorMessage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function resetForm() {
    setNama("");
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    if (!nama.trim()) {
      setError(`${config.fieldLabel} wajib diisi`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = editingId ? `${endpoint}/${editingId}` : endpoint;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldName]: nama.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || config.saveErrorMessage);
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

  function startEdit(item: MasterItem) {
    setNama(item.nama);
    setEditingId(item.id);
    setError(null);
    inputRef.current?.focus();
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || config.deleteErrorMessage);
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
      key: "nama",
      header: config.fieldLabel,
      cell: (row: MasterItem) => (
        <span className="font-semibold text-[#0f1012]">
          {row.nama}
        </span>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "w-32",
      cell: (row: MasterItem) =>
        bisaUbah || bisaHapus ? (
          <div className="flex items-center gap-2">
            {bisaUbah && (
              <button
                type="button"
                onClick={() => startEdit(row)}
                className="p-2 rounded-lg bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.18] transition-colors"
                aria-label={`Ubah ${row.nama}`}
              >
                <Pencil weight="bold" />
              </button>
            )}
            {bisaHapus && (
              <button
                type="button"
                onClick={() => setDeleteId(row.id)}
                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                aria-label={`Hapus ${row.nama}`}
              >
                <Trash weight="bold" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-[#8f8f8f]">—</span>
        ),
    },
  ];

  const IconComponent = config.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
          {config.title}
        </h1>
        <p className="text-[#5e5e5e] text-sm mt-1">
          {config.description}
        </p>
      </div>

      {/* Form */}
      {tampilkanForm && (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-[#fdfdfd] border border-black/[0.08]"
      >
        <div className="relative flex-1">
          <IconComponent
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
          />
          <label htmlFor="master-data-nama" className="sr-only">
            {config.fieldLabel}
          </label>
          <input
            id="master-data-nama"
            ref={inputRef}
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder={config.placeholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
          />
        </div>
        <div className="flex gap-2">
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
              : config.addLabel}
          </button>
        </div>
      </form>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchData}
            className="font-bold hover:underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : data.length === 0 ? (
        <EmptyState
          title={config.emptyTitle}
          description={config.emptyDescription}
          actionLabel={config.emptyActionLabel}
          onAction={() => inputRef.current?.focus()}
          showAction={bisaTambah}
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
        title={config.confirmTitle}
        message={config.confirmMessage}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
