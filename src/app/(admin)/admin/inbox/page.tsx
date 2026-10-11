"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowSquareOut,
  CaretDown,
  Checks,
  CheckCircle,
  Handshake,
  Key,
  SealCheck,
  ShieldCheck,
  UserPlus,
} from "@phosphor-icons/react";
import { panggilApi } from "@/lib/api-client";
import type { ItemNotifikasi, TipeNotifikasi } from "@/lib/notifikasi";
import { FITUR_JEJARING_ALUMNI } from "@/lib/fitur";
import { AKSI, MODUL_INBOX_PER_TIPE } from "@/lib/permission";
import { useIzin } from "@/components/admin/IzinProvider";
import { formatTanggalWIB } from "@/lib/format";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { useNotifikasi } from "@/components/admin/NotifikasiProvider";

const PER_PAGE = 20;

type FilterTipe = "SEMUA" | TipeNotifikasi;

const LABEL_TIPE: Record<string, string> = {
  PENDAFTARAN: "Pendaftaran akun",
  AKUN: "Permintaan akun",
  KONTEN: "Verifikasi konten",
  ADMIN: "Admin & Divisi",
};

/** Urutan tab yang mungkin muncul; difilter izin di dalam komponen. */
const URUTAN_TIPE: TipeNotifikasi[] = ["PENDAFTARAN", "AKUN", "KONTEN", "ADMIN"];

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
  KONTEN: {
    elemen: <SealCheck weight="bold" className="text-lg" />,
    warna: "bg-emerald-50 text-emerald-700",
  },
  ADMIN: {
    elemen: <ShieldCheck weight="bold" className="text-lg" />,
    warna: "bg-[#0071e3]/10 text-[#0071e3]",
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
  const { boleh } = useIzin();

  /**
   * Tab yang boleh dilihat: hanya tipe notifikasi yang izinnya dimiliki.
   * Tab "Semua" hanya ditampilkan bila ada lebih dari satu tipe yang boleh —
   * dengan satu tipe, tab itu tidak menambah pilihan apa pun.
   */
  const filterTersedia = useMemo<{ kunci: FilterTipe; label: string }[]>(() => {
    const tipe = URUTAN_TIPE.filter((t) =>
      boleh(MODUL_INBOX_PER_TIPE[t], "lihat")
    );
    const daftar: { kunci: FilterTipe; label: string }[] = tipe.map((t) => ({
      kunci: t,
      label: LABEL_TIPE[t],
    }));
    return daftar.length > 1
      ? [{ kunci: "SEMUA", label: "Semua" }, ...daftar]
      : daftar;
  }, [boleh]);

  const [filter, setFilter] = useState<FilterTipe>(
    () => filterTersedia[0]?.kunci ?? "SEMUA"
  );

  // Jaga-jaga bila izin berubah: filter yang tidak lagi tersedia direset ke
  // tab pertama yang ada.
  useEffect(() => {
    if (!filterTersedia.some((f) => f.kunci === filter)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilter(filterTersedia[0]?.kunci ?? "SEMUA");
    }
  }, [filterTersedia, filter]);

  const [items, setItems] = useState<ItemNotifikasi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [memuatLagi, setMemuatLagi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  /** Halaman berikutnya yang dimuat saat menekan "Muat lebih banyak". */
  const [halamanBerikut, setHalamanBerikut] = useState(1);
  const halamanRef = useRef(1);
  const versiRef = useRef(versi);
  /** Id notifikasi yang sedang ditandai (per item) dan status "tandai semua". */
  const [idDitandai, setIdDitandai] = useState<string | null>(null);
  const [menandaiSemua, setMenandaiSemua] = useState(false);

  const muat = useCallback(
    async (halaman: number, tambah: boolean) => {
      if (tambah) setMemuatLagi(true);
      else setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(halaman));
      params.set("limit", String(PER_PAGE));
      if (filter !== "SEMUA") params.set("tipe", filter);

      const hasil = await panggilApi<ItemNotifikasi[]>(
        `/api/admin/notifikasi?${params.toString()}`
      );

      if (!hasil.ok) {
        setError(hasil.error.message);
        setIsLoading(false);
        setMemuatLagi(false);
        return;
      }

      setItems((sebelum) => (tambah ? [...sebelum, ...hasil.data] : hasil.data));
      setTotal(hasil.meta?.total ?? hasil.data.length);
      const berikut = halaman + 1;
      setHalamanBerikut(berikut);
      halamanRef.current = berikut;
      setIsLoading(false);
      setMemuatLagi(false);
      /*
       * Membuka inbox **tidak** lagi menandai apa pun sebagai sudah dibaca:
       * penandanya manual (per item atau semua), supaya pengurus bisa
       * memutuskan mana yang sudah ia tindak lanjuti.
       */
    },
    [filter]
  );

  // Filter berubah → muat ulang dari halaman pertama.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat(1, false);
  }, [muat]);

  // Notifikasi baru (SSE): segarkan halaman pertama, tetapi hanya bila pengguna
  // belum menelusuri lebih jauh supaya daftar yang sedang dibaca tidak hilang.
  useEffect(() => {
    if (versiRef.current === versi) return;
    versiRef.current = versi;
    if (halamanRef.current <= 2) {
      muat(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versi]);

  const gantiFilter = (kunci: FilterTipe) => {
    setFilter(kunci);
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
            {FITUR_JEJARING_ALUMNI
              ? "Pendaftaran akun, permintaan reset kata sandi, dan aktivitas koneksi alumni terbaru."
              : "Pendaftaran akun dan permintaan reset kata sandi alumni terbaru."}
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
        {filterTersedia.map((item) => (
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
          <button
            onClick={() => muat(1, false)}
            className="font-bold hover:underline"
          >
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
          description={
            FITUR_JEJARING_ALUMNI
              ? "Pendaftaran akun, permintaan reset kata sandi, dan aktivitas koneksi alumni akan muncul di sini."
              : "Pendaftaran akun dan permintaan reset kata sandi alumni akan muncul di sini."
          }
          showAction={false}
        />
      ) : (
        <div className="glass-card rounded-2xl border overflow-hidden">
          <ul className="divide-y divide-black/[0.05]">
            {items.map((item) => {
              const ikon = IKON[item.tipe];
              // Tautan tindak lanjut butuh izin aksi `tindak-lanjut` kategori ini.
              const modulItem = MODUL_INBOX_PER_TIPE[item.tipe];
              const bisaTindakLanjut =
                item.href !== null && modulItem
                  ? boleh(modulItem, AKSI.TINDAK_LANJUT)
                  : false;
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
                      {bisaTindakLanjut && item.href && (
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

      {!isLoading && !error && total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-[#5e5e5e]">
            Menampilkan {items.length} dari {total} notifikasi
          </p>
          {items.length < total && (
            <button
              type="button"
              onClick={() => muat(halamanBerikut, true)}
              disabled={memuatLagi}
              className="inline-flex items-center gap-2 rounded-xl border border-black/[0.08] px-4 py-2 text-sm font-semibold text-[#0f1012] transition-colors hover:bg-black/[0.04] disabled:opacity-60"
            >
              <CaretDown weight="bold" aria-hidden="true" />
              {memuatLagi ? "Memuat…" : "Muat lebih banyak"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
