"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, ShareNetwork, X } from "@phosphor-icons/react";
import { DataTable } from "./DataTable";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./TableSkeleton";
import { AdminPagination } from "./AdminPagination";
import { panggilApi } from "@/lib/api-client";
import { formatTanggalWIB } from "@/lib/format";

/**
 * Jejaring Alumni (admin) — daftar **semua** koneksi antar alumni, read-only.
 *
 * Bisa difilter per status dan dicari berdasarkan nama alumni. Hanya baca:
 * modul izin `jejaring` cuma punya aksi `lihat`.
 */

type Pihak = {
  accountId: string;
  alumniId: string | null;
  nama: string;
  angkatan: number | null;
  fotoUrl: string | null;
};

type ItemJejaring = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  pengirim: Pihak;
  penerima: Pihak;
};

const PER_PAGE = 20;

const STATUS_INFO: Record<string, { label: string; kelas: string }> = {
  PENDING: { label: "Menunggu", kelas: "bg-amber-50 text-amber-700" },
  ACCEPTED: { label: "Diterima", kelas: "bg-emerald-50 text-emerald-700" },
  DECLINED: { label: "Ditolak", kelas: "bg-red-50 text-red-600" },
  CANCELED: { label: "Dibatalkan", kelas: "bg-black/[0.05] text-[#5e5e5e]" },
  REVOKED: { label: "Diputus", kelas: "bg-black/[0.05] text-[#5e5e5e]" },
};

const TAB_STATUS = ["", "PENDING", "ACCEPTED", "DECLINED", "CANCELED", "REVOKED"];

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_INFO[status] ?? {
    label: status,
    kelas: "bg-black/[0.05] text-[#5e5e5e]",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${info.kelas}`}
    >
      {info.label}
    </span>
  );
}

function PihakCell({ p }: { p: Pihak }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-[#0f1012]">{p.nama}</p>
      {p.angkatan !== null && (
        <p className="text-xs text-[#5e5e5e]">Angkatan {p.angkatan}</p>
      )}
    </div>
  );
}

export function JejaringAlumni() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusAwal = searchParams.get("status");
  // Filter awal bisa datang dari tautan (mis. Dashboard → tab "Diterima").
  const [status, setStatus] = useState(
    statusAwal && TAB_STATUS.includes(statusAwal) ? statusAwal : ""
  );
  const [cariInput, setCariInput] = useState("");
  const [cari, setCari] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<ItemJejaring[]>([]);
  const [perStatus, setPerStatus] = useState<Record<string, number>>({});
  const [meta, setMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PER_PAGE));
    if (status) params.set("status", status);
    if (cari) params.set("search", cari);

    const hasil = await panggilApi<ItemJejaring[]>(
      `/api/admin/jejaring?${params.toString()}`
    );

    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    setItems(hasil.data);
    if (hasil.meta?.perStatus) setPerStatus(hasil.meta.perStatus);
    setMeta(
      hasil.meta
        ? {
            page: hasil.meta.page,
            limit: hasil.meta.limit,
            total: hasil.meta.total,
            totalPages: hasil.meta.totalPages,
          }
        : null
    );
    setIsLoading(false);
  }, [status, cari, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  const totalSemua = Object.values(perStatus).reduce((a, b) => a + b, 0);

  function terapkanCari(e: FormEvent) {
    e.preventDefault();
    setCari(cariInput.trim());
    setPage(1);
  }

  const columns = [
    {
      key: "waktu",
      header: "Waktu",
      className: "w-40",
      cell: (row: ItemJejaring) => (
        <span className="text-xs text-[#5e5e5e]">
          {formatTanggalWIB(row.createdAt)}
        </span>
      ),
    },
    {
      key: "pengirim",
      header: "Pengirim",
      cell: (row: ItemJejaring) => <PihakCell p={row.pengirim} />,
    },
    {
      key: "penerima",
      header: "Penerima",
      cell: (row: ItemJejaring) => <PihakCell p={row.penerima} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ItemJejaring) => <StatusBadge status={row.status} />,
    },
    {
      key: "pesan",
      header: "Pesan",
      className: "hidden lg:table-cell",
      cell: (row: ItemJejaring) =>
        row.message ? (
          <span className="line-clamp-2 text-xs text-[#5e5e5e]">
            {row.message}
          </span>
        ) : (
          <span className="text-xs text-[#8f8f8f]">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-normal text-[#0f1012] lg:text-3xl">
          <ShareNetwork weight="regular" className="text-[#0071e3]" />
          Jejaring Alumni
        </h1>
        <p className="mt-1 text-sm text-[#5e5e5e]">
          Semua koneksi antar alumni beserta statusnya.
        </p>
      </div>

      {/* Filter status */}
      <div className="flex flex-wrap gap-2">
        {TAB_STATUS.map((s) => {
          const aktif = status === s;
          const label = s === "" ? "Semua" : STATUS_INFO[s]?.label ?? s;
          const jumlah = s === "" ? totalSemua : perStatus[s] ?? 0;
          return (
            <button
              key={s || "semua"}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
                // Sinkronkan tab ke URL supaya bisa di-bookmark/dibagikan.
                router.replace(
                  s ? `/admin/jejaring?status=${s}` : "/admin/jejaring",
                  { scroll: false }
                );
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                aktif
                  ? "bg-[#0071e3] text-white"
                  : "border border-black/[0.08] text-[#0f1012] hover:bg-black/[0.04]"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  aktif ? "bg-white/20" : "bg-black/[0.06]"
                }`}
              >
                {jumlah}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pencarian */}
      <form onSubmit={terapkanCari} className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
          />
          <input
            type="text"
            value={cariInput}
            onChange={(e) => setCariInput(e.target.value)}
            placeholder="Cari nama alumni (pengirim atau penerima)..."
            aria-label="Cari nama alumni"
            className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] py-2.5 pl-10 pr-10 text-sm text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          {cariInput && (
            <button
              type="button"
              onClick={() => {
                setCariInput("");
                setCari("");
                setPage(1);
              }}
              aria-label="Bersihkan pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8f8f8f] hover:bg-black/[0.06]"
            >
              <X weight="bold" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-xl bg-[#0f1012] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black/80"
        >
          Cari
        </button>
      </form>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span role="alert">{error}</span>
          <button onClick={muat} className="font-bold hover:underline">
            Coba lagi
          </button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(row) => row.id}
          emptyState={
            <EmptyState
              title="Belum ada koneksi"
              description="Koneksi antar alumni akan muncul di sini."
              showAction={false}
            />
          }
        />
      )}

      {meta && meta.totalPages > 1 && (
        <AdminPagination
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
