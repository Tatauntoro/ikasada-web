"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowSquareOut,
  ArrowsCounterClockwise,
  CheckCircle,
  ClockCountdown,
  Prohibit,
  SealCheck,
} from "@phosphor-icons/react";
import { AKSI, MODUL } from "@/lib/permission";
import { panggilApi } from "@/lib/api-client";
import { formatTanggalWIB } from "@/lib/format";
import { EmptyState } from "./EmptyState";
import { useIzin } from "./IzinProvider";

/**
 * Helper verifikasi konten untuk form admin.
 *
 * Form memakai ini untuk: (1) tahu apakah pengguna pemegang izin verifikasi
 * (boleh Publish langsung), (2) menampilkan badge status, dan (3) mengajukan
 * verifikasi ke Ketua Umum. Penegakan sebenarnya tetap di server.
 */

export type StatusVerifikasiUI = "BELUM" | "MENUNGGU" | "DISETUJUI" | "DITOLAK";

export function useVerifikatorKonten(): boolean {
  const { superadmin, boleh } = useIzin();
  return superadmin || boleh(MODUL.VERIFIKASI_KONTEN, AKSI.UBAH);
}

const LABEL: Record<StatusVerifikasiUI, string> = {
  BELUM: "Belum diajukan",
  MENUNGGU: "Menunggu verifikasi",
  DISETUJUI: "Terverifikasi",
  DITOLAK: "Ditolak",
};

const WARNA: Record<StatusVerifikasiUI, string> = {
  BELUM: "bg-black/[0.05] text-[#5e5e5e]",
  MENUNGGU: "bg-amber-50 text-amber-700",
  DISETUJUI: "bg-emerald-50 text-emerald-700",
  DITOLAK: "bg-red-50 text-red-600",
};

function Ikon({ status }: { status: StatusVerifikasiUI }) {
  if (status === "MENUNGGU") return <ClockCountdown weight="bold" />;
  if (status === "DISETUJUI") return <SealCheck weight="bold" />;
  if (status === "DITOLAK") return <Prohibit weight="bold" />;
  return <CheckCircle weight="bold" />;
}

export function BadgeVerifikasi({
  verifikasi,
}: {
  verifikasi: StatusVerifikasiUI;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${WARNA[verifikasi]}`}
    >
      <Ikon status={verifikasi} />
      {LABEL[verifikasi]}
    </span>
  );
}

/** Ajukan verifikasi ke verifikator (mis. Ketua Umum). */
export async function ajukanVerifikasi(
  entitas: string,
  id: string
): Promise<{ ok: boolean; pesan?: string }> {
  const res = await fetch(`/api/admin/verifikasi/${entitas}/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aksi: "ajukan" }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      pesan: data?.error?.message ?? "Gagal mengajukan verifikasi.",
    };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Antrean verifikasi (halaman /admin/verifikasi)                      */
/* ------------------------------------------------------------------ */

export type EntitasKonten = "kegiatan" | "berita" | "arsip" | "kerjasama";

type ItemAntrean = {
  id: string;
  entitas: EntitasKonten;
  label: string;
  nama: string;
  status: string;
  divisiNama: string | null;
  updatedAt: string;
};

/** Tautan ke form edit dalam "mode tinjau" (`?tinjau=1` memicu pengaman publish). */
const TAUTAN_EDIT: Record<EntitasKonten, (id: string) => string> = {
  kegiatan: (id) => `/admin/kegiatan/${id}/edit?tinjau=1`,
  berita: (id) => `/admin/berita/${id}/edit?tinjau=1`,
  arsip: (id) => `/admin/arsip/${id}/edit?tinjau=1`,
  kerjasama: (id) => `/admin/kerjasama/${id}/edit?tinjau=1`,
};

const FILTER_ENTITAS = [
  { value: "", label: "Semua jenis" },
  { value: "kegiatan", label: "Kegiatan" },
  { value: "berita", label: "Berita" },
  { value: "arsip", label: "Arsip" },
  { value: "kerjasama", label: "Kerjasama" },
];

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-2.5 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";

/** Antrean konten yang menunggu verifikasi (Ketua Umum). */
export function VerifikasiKontenQueue() {
  const { boleh } = useIzin();
  const bolehUbah = boleh(MODUL.VERIFIKASI_KONTEN, AKSI.UBAH);

  const [items, setItems] = useState<ItemAntrean[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [tolakUntuk, setTolakUntuk] = useState<ItemAntrean | null>(null);
  const [catatan, setCatatan] = useState("");
  const [proses, setProses] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setError(null);
    const q = filter ? `?entitas=${encodeURIComponent(filter)}` : "";
    const hasil = await panggilApi<ItemAntrean[]>(`/api/admin/verifikasi${q}`);
    if (!hasil.ok) {
      setError(hasil.error.message);
      setMemuat(false);
      return;
    }
    setItems(hasil.data);
    setMemuat(false);
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  async function jalankan(
    item: ItemAntrean,
    aksi: "verifikasi" | "tolak",
    catatanNilai?: string
  ) {
    setProses(true);
    const hasil = await panggilApi(
      `/api/admin/verifikasi/${item.entitas}/${item.id}`,
      { method: "POST", body: { aksi, catatan: catatanNilai ?? null } }
    );
    setProses(false);
    if (!hasil.ok) {
      setError(hasil.error.message);
      return;
    }
    setTolakUntuk(null);
    setCatatan("");
    muat();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#0f1012] lg:text-3xl">
            Verifikasi Konten
          </h1>
          <p className="mt-1 text-sm text-[#5e5e5e]">
            Konten dari divisi yang menunggu persetujuan sebelum bisa
            diterbitkan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter jenis konten"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-3 py-2.5 text-sm"
          >
            {FILTER_ENTITAS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={muat}
            className="inline-flex items-center gap-2 rounded-xl border border-black/[0.08] px-4 py-2.5 text-sm font-semibold hover:bg-black/[0.04]"
          >
            <ArrowsCounterClockwise weight="bold" />
            Muat ulang
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {tolakUntuk && (
        <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-[#0f1012]">
            Tolak verifikasi: {tolakUntuk.nama}
          </p>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={3}
            placeholder="Alasan penolakan (opsional, dilihat divisi)"
            className={inputClass}
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setTolakUntuk(null);
                setCatatan("");
              }}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={proses}
              onClick={() => jalankan(tolakUntuk, "tolak", catatan)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Prohibit weight="bold" />
              {proses ? "Memproses..." : "Tolak verifikasi"}
            </button>
          </div>
        </div>
      )}

      {memuat ? (
        <p className="text-sm text-[#5e5e5e]">Memuat antrean…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Tidak ada yang menunggu"
          description="Belum ada konten divisi yang menunggu verifikasi."
          showAction={false}
        />
      ) : (
        <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.08] bg-[#fdfdfd]">
          {items.map((item) => (
            <li
              key={`${item.entitas}-${item.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0f1012]">
                  <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0071e3]">
                    {item.label}
                  </span>
                  {item.nama}
                </p>
                <p className="mt-1 text-xs text-[#5e5e5e]">
                  Divisi {item.divisiNama ?? "—"} · diajukan{" "}
                  {formatTanggalWIB(item.updatedAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={TAUTAN_EDIT[item.entitas](item.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-black/[0.05] px-3 py-1.5 text-xs font-bold text-[#0f1012] hover:bg-black/[0.08]"
                >
                  <ArrowSquareOut weight="bold" />
                  Tinjau
                </Link>
                {bolehUbah && (
                  <>
                    <button
                      type="button"
                      disabled={proses}
                      onClick={() => jalankan(item, "verifikasi")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <SealCheck weight="bold" />
                      Verifikasi
                    </button>
                    <button
                      type="button"
                      disabled={proses}
                      onClick={() => {
                        setTolakUntuk(item);
                        setCatatan("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
                    >
                      <Prohibit weight="bold" />
                      Tolak
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aksi tinjau di halaman edit ("mode tinjau")                          */
/* ------------------------------------------------------------------ */

/**
 * Tombol Verifikasi/Tolak untuk halaman edit "mode tinjau".
 *
 * Ketua/verifikator tidak punya izin `ubah` pada modul konten (mereka hanya
 * memverifikasi), jadi form tidak boleh menawarkan Simpan/Publish. Keputusan
 * hanya lewat endpoint verifikasi — sama seperti tombol di antrean.
 */
export function AksiTinjau({
  entitas,
  id,
  nama,
  bolehUbah,
  onBerhasil,
}: {
  entitas: EntitasKonten;
  id: string;
  nama: string;
  /** Pemegang izin `verifikasi-konten:ubah` (mis. Ketua Umum). */
  bolehUbah: boolean;
  onBerhasil: () => void;
}) {
  const [tolakTerbuka, setTolakTerbuka] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [proses, setProses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function jalankan(aksi: "verifikasi" | "tolak", catatanNilai?: string) {
    setProses(true);
    setError(null);
    const hasil = await panggilApi(
      `/api/admin/verifikasi/${entitas}/${id}`,
      { method: "POST", body: { aksi, catatan: catatanNilai ?? null } }
    );
    setProses(false);
    if (!hasil.ok) {
      setError(hasil.error.message);
      return;
    }
    onBerhasil();
  }

  if (!bolehUbah) {
    return (
      <p className="text-xs text-[#5e5e5e]">
        Mode tinjau — hanya pemegang izin Verifikasi Konten yang bisa menyetujui
        atau menolak konten ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {tolakTerbuka ? (
        <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-[#0f1012]">
            Tolak verifikasi: {nama}
          </p>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={3}
            placeholder="Alasan penolakan (opsional, dilihat divisi)"
            className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-2.5 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setTolakTerbuka(false);
                setCatatan("");
              }}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={proses}
              onClick={() => jalankan("tolak", catatan)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Prohibit weight="bold" />
              {proses ? "Memproses..." : "Tolak verifikasi"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-end gap-3 sm:flex-row">
          <button
            type="button"
            disabled={proses}
            onClick={() => {
              setTolakTerbuka(true);
              setCatatan("");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-6 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60 sm:w-auto"
          >
            <Prohibit weight="bold" />
            Tolak
          </button>
          <button
            type="button"
            disabled={proses}
            onClick={() => jalankan("verifikasi")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
          >
            <SealCheck weight="bold" />
            {proses ? "Memproses..." : "Verifikasi"}
          </button>
        </div>
      )}
    </div>
  );
}
