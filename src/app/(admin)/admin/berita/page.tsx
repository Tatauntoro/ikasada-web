"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MagnifyingGlass, Faders, Pencil, Trash } from "@phosphor-icons/react";
import Image from "next/image";
import { StatusBerita } from "@/generated/prisma/enums";
import type { BeritaModel } from "@/generated/prisma/models/Berita";
import type { JenisBeritaModel as JenisBerita } from "@/generated/prisma/models/JenisBerita";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { formatTanggalWIB } from "@/lib/format";

type Berita = BeritaModel & { jenisBerita: JenisBerita };

const STATUS_OPTIONS = Object.values(StatusBerita);

type Filters = {
  search: string;
  status: string;
  jenisBeritaId: string;
  page: number;
};

type ListResponse = {
  success: boolean;
  data: Berita[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function BeritaListPage() {
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    jenisBeritaId: "",
    page: 1,
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  const [data, setData] = useState<Berita[]>([]);
  const [meta, setMeta] = useState<ListResponse["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(filters.page));
    params.set("limit", "12");
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (filters.status) params.set("status", filters.status);
    if (filters.jenisBeritaId) params.set("jenisBeritaId", filters.jenisBeritaId);

    try {
      const response = await fetch(`/api/admin/berita?${params.toString()}`);
      const result: ListResponse = await response.json();

      if (!response.ok) {
        const errorMessage =
          (result as unknown as { error?: { message?: string } })?.error
            ?.message || "Gagal memuat data berita";
        setError(errorMessage);
        return;
      }

      setData(result.data);
      setMeta(result.meta);
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [filters.page, filters.status, filters.jenisBeritaId, debouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? prev.page : 1,
    }));
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/berita/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result?.error?.message || "Gagal menghapus berita");
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
      key: "thumbnail",
      header: "Gambar",
      cell: (row: Berita) =>
        row.gambarUrl ? (
          <div className="relative w-16 h-10 rounded-lg overflow-hidden">
            <Image
              src={row.gambarUrl}
              alt={row.judul}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        ) : (
          <div className="w-16 h-10 rounded-lg bg-[#f2f2f4] flex items-center justify-center text-xs text-[#8f8f8f]">
            -
          </div>
        ),
    },
    {
      key: "judul",
      header: "Judul",
      cell: (row: Berita) => (
        <span className="font-semibold text-[#0f1012]">{row.judul}</span>
      ),
    },
    {
      key: "tanggal",
      header: "Tanggal",
      cell: (row: Berita) => formatTanggalWIB(row.tanggal),
    },
    {
      key: "tipe",
      header: "Tipe",
      cell: (row: Berita) => row.jenisBerita.nama,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: Berita) => <StatusBadge status={row.status} />,
    },
    {
      key: "aksi",
      header: "Aksi",
      cell: (row: Berita) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/berita/${row.id}/edit`}
            className="p-2 rounded-lg bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.18] transition-colors"
            aria-label="Edit"
          >
            <Pencil weight="bold" />
          </Link>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-normal font-serif text-[#0f1012]">
            Daftar Berita
          </h1>
          <p className="text-[#5e5e5e] text-sm mt-1">
            Kelola berita IKASADA yang akan ditampilkan di halaman publik.
          </p>
        </div>
        <Link
          href="/admin/berita/tambah"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] text-white font-bold text-sm hover:bg-[#005fc1] transition-colors"
        >
          <Plus weight="bold" />
          Tambah Berita
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
          />
          <input
            type="text"
            aria-label="Cari judul berita"
            placeholder="Cari judul berita..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] placeholder:text-[#8f8f8f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
          />
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Faders
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
            />
            <select
              aria-label="Filter status"
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none"
            >
              <option value="">Semua Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Faders
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
            />
            <select
              aria-label="Filter tipe berita"
              value={filters.jenisBeritaId}
              onChange={(e) => updateFilter("jenisBeritaId", e.target.value)}
              disabled={isLoadingJenis}
              className="pl-10 pr-8 py-2.5 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none disabled:opacity-60"
            >
              <option value="">Semua Tipe</option>
              {jenisList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(row) => row.id}
          emptyState={
            <EmptyState
              title="Belum ada berita"
              description="Tambahkan berita pertama untuk ditampilkan di portal."
              actionLabel="Tambah Berita"
              onAction={() => router.push("/admin/berita/tambah")}
            />
          }
        />
      )}

      {/* Pagination */}
      {meta && (
        <AdminPagination
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={(page) => updateFilter("page", page)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Hapus Berita"
        message="Apakah Anda yakin ingin menghapus berita ini? Data tidak akan hilang permanen, tapi tidak akan ditampilkan lagi."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
