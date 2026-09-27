"use client";

import { useCallback, useEffect, useState } from "react";
import { ClockCounterClockwise, Faders } from "@phosphor-icons/react";
import { DataTable } from "./DataTable";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./TableSkeleton";
import { AdminPagination } from "./AdminPagination";
import { panggilApi } from "@/lib/api-client";
import { formatTanggalWIB } from "@/lib/format";
import { DAFTAR_AKSI, DAFTAR_ENTITAS } from "@/lib/aktivitas";

/**
 * Log aktivitas pengurus & alumni.
 *
 * Menampilkan kalimat yang bisa dipahami pengurus (mis. "Menyetujui akun alumni
 * — Budi Santoso"), dengan filter aktor/modul/aksi/tanggal. Hanya baca.
 */

type ItemAktivitas = {
  id: string;
  waktu: string;
  aktorNama: string;
  aktorJenis: "admin" | "alumni";
  kalimat: string;
  modul: string;
  entitas: string;
  entitasId: string;
};

type Pengurus = { id: string; nama: string };

const PER_PAGE = 20;

const selectClass =
  "rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-3 py-2 text-sm text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";

function waktuRelatif(iso: string): string {
  const selisihDetik = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (selisihDetik < 60) return "baru saja";
  const menit = Math.round(selisihDetik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.round(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return formatTanggalWIB(iso);
}

export function AktivitasLog() {
  const [aktor, setAktor] = useState("semua");
  const [adminId, setAdminId] = useState("");
  const [modul, setModul] = useState("");
  const [aksi, setAksi] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<ItemAktivitas[]>([]);
  const [pengurus, setPengurus] = useState<Pengurus[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PER_PAGE));
    if (aktor !== "semua") params.set("aktor", aktor);
    if (aktor === "admin" && adminId) params.set("adminId", adminId);
    if (modul) params.set("modul", modul);
    if (aksi) params.set("aksi", aksi);
    if (dari) params.set("dari", dari);
    if (sampai) params.set("sampai", sampai);

    const hasil = await panggilApi<ItemAktivitas[]>(
      `/api/admin/aktivitas?${params.toString()}`
    );

    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    setItems(hasil.data);
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
    if (hasil.meta?.pengurus) setPengurus(hasil.meta.pengurus);
    setIsLoading(false);
  }, [aktor, adminId, modul, aksi, dari, sampai, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  const columns = [
    {
      key: "waktu",
      header: "Waktu",
      className: "w-40",
      cell: (row: ItemAktivitas) => (
        <span className="text-xs text-[#5e5e5e]" title={formatTanggalWIB(row.waktu)}>
          {waktuRelatif(row.waktu)}
        </span>
      ),
    },
    {
      key: "aktor",
      header: "Aktor",
      cell: (row: ItemAktivitas) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0f1012]">{row.aktorNama}</p>
          <span
            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${
              row.aktorJenis === "admin"
                ? "bg-[#0071e3]/10 text-[#0071e3]"
                : "bg-black/[0.05] text-[#5e5e5e]"
            }`}
          >
            {row.aktorJenis === "admin" ? "Pengurus" : "Alumni"}
          </span>
        </div>
      ),
    },
    {
      key: "aktivitas",
      header: "Aktivitas",
      cell: (row: ItemAktivitas) => (
        <span className="text-sm text-[#0f1012]">{row.kalimat}</span>
      ),
    },
    {
      key: "modul",
      header: "Modul",
      className: "hidden md:table-cell",
      cell: (row: ItemAktivitas) => (
        <span className="text-xs text-[#5e5e5e]">{row.modul}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-normal text-[#0f1012] lg:text-3xl">
          <ClockCounterClockwise weight="regular" className="text-[#0071e3]" />
          Aktivitas
        </h1>
        <p className="mt-1 text-sm text-[#5e5e5e]">
          Riwayat tindakan pengurus dan alumni, dengan bahasa yang mudah dibaca.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/[0.08] bg-[#fdfdfd] p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-aktor" className="text-xs font-semibold text-[#5e5e5e]">
            Aktor
          </label>
          <select
            id="filter-aktor"
            value={aktor}
            onChange={(e) => {
              setAktor(e.target.value);
              setAdminId("");
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="semua">Semua</option>
            <option value="admin">Pengurus</option>
            <option value="alumni">Alumni</option>
          </select>
        </div>

        {aktor === "admin" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-admin" className="text-xs font-semibold text-[#5e5e5e]">
              Pengurus
            </label>
            <select
              id="filter-admin"
              value={adminId}
              onChange={(e) => {
                setAdminId(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">Semua pengurus</option>
              {pengurus.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-modul" className="text-xs font-semibold text-[#5e5e5e]">
            Modul
          </label>
          <select
            id="filter-modul"
            value={modul}
            onChange={(e) => {
              setModul(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">Semua modul</option>
            {DAFTAR_ENTITAS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-aksi" className="text-xs font-semibold text-[#5e5e5e]">
            Aksi
          </label>
          <select
            id="filter-aksi"
            value={aksi}
            onChange={(e) => {
              setAksi(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">Semua aksi</option>
            {DAFTAR_AKSI.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-dari" className="text-xs font-semibold text-[#5e5e5e]">
            Dari
          </label>
          <input
            id="filter-dari"
            type="date"
            value={dari}
            onChange={(e) => {
              setDari(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-sampai" className="text-xs font-semibold text-[#5e5e5e]">
            Sampai
          </label>
          <input
            id="filter-sampai"
            type="date"
            value={sampai}
            onChange={(e) => {
              setSampai(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          />
        </div>

        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#8f8f8f]">
          <Faders weight="bold" />
          {meta ? `${meta.total} aktivitas` : ""}
        </span>
      </div>

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
              title="Belum ada aktivitas"
              description="Aktivitas pengurus dan alumni akan muncul di sini."
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
