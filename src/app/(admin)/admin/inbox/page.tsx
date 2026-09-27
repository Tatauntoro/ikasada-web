"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowSquareOut,
  Checks,
  CheckCircle,
  Handshake,
  Key,
  UserPlus,
} from "@phosphor-icons/react";
import { panggilApi } from "@/lib/api-client";
import type { ItemNotifikasi, TipeNotifikasi } from "@/lib/notifikasi";
import { formatTanggalWIB } from "@/lib/format";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useNotifikasi } from "@/components/admin/NotifikasiProvider";

const PER_PAGE = 20;

type FilterTipe = "SEMUA" | TipeNotifikasi;

const FILTER: { kunci: FilterTipe; label: string }[] = [
  { kunci: "SEMUA", label: "Semua" },
  { kunci: "PENDAFTARAN", label: "Pendaftaran akun" },
  { kunci: "AKUN", label: "Permintaan akun" },
  { kunci: "KONEKSI", label: "Aktivitas koneksi" },
];

const IKON: Record<
  TipeNotifikasi,
  { elemen: ReactNode; warna: string }
> = {
  PENDAFTARAN: {
    elemen: <UserPlus weight="bold" className="text-lg" />,
    warna: "bg-[#0071e3]/10 text-[#0071e3]",
  },
  AKUN: {
    elemen: <Key weight="bold" className="text-lg" />,
    warna: "bg-amber-50 text-amber-700",
  },
  KONEKSI: {
    elemen: <Handshake weight="bold" className="text-lg" />,
    warna: "bg-black/[0.05] text-[#5e5e5e]",
  },
};

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

export default function InboxAdminPage() {
  const { versi, status, belumDibaca, tandaiDibaca, tandaiSatuDibaca } =
    useNotifikasi();

  const [filter, setFilter] = useState<FilterTipe>("SEMUA");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ItemNotifikasi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  /** Id notifikasi yang sedang ditandai (per item) dan status "tandai semua". */
  const [idDitandai, setIdDitandai] = useState<string | null>(null);
  const [menandaiSemua, setMenandaiSemua] = useState(false);

  const muat = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PER_PAGE));
    if (filter !== "SEMUA") params.set("tipe", filter);
    // `versi` naik tiap notifikasi SSE masuk; dipakai juga sebagai pemecah cache.
    params.set("v", String(versi));

    const hasil = await panggilApi<ItemNotifikasi[]>(
      `/api/admin/notifikasi?${params.toString()}`
    );

    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    setItems(hasil.data);
    setTotal(hasil.meta?.total ?? hasil.data.length);
    setTotalPages(hasil.meta?.totalPages ?? 1);
    setIsLoading(false);
    /*
     * Membuka inbox **tidak** lagi menandai apa pun sebagai sudah dibaca:
     * penandanya manual (per item atau semua), supaya pengurus bisa
     * memutuskan mana yang sudah ia tindak lanjuti.
     */
  }, [page, filter, versi]);

  useEffect(() => {
    // State baru di-set setelah request selesai, bukan di badan effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  const gantiFilter = (kunci: FilterTipe) => {
    setFilter(kunci);
    setPage(1);
  };

  /** Tandai satu notifikasi sudah dibaca; centangnya hilang begitu server setuju. */
  const tandaiSatu = async (item: ItemNotifikasi) => {
    setIdDitandai(item.id);
    const berhasil = await tandaiSatuDibaca(item.id);
    setIdDitandai(null);

    if (berhasil) {
      setItems((sebelum) =>
        sebelum.map((x) => (x.id === item.id ? { ...x, baru: false } : x))
      );
    }
  };

  /** Tandai seluruh inbox sudah dibaca (satu penanda waktu di server). */
  const tandaiSemua = async () => {
    setMenandaiSemua(true);
    await tandaiDibaca();
    setItems((sebelum) => sebelum.map((x) => ({ ...x, baru: false })));
    setMenandaiSemua(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-normal font-serif text-[#0f1012]">
            Inbox
          </h1>
          <p className="text-[#5e5e5e] mt-1">
            Pendaftaran akun, permintaan reset kata sandi, dan aktivitas koneksi
            alumni terbaru.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-[#8f8f8f]" role="status">
            {status === "tersambung"
              ? belumDibaca > 0
                ? `${belumDibaca} belum dibaca`
                : "Semua sudah dibaca"
              : status === "menghubungkan"
                ? "Menyambungkan notifikasi…"
                : "Koneksi notifikasi terputus — mencoba lagi…"}
          </p>
          <button
            type="button"
            onClick={tandaiSemua}
            disabled={belumDibaca === 0 || menandaiSemua}
            className="inline-flex items-center gap-2 rounded-xl border border-black/[0.08] px-4 py-2 text-sm font-semibold text-[#0f1012] transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Checks weight="bold" aria-hidden="true" />
            {menandaiSemua ? "Menandai…" : "Tandai semua sudah dibaca"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER.map((item) => (
          <button
            key={item.kunci}
            type="button"
            onClick={() => gantiFilter(item.kunci)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              filter === item.kunci
                ? "bg-[#0071e3] text-white"
                : "border border-black/[0.08] text-[#0f1012] hover:bg-black/[0.04]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={muat} className="font-bold hover:underline">
            Coba lagi
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="glass-card rounded-2xl border p-6">
          <TableSkeleton rows={6} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Pendaftaran akun, permintaan reset kata sandi, dan aktivitas koneksi alumni akan muncul di sini."
          showAction={false}
        />
      ) : (
        <div className="glass-card rounded-2xl border overflow-hidden">
          <ul className="divide-y divide-black/[0.05]">
            {items.map((item) => {
              const ikon = IKON[item.tipe];
              return (
                <li
                  key={item.id}
                  className="p-4 flex items-start gap-3 hover:bg-black/[0.03] transition-colors"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl ${ikon.warna}`}
                    aria-hidden="true"
                  >
                    {ikon.elemen}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#0f1012]">
                        {item.judul}
                      </p>
                      {item.baru && (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-[#e5484d]"
                          aria-label="Baru"
                        />
                      )}
                    </div>
                    <p className="text-sm text-[#5e5e5e] mt-0.5">
                      {item.pesan}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8f8f8f]">
                      <span>{waktuRelatif(item.createdAt)}</span>
                      {item.href && (
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 font-semibold text-[#0071e3] hover:underline"
                        >
                          Tindak lanjuti <ArrowSquareOut weight="bold" />
                        </Link>
                      )}
                      {item.baru && (
                        <button
                          type="button"
                          onClick={() => tandaiSatu(item)}
                          disabled={idDitandai === item.id}
                          className="inline-flex items-center gap-1 font-semibold text-[#0f1012] hover:underline disabled:opacity-60"
                        >
                          <CheckCircle weight="bold" aria-hidden="true" />
                          {idDitandai === item.id
                            ? "Menandai…"
                            : "Tandai sudah dibaca"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!isLoading && !error && (
        <AdminPagination
          page={page}
          limit={PER_PAGE}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
