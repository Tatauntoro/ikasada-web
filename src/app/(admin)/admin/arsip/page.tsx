"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Faders,
  MagnifyingGlass,
  Pencil,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { StatusArsip } from "@/generated/prisma/enums";
import type { ArsipModel as Arsip } from "@/generated/prisma/models/Arsip";
import type { JenisArsipModel as JenisArsip } from "@/generated/prisma/models/JenisArsip";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { formatPeriodeKegiatan, formatUkuranBerkas } from "@/lib/format";
import { labelAkses } from "@/lib/akses-arsip";

type ArsipDenganJenis = Arsip & {
  jenisArsip: JenisArsip;
  _count: { media: number };
};

const STATUS_OPTIONS = Object.values(StatusArsip);

type Filters = {
  search: string;
  jenisId: string;
  status: string;
  tahun: string;
  page: number;
};

type ListResponse = {
  success: boolean;
  data: ArsipDenganJenis[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function ArsipListPage() {
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    jenisId: "",
    status: "",
    tahun: "",
    page: 1,
  });
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  const [data, setData] = useState<ArsipDenganJenis[]>([]);
  const [meta, setMeta] = useState<ListResponse["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(filters.page));
    params.set("limit", "12");
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (filters.jenisId) params.set("jenisId", filters.jenisId);
    if (filters.status) params.set("status", filters.status);
    if (filters.tahun.trim()) params.set("tahun", filters.tahun.trim());

    try {
      const response = await fetch(`/api/admin/arsip?${params.toString()}`);
      const result: ListResponse = await response.json();

      if (!response.ok) {
        const errorMessage =
          (result as unknown as { error?: { message?: string } })?.error
            ?.message || "Gagal memuat data arsip";
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
  }, [
    filters.page,
    filters.jenisId,
    filters.status,
    filters.tahun,
    debouncedSearch,
  ]);

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
      const response = await fetch(`/api/admin/arsip/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result?.error?.message || "Gagal menghapus arsip");
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
      key: "sampul",
      header: "Sampul",
      cell: (row: ArsipDenganJenis) =>
        row.gambarSampulUrl ? (
          <div className="relative h-10 w-16 overflow-hidden rounded-lg">
            <Image
              src={row.gambarSampulUrl}
              alt={row.alt ?? row.judul}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        ) : (
          <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-[#f2f2f4] text-xs text-[#8f8f8f]">
            -
          </div>
        ),
    },
    {
      key: "judul",
      header: "Judul",
      cell: (row: ArsipDenganJenis) => (
        <span className="font-semibold text-[#0f1012]">{row.judul}</span>
      ),
    },
    {
      key: "jenis",
      header: "Jenis",
      cell: (row: ArsipDenganJenis) => row.jenisArsip.nama,
    },
    {
      key: "periode",
      header: "Periode Kegiatan",
      cell: (row: ArsipDenganJenis) =>
        formatPeriodeKegiatan(
          row.tanggalKegiatanMulai,
          row.tanggalKegiatanSelesai
        ),
    },
    {
      key: "media",
      header: "Media",
      cell: (row: ArsipDenganJenis) =>
        row._count.media > 0 ? (
          <span className="text-[#0f1012]">{row._count.media} berkas</span>
        ) : (
          <span className="text-[#8f8f8f]">-</span>
        ),
    },
    {
      key: "berkas",
      header: "Berkas",
      cell: (row: ArsipDenganJenis) =>
        row.berkasId ? (
          <span className="text-[#0f1012]">
            {row.berkasFormat?.toUpperCase() ?? "?"} •{" "}
            {formatUkuranBerkas(row.berkasUkuran)}
          </span>
        ) : (
          <span className="text-[#8f8f8f]">
            {row.berkasFormat?.toUpperCase() ?? "-"} • belum diunggah
          </span>
        ),
    },
    {
      key: "unduhan",
      header: "Unduhan",
      cell: (row: ArsipDenganJenis) => row.jumlahUnduhan,
    },
    {
      key: "akses",
      header: "Akses",
      cell: (row: ArsipDenganJenis) => labelAkses(row.akses),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ArsipDenganJenis) => <StatusBadge status={row.status} />,
    },
    {
      key: "aksi",
      header: "Aksi",
      cell: (row: ArsipDenganJenis) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/arsip/${row.id}/edit`}
            className="rounded-lg bg-[#0071e3]/10 p-2 text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.18]"
            aria-label="Edit"
          >
            <Pencil weight="bold" />
          </Link>
          <button
            onClick={() => setDeleteId(row.id)}
            className="rounded-lg bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#0f1012] lg:text-3xl">
            Daftar Arsip
          </h1>
          <p className="mt-1 text-sm text-[#5e5e5e]">
            Kelola dokumen arsip yang ditampilkan di halaman publik. Unduhan
            hanya tersedia untuk alumni yang sudah masuk.
          </p>
        </div>
        <Link
          href="/admin/arsip/tambah"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#005fc1]"
        >
          <Plus weight="bold" />
          Tambah Arsip
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <MagnifyingGlass
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
          />
          <input
            type="text"
            aria-label="Cari judul arsip"
            placeholder="Cari judul arsip..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] py-2.5 pl-10 pr-4 text-[#0f1012] transition-all placeholder:text-[#8f8f8f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Faders
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
            />
            <select
              aria-label="Filter jenis arsip"
              value={filters.jenisId}
              onChange={(e) => updateFilter("jenisId", e.target.value)}
              disabled={isLoadingJenis}
              className="appearance-none rounded-xl border border-black/[0.08] bg-[#fdfdfd] py-2.5 pl-10 pr-8 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-60"
            >
              <option value="">Semua Jenis</option>
              {daftarJenis.map((jenis) => (
                <option key={jenis.id} value={jenis.id}>
                  {jenis.nama}
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
              aria-label="Filter status"
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="appearance-none rounded-xl border border-black/[0.08] bg-[#fdfdfd] py-2.5 pl-10 pr-8 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              <option value="">Semua Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            aria-label="Filter tahun"
            placeholder="Tahun"
            min={1900}
            max={2200}
            value={filters.tahun}
            onChange={(e) => updateFilter("tahun", e.target.value)}
            className="w-28 rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-2.5 text-[#0f1012] transition-all placeholder:text-[#8f8f8f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={fetchData} className="font-bold hover:underline">
            Coba lagi
          </button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(row) => row.id}
          emptyState={
            <EmptyState
              title="Belum ada arsip"
              description="Tambahkan dokumen pertama untuk ditampilkan di halaman arsip publik."
              actionLabel="Tambah Arsip"
              onAction={() => router.push("/admin/arsip/tambah")}
            />
          }
        />
      )}

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
        title="Hapus Arsip"
        message="Apakah Anda yakin ingin menghapus arsip ini? Data tidak akan hilang permanen, tapi tidak akan ditampilkan lagi di halaman publik."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
