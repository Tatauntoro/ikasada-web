"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MagnifyingGlass,
  Faders,
  Pencil,
  Trash,
} from "@phosphor-icons/react";
import Image from "next/image";
import { StatusAlumni, StatusAlumniAccount } from "@/generated/prisma/enums";
import type { AlumniModel } from "@/generated/prisma/models/Alumni";
import type { SektorIndustriModel as SektorIndustri } from "@/generated/prisma/models/SektorIndustri";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { getInitials } from "@/lib/format";

/** Akun alumni, diringkas ke bagian yang dipakai daftar (keterbukaan). */
type AkunRingkas = {
  id: string;
  status: StatusAlumniAccount;
  openToCollaboration: boolean;
  openToOpportunity: boolean;
};

type Alumni = AlumniModel & {
  sektorIndustri: SektorIndustri;
  account: AkunRingkas | null;
};

const KELAS_BADGE =
  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border";
const WARNA_BADGE = {
  hijau: "bg-emerald-50 text-emerald-700 border-emerald-200",
  biru: "bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/30",
  kuning: "bg-amber-50 text-amber-700 border-amber-200",
  abu: "bg-[#f2f2f4] text-[#5e5e5e] border-black/[0.08]",
} as const;

/**
 * Keterbukaan seorang alumni.
 *
 * Keterbukaan hanya bermakna untuk akun yang sudah `ACTIVE` — akun yang masih
 * `PENDING`/`SUSPENDED` belum dicocokkan pengurus, jadi menampilkan "terbuka
 * kolaborasi" untuk mereka justru menyesatkan. Alumni tanpa akun (data lama
 * yang dibuat admin) juga diberi penanda sendiri.
 */
function BadgeKeterbukaan({ akun }: { akun: AkunRingkas | null }) {
  if (!akun) {
    return <span className={`${KELAS_BADGE} ${WARNA_BADGE.abu}`}>Belum ada akun</span>;
  }

  if (akun.status !== StatusAlumniAccount.ACTIVE) {
    return (
      <span className={`${KELAS_BADGE} ${WARNA_BADGE.kuning}`}>
        Akun belum aktif
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {akun.openToCollaboration && (
        <span className={`${KELAS_BADGE} ${WARNA_BADGE.biru}`}>
          Terbuka kolaborasi
        </span>
      )}
      {akun.openToOpportunity && (
        <span className={`${KELAS_BADGE} ${WARNA_BADGE.hijau}`}>
          Terbuka kesempatan
        </span>
      )}
      {!akun.openToCollaboration && !akun.openToOpportunity && (
        <span className={`${KELAS_BADGE} ${WARNA_BADGE.abu}`}>
          Belum terbuka
        </span>
      )}
    </div>
  );
}

const STATUS_OPTIONS = Object.values(StatusAlumni);

/**
 * Opsi filter keterbukaan. Nilainya sejalan dengan badge di kolom keterbukaan —
 * `belum-terbuka` berarti akunnya aktif tapi tidak membuka kolaborasi maupun
 * kesempatan, sedangkan `belum-ada-akun` berarti alumni itu belum punya akun.
 */
const KETERBUKAAN_OPTIONS = [
  { value: "kolaborasi", label: "Terbuka kolaborasi" },
  { value: "kesempatan", label: "Terbuka kesempatan" },
  { value: "belum-terbuka", label: "Belum terbuka" },
  { value: "belum-ada-akun", label: "Belum ada akun" },
  { value: "belum-aktif", label: "Akun belum aktif" },
];

const CURRENT_YEAR = new Date().getFullYear();
const TAHUN_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1960 + 1 },
  (_, i) => CURRENT_YEAR - i
);

type Filters = {
  search: string;
  angkatan: string;
  sektorIndustriId: string;
  keterbukaan: string;
  status: string;
  page: number;
};

type ListResponse = {
  success: boolean;
  data: Alumni[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function AlumniListPage() {
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    angkatan: "",
    sektorIndustriId: "",
    keterbukaan: "",
    status: "",
    page: 1,
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  const [data, setData] = useState<Alumni[]>([]);
  const [meta, setMeta] = useState<ListResponse["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sektorList, setSektorList] = useState<SektorIndustri[]>([]);
  const [isLoadingSektor, setIsLoadingSektor] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchSektor = useCallback(async () => {
    setIsLoadingSektor(true);
    try {
      const response = await fetch("/api/admin/sektor-industri");
      const result = await response.json();
      if (response.ok) {
        setSektorList(result.data || []);
      }
    } catch {
      // sektor filter disabled silently
    } finally {
      setIsLoadingSektor(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSektor();
  }, [fetchSektor]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(filters.page));
    params.set("limit", "12");
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (filters.angkatan) params.set("angkatan", filters.angkatan);
    if (filters.sektorIndustriId)
      params.set("sektorIndustriId", filters.sektorIndustriId);
    if (filters.keterbukaan) params.set("keterbukaan", filters.keterbukaan);
    if (filters.status) params.set("status", filters.status);

    try {
      const response = await fetch(`/api/admin/alumni?${params.toString()}`);
      const result: ListResponse = await response.json();

      if (!response.ok) {
        const errorMessage =
          (result as unknown as { error?: { message?: string } })?.error
            ?.message || "Gagal memuat data alumni";
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
    filters.angkatan,
    filters.sektorIndustriId,
    filters.keterbukaan,
    filters.status,
    debouncedSearch,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function updateFilter<K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (value as number) : 1,
    }));
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/alumni/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result?.error?.message || "Gagal menghapus alumni");
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
      className: "w-16",
      cell: (row: Alumni) =>
        row.fotoUrl ? (
          <div className="relative w-10 h-10 rounded-full overflow-hidden">
            <Image
              src={row.fotoUrl}
              alt={row.namaLengkap}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-black/[0.05] text-[#0071e3] flex items-center justify-center text-xs font-bold">
            {getInitials(row.namaLengkap)}
          </div>
        ),
    },
    {
      key: "namaLengkap",
      header: "Nama",
      cell: (row: Alumni) => (
        <div>
          <span className="font-semibold text-[#0f1012]">
            {row.namaLengkap}
          </span>
          {row.gelar && (
            <span className="text-[#8f8f8f] text-xs ml-1">
              ({row.gelar})
            </span>
          )}
        </div>
      ),
    },
    {
      key: "angkatan",
      header: "Angkatan",
      className: "hidden sm:table-cell",
      cell: (row: Alumni) => row.angkatan,
    },
    {
      key: "profesi",
      header: "Profesi",
      className: "hidden lg:table-cell",
      cell: (row: Alumni) => row.profesi,
    },
    {
      key: "sektor",
      header: "Sektor",
      className: "hidden md:table-cell",
      cell: (row: Alumni) => row.sektorIndustri.namaSektor,
    },
    {
      key: "keterbukaan",
      header: "Keterbukaan",
      className: "hidden lg:table-cell",
      cell: (row: Alumni) => <BadgeKeterbukaan akun={row.account} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: Alumni) => <StatusBadge status={row.status} />,
    },
    {
      key: "aksi",
      header: "Aksi",
      cell: (row: Alumni) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/alumni/${row.id}/edit`}
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
            Daftar Alumni
          </h1>
          <p className="text-[#5e5e5e] text-sm mt-1">
            Kelola data alumni IKASADA yang ditampilkan di halaman publik.
          </p>
        </div>
        <Link
          href="/admin/alumni/tambah"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] text-white font-bold text-sm hover:bg-[#005fc1] transition-colors"
        >
          <Plus weight="bold" />
          Tambah Alumni
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
          />
          <input
            type="text"
            aria-label="Cari nama atau profesi"
            placeholder="Cari nama atau profesi..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Faders
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
            />
            <select
              aria-label="Filter angkatan"
              value={filters.angkatan}
              onChange={(e) => updateFilter("angkatan", e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none"
            >
              <option value="">Semua Angkatan</option>
              {TAHUN_OPTIONS.map((t) => (
                <option key={t} value={String(t)}>
                  {t}
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
              aria-label="Filter sektor industri"
              value={filters.sektorIndustriId}
              onChange={(e) => updateFilter("sektorIndustriId", e.target.value)}
              disabled={isLoadingSektor}
              className="pl-10 pr-8 py-2.5 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none disabled:opacity-60"
            >
              <option value="">Semua Sektor</option>
              {sektorList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.namaSektor}
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
              aria-label="Filter keterbukaan"
              value={filters.keterbukaan}
              onChange={(e) => updateFilter("keterbukaan", e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl bg-[#fdfdfd] border border-black/[0.08] text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none"
            >
              <option value="">Semua Keterbukaan</option>
              {KETERBUKAAN_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
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
              title="Belum ada alumni"
              description="Tambahkan data alumni pertama untuk ditampilkan di portal."
              actionLabel="Tambah Alumni"
              onAction={() => router.push("/admin/alumni/tambah")}
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
        title="Hapus Alumni"
        message="Apakah Anda yakin ingin menghapus data alumni ini? Data tidak akan hilang permanen, tapi tidak akan ditampilkan lagi."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
