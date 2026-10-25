"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ArrowDown,
  ArrowUp,
  GlobeHemisphereWest,
  Pencil,
  Plus,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { panggilApi } from "@/lib/api-client";
import {
  DEFAULT_PER_KUNCI,
  PALET_WARNA,
  SECTION_PAKAI_DESKRIPSI,
  SECTION_PAKAI_EYEBROW,
  SECTION_POSISI,
  kunciValid,
} from "@/lib/beranda";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./TableSkeleton";
import { ConfirmDialog } from "./ConfirmDialog";
import { ImageUpload } from "./ImageUpload";
import { invalidasiBerandaConfig } from "@/lib/beranda-client";
import {
  HERO_POSTER_BAWAAN,
  HERO_VIDEO_BAWAAN,
  type KonfigurasiHero,
  type ModeHero,
} from "@/lib/beranda";

/**
 * Kelola Beranda: atur section beranda (tampil/tidak, urutan, teks, foto) dan
 * titik sebaran geografis pada peta. Penegakan izin sebenarnya di server
 * (`requirePermission(MODUL.BERANDA, ...)`); halaman ini hanya UX.
 */

type SectionItem = {
  id: string;
  kunci: string;
  aktif: boolean;
  urutan: number;
  judul: string | null;
  eyebrow: string | null;
  deskripsi: string | null;
  warnaJudul: string | null;
  warnaEyebrow: string | null;
  warnaBackground: string | null;
  ukuranJudul: number | null;
  ukuranEyebrow: number | null;
  konfigurasi: unknown;
};

type TitikItem = {
  id: string;
  nama: string;
  lat: number;
  lng: number;
  keterangan: string | null;
  urutan: number;
  aktif: boolean;
};

type DraftSection = {
  aktif: boolean;
  urutan: string;
  eyebrow: string;
  judul: string;
  deskripsi: string;
  warnaJudul: string;
  warnaEyebrow: string;
  warnaBackground: string;
  ukuranJudul: string;
  ukuranEyebrow: string;
  konfigurasi: Record<string, unknown>;
};

type ItemLima = {
  judul: string;
  deskripsi: string;
  fotoUrl: string;
  tampilkanFoto: boolean;
  warnaLatar: string;
};
type ModeMediaTentang = "foto" | "slideshow" | "video";
type MediaTentang = { mode: ModeMediaTentang; fotoUrls: string[]; videoUrl: string; posterUrl: string };

const inputClass =
  "w-full min-w-0 rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-3 py-2.5 text-sm text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3] sm:py-2";
const tombolKecil =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60 sm:min-h-0 sm:px-2.5 sm:py-1.5";
const PALET_WARNA_BACKGROUND = [
  { nama: "Putih", nilai: "#ffffff" },
  { nama: "Abu muda", nilai: "#f2f2f4" },
  { nama: "Biru muda", nilai: "#eaf4ff" },
  { nama: "Hijau muda", nilai: "#e8f5ec" },
  { nama: "Kuning muda", nilai: "#fff5cc" },
  { nama: "Biru", nilai: "#0b5ed7" },
  { nama: "Gelap", nilai: "#0f1012" },
];
const KUNCI_STATISTIK_TERPADU = [
  "statistik",
  "sebaran-geografis",
  "sebaran-angkatan",
  "agenda",
] as const;
const KUNCI_PANEL_STATISTIK = KUNCI_STATISTIK_TERPADU.filter(
  (kunci) => kunci !== "statistik"
);

function labelSection(kunci: string): string {
  return kunciValid(kunci) ? DEFAULT_PER_KUNCI[kunci].label : kunci;
}

function konfigurasiDari(nilai: unknown): Record<string, unknown> {
  if (nilai && typeof nilai === "object" && !Array.isArray(nilai)) {
    return { ...(nilai as Record<string, unknown>) };
  }
  return {};
}

function konfigurasiHero(konfig: Record<string, unknown>): KonfigurasiHero {
  const value = konfig as Partial<KonfigurasiHero>;
  const mode: ModeHero =
    value.mode === "foto" || value.mode === "slideshow" ? value.mode : "video";
  return {
    mode,
    videoUrl:
      typeof value.videoUrl === "string" ? value.videoUrl : HERO_VIDEO_BAWAAN,
    posterUrl:
      typeof value.posterUrl === "string"
        ? value.posterUrl
        : HERO_POSTER_BAWAAN,
    fotoUrls: Array.isArray(value.fotoUrls)
      ? value.fotoUrls.filter((url): url is string => typeof url === "string")
      : [],
  };
}

function itemsLima(konfig: Record<string, unknown>): ItemLima[] {
  const items = konfig.items;
  if (!Array.isArray(items)) return [];
  return items.map((x) => {
    const o = (x ?? {}) as {
      judul?: unknown;
      deskripsi?: unknown;
      fotoUrl?: unknown;
      tampilkanFoto?: unknown;
      warnaLatar?: unknown;
    };
    return {
      judul: String(o.judul ?? ""),
      deskripsi: String(o.deskripsi ?? ""),
      fotoUrl: String(o.fotoUrl ?? ""),
      tampilkanFoto: o.tampilkanFoto !== false,
      warnaLatar: typeof o.warnaLatar === "string" ? o.warnaLatar : "",
    };
  });
}

function itemsLimaUntukEditor(konfig: Record<string, unknown>): ItemLima[] {
  if (Array.isArray(konfig.items)) return itemsLima(konfig);
  const itemsDefault = DEFAULT_PER_KUNCI["lima-cara"].konfigurasi?.items;
  if (!Array.isArray(itemsDefault)) return [];
  return itemsDefault.map((item) => {
    const o = item as { judul?: unknown; deskripsi?: unknown };
    return {
      judul: String(o.judul ?? ""),
      deskripsi: String(o.deskripsi ?? ""),
      fotoUrl: "",
      tampilkanFoto: true,
      warnaLatar: "",
    };
  });
}

function mediaTentang(konfig: Record<string, unknown>): MediaTentang {
  const legacyFoto = typeof konfig.fotoUrl === "string" ? konfig.fotoUrl : "";
  const fotoUrls = Array.isArray(konfig.fotoUrls)
    ? konfig.fotoUrls.filter((url): url is string => typeof url === "string")
    : legacyFoto ? [legacyFoto] : [];
  return {
    mode: konfig.mode === "slideshow" || konfig.mode === "video" ? konfig.mode : "foto",
    fotoUrls,
    videoUrl: typeof konfig.videoUrl === "string" ? konfig.videoUrl : "",
    posterUrl: typeof konfig.posterUrl === "string" ? konfig.posterUrl : legacyFoto,
  };
}

function emailKontak(konfig: Record<string, unknown>): string {
  return typeof konfig.email === "string" ? konfig.email : "";
}

type AsalSebaran = { nama: string; lat: string; lng: string };

function asalSebaran(konfig: Record<string, unknown>): AsalSebaran {
  const a = konfig.asal as
    | { nama?: unknown; lat?: unknown; lng?: unknown }
    | undefined;
  const keTeks = (v: unknown) => (v === undefined || v === null ? "" : String(v));
  return {
    nama: typeof a?.nama === "string" ? a.nama : "",
    lat: keTeks(a?.lat),
    lng: keTeks(a?.lng),
  };
}

function draftDari(s: SectionItem): DraftSection {
  return {
    aktif: s.aktif,
    urutan: String(s.urutan),
    eyebrow: s.eyebrow ?? "",
    judul: s.judul ?? "",
    deskripsi: s.deskripsi ?? "",
    warnaJudul: s.warnaJudul ?? "",
    warnaEyebrow: s.warnaEyebrow ?? "",
    warnaBackground: s.warnaBackground ?? "",
    ukuranJudul: s.ukuranJudul == null ? "" : String(s.ukuranJudul),
    ukuranEyebrow: s.ukuranEyebrow == null ? "" : String(s.ukuranEyebrow),
    konfigurasi: konfigurasiDari(s.konfigurasi),
  };
}

/**
 * Kontrol warna: deretan swatch preset + input hex manual + tombol "Bawaan".
 *
 * Nilai kosong berarti memakai warna bawaan desain. Hex yang tidak sah akan
 * ditolak server (lihat `sectionUpdateSchema`), jadi di sini tidak divalidasi.
 */
function KontrolWarna({
  label,
  nilai,
  onUbah,
  palet = PALET_WARNA,
}: {
  label: string;
  nilai: string;
  onUbah: (nilaiBaru: string) => void;
  palet?: { nama: string; nilai: string }[];
}) {
  const aktif = (hex: string) => nilai.trim().toLowerCase() === hex.toLowerCase();

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {palet.map((w) => (
          <button
            key={w.nilai}
            type="button"
            title={w.nama}
            aria-label={w.nama}
            aria-pressed={aktif(w.nilai)}
            onClick={() => onUbah(w.nilai)}
            className={`h-7 w-7 rounded-full border transition-colors ${
              aktif(w.nilai)
                ? "border-[#0071e3] ring-2 ring-[#0071e3]/40"
                : "border-black/15"
            }`}
            style={{ backgroundColor: w.nilai }}
          />
        ))}
        <button
          type="button"
          onClick={() => onUbah("")}
          className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}
        >
          Bawaan
        </button>
      </div>
      <input
        type="text"
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        placeholder="#0b5ed7"
        className={`${inputClass} mt-2`}
      />
    </div>
  );
}

/**
 * Kontrol ukuran relatif (persen). Kosong = 100% (ukuran bawaan). Nilai di luar
 * rentang ditolak server (`sectionUpdateSchema`), jadi di sini tidak divalidasi.
 */
function KontrolUkuran({
  label,
  nilai,
  onUbah,
}: {
  label: string;
  nilai: string;
  onUbah: (nilaiBaru: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={50}
          max={200}
          step={5}
          value={nilai}
          onChange={(e) => onUbah(e.target.value)}
          placeholder="100"
          className="w-24 rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-3 py-2 text-sm text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
        />
        <span className="text-xs text-[#5e5e5e]">
          % · 100 = ukuran bawaan
        </span>
        <button
          type="button"
          onClick={() => onUbah("")}
          className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}
        >
          Bawaan
        </button>
      </div>
    </div>
  );
}

function Dialog({
  terbuka,
  judul,
  deskripsi,
  onTutup,
  children,
}: {
  terbuka: boolean;
  judul: string;
  deskripsi: string;
  onTutup: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (terbuka && !dialog.open) dialog.showModal();
    if (!terbuka && dialog.open) dialog.close();
  }, [terbuka]);

  return (
    <dialog
      ref={ref}
      aria-label={judul}
      onCancel={(event) => {
        event.preventDefault();
        onTutup();
      }}
      onClose={onTutup}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-black/[0.08] bg-[#fdfdfd] p-0 text-[#0f1012] backdrop:bg-black/50"
    >
      <div className="border-b border-black/[0.08] px-6 py-5">
        <h2 className="text-lg font-bold">{judul}</h2>
        <p className="mt-1 text-sm text-[#5e5e5e]">{deskripsi}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}

export function KelolaBeranda() {
  const [section, setSection] = useState<SectionItem[]>([]);
  const [titik, setTitik] = useState<TitikItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [draft, setDraft] = useState<Record<string, DraftSection>>({});
  const [menyimpanSection, setMenyimpanSection] = useState<string | null>(null);
  const [mengunggahVideo, setMengunggahVideo] = useState(false);
  const [galatVideo, setGalatVideo] = useState<string | null>(null);
  const [sectionUnggahVideo, setSectionUnggahVideo] = useState<string | null>(null);

  const [titikBuka, setTitikBuka] = useState(false);
  const [titikEdit, setTitikEdit] = useState<TitikItem | null>(null);
  const [form, setForm] = useState({
    nama: "",
    lat: "",
    lng: "",
    keterangan: "",
    urutan: "0",
    aktif: true,
  });
  const [isSimpanTitik, setIsSimpanTitik] = useState(false);
  const [errorTitik, setErrorTitik] = useState<string | null>(null);
  const [titikHapus, setTitikHapus] = useState<TitikItem | null>(null);

  const muat = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const hasil = await panggilApi<{ section: SectionItem[]; titik: TitikItem[] }>(
      "/api/admin/beranda"
    );
    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }
    setSection(hasil.data.section);
    setTitik(hasil.data.titik);
    setDraft(
      Object.fromEntries(hasil.data.section.map((s) => [s.id, draftDari(s)]))
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  function ubahDraft(id: string, patch: Partial<DraftSection>) {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setError(null);
    setSukses(null);
  }

  function ubahKonfig(id: string, patch: Record<string, unknown>) {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], konfigurasi: { ...prev[id].konfigurasi, ...patch } },
    }));
    setError(null);
    setSukses(null);
  }

  function ubahAsal(id: string, patch: Partial<AsalSebaran>) {
    setDraft((prev) => {
      const d = prev[id];
      const asal = { ...asalSebaran(d.konfigurasi), ...patch };
      return { ...prev, [id]: { ...d, konfigurasi: { ...d.konfigurasi, asal } } };
    });
    setError(null);
    setSukses(null);
  }

  function ubahItemLima(id: string, index: number, patch: Partial<ItemLima>) {
    setDraft((prev) => {
      const d = prev[id];
      const items = itemsLimaUntukEditor(d.konfigurasi).map((x, i) =>
        i === index ? { ...x, ...patch } : x
      );
      return { ...prev, [id]: { ...d, konfigurasi: { ...d.konfigurasi, items } } };
    });
    setError(null);
    setSukses(null);
  }

  function tambahItemLima(id: string) {
    setDraft((prev) => {
      const d = prev[id];
      const items = itemsLimaUntukEditor(d.konfigurasi);
      if (items.length >= 10) return prev;
      return {
        ...prev,
        [id]: {
          ...d,
          konfigurasi: {
            ...d.konfigurasi,
            items: [
              ...items,
              {
                judul: "",
                deskripsi: "",
                fotoUrl: "",
                tampilkanFoto: true,
                warnaLatar: "",
              },
            ],
          },
        },
      };
    });
  }

  function hapusItemLima(id: string, index: number) {
    setDraft((prev) => {
      const d = prev[id];
      const items = itemsLimaUntukEditor(d.konfigurasi).filter((_, i) => i !== index);
      return { ...prev, [id]: { ...d, konfigurasi: { ...d.konfigurasi, items } } };
    });
  }

  async function simpanSection(s: SectionItem) {
    const d = draft[s.id];
    if (!d) return;
    setMenyimpanSection(s.id);
    setError(null);
    setSukses(null);

    const hasil = await panggilApi(`/api/admin/beranda/${s.id}`, {
      method: "PATCH",
      body:
        s.kunci === "hero"
          ? {
              judul: d.judul.trim() || null,
              deskripsi: d.deskripsi.trim() || null,
              warnaBackground: d.warnaBackground.trim() || null,
              konfigurasi: d.konfigurasi,
            }
          : {
              aktif: d.aktif,
              urutan: Number(d.urutan) || 0,
              eyebrow: d.eyebrow.trim() || null,
              judul: d.judul.trim() || null,
              deskripsi: d.deskripsi.trim() || null,
              warnaJudul: d.warnaJudul.trim() || null,
              warnaEyebrow: d.warnaEyebrow.trim() || null,
              warnaBackground: d.warnaBackground.trim() || null,
              ukuranJudul: d.ukuranJudul.trim() ? Number(d.ukuranJudul) : null,
              ukuranEyebrow: d.ukuranEyebrow.trim()
                ? Number(d.ukuranEyebrow)
                : null,
              // Section dengan data khas ikut menyimpan konfigurasi.
              ...(s.kunci === "tentang-kami" ||
              s.kunci === "lima-cara" ||
              s.kunci === "kontak" ||
              s.kunci === "sebaran-geografis"
                ? { konfigurasi: d.konfigurasi }
                : {}),
            },
    });
    setMenyimpanSection(null);

    if (!hasil.ok) {
      setError(hasil.error.message);
      return;
    }
    invalidasiBerandaConfig();
    setSukses(`Section "${labelSection(s.kunci)}" disimpan.`);
    muat();
  }

  async function unggahVideo(file: File, sectionId: string) {
    setGalatVideo(null);
    setSectionUnggahVideo(sectionId);
    const typeValid = file.type === "video/mp4" || file.type === "video/webm";
    if (!typeValid) {
      setGalatVideo("Format video harus MP4 atau WebM.");
      return;
    }
    if (file.size < 1 || file.size > 30 * 1024 * 1024) {
      setGalatVideo("Ukuran video maksimal 30 MB.");
      return;
    }

    setMengunggahVideo(true);
    try {
      const signResponse = await fetch("/api/admin/upload/hero-video/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });
      const signed = await signResponse.json();
      if (!signResponse.ok || !signed?.data?.uploadUrl) {
        throw new Error(signed?.error?.message || "Gagal menyiapkan unggahan video.");
      }

      let uploadResponse: Response;
      try {
        uploadResponse = await fetch(signed.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
      } catch {
        throw new Error(
          "Tidak dapat mengunggah ke R2. Pastikan CORS bucket mengizinkan PUT dari domain situs."
        );
      }
      if (!uploadResponse.ok) {
        throw new Error(
          "Unggahan video gagal. Pastikan CORS bucket R2 mengizinkan PUT dari domain situs."
        );
      }

      const completeResponse = await fetch(
        "/api/admin/upload/hero-video/complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: signed.data.filename }),
        }
      );
      const complete = await completeResponse.json();
      if (!completeResponse.ok || !complete?.data?.url) {
        throw new Error(complete?.error?.message || "Video gagal diverifikasi.");
      }

      ubahKonfig(sectionId, { videoUrl: complete.data.url });
      setSukses("Video berhasil diunggah. Simpan section untuk menerapkan.");
    } catch (error) {
      setGalatVideo(
        error instanceof Error ? error.message : "Unggahan video gagal."
      );
    } finally {
      setMengunggahVideo(false);
    }
  }

  function bukaTitikBaru() {
    setTitikEdit(null);
    setForm({ nama: "", lat: "", lng: "", keterangan: "", urutan: "0", aktif: true });
    setErrorTitik(null);
    setTitikBuka(true);
  }

  function bukaTitikUbah(t: TitikItem) {
    setTitikEdit(t);
    setForm({
      nama: t.nama,
      lat: String(t.lat),
      lng: String(t.lng),
      keterangan: t.keterangan ?? "",
      urutan: String(t.urutan),
      aktif: t.aktif,
    });
    setErrorTitik(null);
    setTitikBuka(true);
  }

  async function simpanTitik() {
    if (!form.nama.trim()) {
      setErrorTitik("Nama wajib diisi.");
      return;
    }
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setErrorTitik("Latitude harus antara -90 dan 90.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setErrorTitik("Longitude harus antara -180 dan 180.");
      return;
    }

    setIsSimpanTitik(true);
    setErrorTitik(null);

    const body = {
      nama: form.nama.trim(),
      lat,
      lng,
      keterangan: form.keterangan.trim() || null,
      urutan: Number(form.urutan) || 0,
      aktif: form.aktif,
    };

    const hasil = titikEdit
      ? await panggilApi(`/api/admin/sebaran/${titikEdit.id}`, {
          method: "PATCH",
          body,
        })
      : await panggilApi("/api/admin/sebaran", { method: "POST", body });

    setIsSimpanTitik(false);
    if (!hasil.ok) {
      setErrorTitik(hasil.error.message);
      return;
    }

    setSukses(
      `Titik sebaran "${body.nama}" ${titikEdit ? "diperbarui" : "ditambahkan"}.`
    );
    setTitikBuka(false);
    muat();
  }

  async function hapusTitik() {
    if (!titikHapus) return;
    const target = titikHapus;
    setTitikHapus(null);
    const hasil = await panggilApi(`/api/admin/sebaran/${target.id}`, {
      method: "DELETE",
    });
    if (!hasil.ok) {
      setError(hasil.error.message);
      return;
    }
    setSukses(`Titik sebaran "${target.nama}" dihapus.`);
    muat();
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-[#0f1012] lg:text-3xl">
          Kelola Beranda
        </h1>
        <p className="mt-1 text-sm text-[#5e5e5e]">
          Atur teks dan media Hero/section beranda, serta titik sebaran geografis.
          Angka statistik &amp; sebaran angkatan mengikuti data alumni/kegiatan
          secara otomatis.
        </p>
        <p className="mt-2 max-w-4xl rounded-xl border border-[#0071e3]/15 bg-[#0071e3]/[0.04] px-3 py-2.5 text-xs leading-relaxed text-[#5e5e5e]">
          Statistik publik tampil sebagai satu section terpadu. Atur judul,
          pengantar, urutan, dan warna latar bersama di <strong className="text-[#0f1012]">Statistik “Sejauh Ini”</strong>;
          gunakan sakelar panel untuk mengatur sebaran angkatan, geografis, dan
          sektor &amp; relevansi pekerjaan.
        </p>
      </div>

      {sukses && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <Check weight="bold" className="mt-0.5 shrink-0" />
          <span>{sukses}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span role="alert">{error}</span>
          <button onClick={muat} className="font-bold hover:underline">
            Coba lagi
          </button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {section.map((s) => {
            const d = draft[s.id] ?? draftDari(s);
            const bagianStatistik = KUNCI_STATISTIK_TERPADU.some((kunci) => kunci === s.kunci);
            const panelStatistik = KUNCI_PANEL_STATISTIK.some((kunci) => kunci === s.kunci);
            const panelGeografis = s.kunci === "sebaran-geografis";
            return (
              <div
                key={s.id}
                className={`min-w-0 space-y-4 rounded-2xl border bg-[#fdfdfd] p-4 sm:p-5 ${
                  bagianStatistik
                    ? "border-[#0071e3]/20 border-l-4 border-l-[#0071e3]"
                    : "border-black/[0.08]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#0f1012]">
                      {s.kunci === "statistik" ? "Statistik “Sejauh Ini”" : labelSection(s.kunci)}
                    </h2>
                    {bagianStatistik && (
                      <p className="mt-0.5 text-xs text-[#737373]">
                        {s.kunci === "statistik"
                          ? "Pengaturan utama untuk seluruh section publik"
                          : "Panel dalam section Statistik terpadu"}
                      </p>
                    )}
                  </div>
                  {s.kunci === "hero" ? (
                    <span className="text-xs font-semibold text-[#5e5e5e]">
                      Selalu tampil paling atas
                    </span>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f1012]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#0071e3]"
                        checked={d.aktif}
                        onChange={(e) => ubahDraft(s.id, { aktif: e.target.checked })}
                      />
                      Tampilkan di beranda
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {SECTION_POSISI.some((k) => k === s.kunci) && (!bagianStatistik || s.kunci === "statistik") && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                        Posisi (urutan)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={d.urutan}
                        onChange={(e) =>
                          ubahDraft(s.id, { urutan: e.target.value })
                        }
                        className={inputClass}
                      />
                      <p className="mt-1 text-xs text-[#8f8f8f]">
                        Angka lebih kecil tampil lebih dulu di beranda.
                      </p>
                    </div>
                  )}
                  {SECTION_PAKAI_EYEBROW.some((k) => k === s.kunci) && (!panelStatistik || panelGeografis || s.kunci === "statistik") && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                        Label kecil (eyebrow)
                      </label>
                      <input
                        type="text"
                        value={d.eyebrow}
                        onChange={(e) =>
                          ubahDraft(s.id, { eyebrow: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  )}
                  {(!panelStatistik || panelGeografis || s.kunci === "sebaran-angkatan" || s.kunci === "statistik") && <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                      {s.kunci === "hero" ? "Judul utama" : "Judul"}
                    </label>
                    <input
                      type="text"
                      value={d.judul}
                      onChange={(e) => ubahDraft(s.id, { judul: e.target.value })}
                      className={inputClass}
                    />
                  </div>}
                  {SECTION_PAKAI_DESKRIPSI.some((k) => k === s.kunci) && (!bagianStatistik || s.kunci === "statistik") && (
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                        {s.kunci === "hero" ? "Teks pengantar" : "Deskripsi"}
                      </label>
                      <textarea
                        rows={2}
                        value={d.deskripsi}
                        onChange={(e) =>
                          ubahDraft(s.id, { deskripsi: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  )}
                  {(!bagianStatistik || s.kunci === "statistik") && <div className="sm:col-span-2">
                    <KontrolWarna
                      label={bagianStatistik ? "Warna latar seluruh section statistik" : `Warna latar seluruh blok · ${labelSection(s.kunci)}`}
                      nilai={d.warnaBackground}
                      palet={PALET_WARNA_BACKGROUND}
                      onUbah={(v) => ubahDraft(s.id, { warnaBackground: v })}
                    />
                    <p className="mt-1 text-xs text-[#8f8f8f]">
                      {bagianStatistik
                        ? "Warna ini mencakup judul, peta, sebaran angkatan, sektor, relevansi, dan angka utama. Kosongkan untuk memakai warna bawaan."
                        : "Warna ini diterapkan ke seluruh blok section. Kosongkan untuk memakai warna bawaan."}
                    </p>
                  </div>}
                  {s.kunci !== "hero" && (!panelStatistik || s.kunci === "statistik") && <div className="sm:col-span-2">
                    <KontrolWarna
                      label="Warna judul"
                      nilai={d.warnaJudul}
                      onUbah={(v) => ubahDraft(s.id, { warnaJudul: v })}
                    />
                  </div>}
                  {SECTION_PAKAI_EYEBROW.some((k) => k === s.kunci) && (!panelStatistik || panelGeografis || s.kunci === "statistik") && (
                    <div className="sm:col-span-2">
                      <KontrolWarna
                        label="Warna eyebrow"
                        nilai={d.warnaEyebrow}
                        onUbah={(v) => ubahDraft(s.id, { warnaEyebrow: v })}
                      />
                    </div>
                  )}
                  {s.kunci !== "hero" && (!panelStatistik || s.kunci === "statistik") && <div className="sm:col-span-2">
                    <KontrolUkuran
                      label="Ukuran judul (%)"
                      nilai={d.ukuranJudul}
                      onUbah={(v) => ubahDraft(s.id, { ukuranJudul: v })}
                    />
                  </div>}
                  {SECTION_PAKAI_EYEBROW.some((k) => k === s.kunci) && (
                    <div className="sm:col-span-2">
                      <KontrolUkuran
                        label="Ukuran eyebrow (%)"
                        nilai={d.ukuranEyebrow}
                        onUbah={(v) => ubahDraft(s.id, { ukuranEyebrow: v })}
                      />
                    </div>
                  )}
                </div>

                {s.kunci === "hero" && (() => {
                  const hero = konfigurasiHero(d.konfigurasi);
                  const fotoYangDitampilkan = hero.fotoUrls.length
                    ? hero.fotoUrls
                    : [""];
                  const ubahFoto = (index: number, url: string | null) => {
                    const fotoUrls = [...hero.fotoUrls];
                    if (url) {
                      fotoUrls[index] = url;
                    } else {
                      fotoUrls.splice(index, 1);
                    }
                    ubahKonfig(s.id, { fotoUrls });
                  };
                  const geserFoto = (index: number, arah: -1 | 1) => {
                    const tujuan = index + arah;
                    if (tujuan < 0 || tujuan >= hero.fotoUrls.length) return;
                    const fotoUrls = [...hero.fotoUrls];
                    [fotoUrls[index], fotoUrls[tujuan]] = [
                      fotoUrls[tujuan],
                      fotoUrls[index],
                    ];
                    ubahKonfig(s.id, { fotoUrls });
                  };

                  return (
                    <div className="space-y-4 border-t border-black/[0.08] pt-4">
                      <div className="max-w-sm">
                        <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                          Latar Hero
                        </label>
                        <select
                          value={hero.mode}
                          onChange={(e) => {
                            const mode = e.target.value as ModeHero;
                            ubahKonfig(s.id, {
                              mode,
                              fotoUrls:
                                mode === "foto" ? hero.fotoUrls.slice(0, 1) : hero.fotoUrls,
                            });
                          }}
                          className={inputClass}
                        >
                          <option value="video">Video</option>
                          <option value="foto">Satu foto</option>
                          <option value="slideshow">Slideshow foto</option>
                        </select>
                      </div>

                      {hero.mode === "video" ? (
                        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                          <div className="order-2 min-w-0 space-y-3 lg:order-1">
                            <label className="block text-xs font-semibold text-[#5e5e5e]">
                              Video latar (MP4 atau WebM, maksimal 30 MB)
                            </label>
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              disabled={mengunggahVideo}
                              onChange={(e) => {
                                const file = e.currentTarget.files?.[0];
                                if (file) void unggahVideo(file, s.id);
                                e.currentTarget.value = "";
                              }}
                              className={inputClass}
                            />
                            {mengunggahVideo && sectionUnggahVideo === s.id && (
                              <p role="status" className="text-xs text-[#5e5e5e]">
                                Mengunggah dan memverifikasi video…
                              </p>
                            )}
                            {galatVideo && sectionUnggahVideo === s.id && (
                              <p role="alert" className="text-xs text-red-600">
                                {galatVideo}
                              </p>
                            )}
                            <p className="text-xs text-[#8f8f8f]">
                              Video diputar tanpa suara. Unggahan baru aktif setelah Hero disimpan.
                            </p>
                            <ImageUpload
                              label="Poster / gambar cadangan"
                              tipe="hero"
                              value={hero.posterUrl}
                              hint="Tampil jika video tidak dapat diputar."
                              onChange={(url) => ubahKonfig(s.id, { posterUrl: url ?? "" })}
                            />
                          </div>
                          <div className="order-1 min-w-0 lg:order-2">
                            <p className="mb-2 text-xs font-semibold text-[#5e5e5e]">
                              Pratinjau video
                            </p>
                            <video
                              key={hero.videoUrl}
                              src={hero.videoUrl}
                              poster={hero.posterUrl || HERO_POSTER_BAWAAN}
                              controls
                              muted
                              playsInline
                              className="aspect-video w-full rounded-xl bg-black object-cover"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-[#0f1012]">
                              {hero.mode === "foto" ? "Foto latar" : "Urutan foto slideshow"}
                            </p>
                            <p className="mt-1 text-xs text-[#8f8f8f]">
                              {hero.mode === "foto"
                                ? "Gunakan satu foto lanskap yang tetap tampil."
                                : "Foto berganti otomatis dengan transisi lembut setiap 6 detik. Maksimal 5 foto."}
                            </p>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {fotoYangDitampilkan.map((url, index) => (
                              <div key={`${url || "kosong"}-${index}`} className="space-y-2">
                                <ImageUpload
                                  label={`Foto ${index + 1}`}
                                  tipe="hero"
                                  value={url || null}
                                  onChange={(nilai) => ubahFoto(index, nilai)}
                                />
                                {url && hero.mode === "slideshow" && (
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      title="Geser foto ke kiri"
                                      aria-label={`Naikkan foto ${index + 1}`}
                                      disabled={index === 0}
                                      onClick={() => geserFoto(index, -1)}
                                      className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}
                                    >
                                      <ArrowUp weight="bold" />
                                      Naik
                                    </button>
                                    <button
                                      type="button"
                                      title="Geser foto ke kanan"
                                      aria-label={`Turunkan foto ${index + 1}`}
                                      disabled={index === hero.fotoUrls.length - 1}
                                      onClick={() => geserFoto(index, 1)}
                                      className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}
                                    >
                                      <ArrowDown weight="bold" />
                                      Turun
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {hero.mode === "slideshow" &&
                            hero.fotoUrls.length > 0 &&
                            hero.fotoUrls.length < 5 && (
                              <button
                                type="button"
                                onClick={() =>
                                  ubahKonfig(s.id, {
                                    fotoUrls: [...hero.fotoUrls, ""],
                                  })
                                }
                                className={`${tombolKecil} bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.18]`}
                              >
                                <Plus weight="bold" />
                                Tambah foto
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {s.kunci === "tentang-kami" && (() => {
                  const media = mediaTentang(d.konfigurasi);
                  const fotoYangDitampilkan = media.fotoUrls.length ? media.fotoUrls : [""];
                  const ubahFoto = (index: number, url: string | null) => {
                    const fotoUrls = [...media.fotoUrls];
                    if (url) fotoUrls[index] = url;
                    else fotoUrls.splice(index, 1);
                    ubahKonfig(s.id, { fotoUrl: fotoUrls[0] ?? "", fotoUrls });
                  };
                  const geserFoto = (index: number, arah: -1 | 1) => {
                    const tujuan = index + arah;
                    if (tujuan < 0 || tujuan >= media.fotoUrls.length) return;
                    const fotoUrls = [...media.fotoUrls];
                    [fotoUrls[index], fotoUrls[tujuan]] = [fotoUrls[tujuan], fotoUrls[index]];
                    ubahKonfig(s.id, { fotoUrl: fotoUrls[0] ?? "", fotoUrls });
                  };

                  return (
                    <div className="space-y-4 border-t border-black/[0.08] pt-4">
                      <div className="max-w-sm">
                        <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                          Media Tentang Kami
                        </label>
                        <select
                          value={media.mode}
                          onChange={(e) => {
                            const mode = e.target.value as ModeMediaTentang;
                            const fotoUrls = mode === "foto" ? media.fotoUrls.slice(0, 1) : media.fotoUrls;
                            ubahKonfig(s.id, { mode, fotoUrls, fotoUrl: fotoUrls[0] ?? "" });
                          }}
                          className={inputClass}
                        >
                          <option value="foto">Satu foto</option>
                          <option value="slideshow">Slideshow foto</option>
                          <option value="video">Video</option>
                        </select>
                      </div>

                      {media.mode === "video" ? (
                        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                          <div className="order-2 min-w-0 space-y-3 lg:order-1">
                            <label className="block text-xs font-semibold text-[#5e5e5e]">
                              Video (MP4 atau WebM, maksimal 30 MB)
                            </label>
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              disabled={mengunggahVideo}
                              onChange={(e) => {
                                const file = e.currentTarget.files?.[0];
                                if (file) void unggahVideo(file, s.id);
                                e.currentTarget.value = "";
                              }}
                              className={inputClass}
                            />
                            {mengunggahVideo && sectionUnggahVideo === s.id && <p role="status" className="text-xs text-[#5e5e5e]">Mengunggah dan memverifikasi video…</p>}
                            {galatVideo && sectionUnggahVideo === s.id && <p role="alert" className="text-xs text-red-600">{galatVideo}</p>}
                            <p className="text-xs text-[#8f8f8f]">Video diputar tanpa suara dan berulang. Simpan section untuk menerapkan.</p>
                            <ImageUpload
                              label="Poster / gambar cadangan"
                              tipe="beranda"
                              value={media.posterUrl || null}
                              hint="Ditampilkan saat video dimuat atau jika gerakan dikurangi."
                              onChange={(url) => ubahKonfig(s.id, { posterUrl: url ?? "" })}
                            />
                          </div>
                          <div className="order-1 min-w-0 lg:order-2">
                            <p className="mb-2 text-xs font-semibold text-[#5e5e5e]">Pratinjau video</p>
                            {media.videoUrl ? (
                              <video key={media.videoUrl} src={media.videoUrl} poster={media.posterUrl || undefined} controls muted playsInline className="aspect-video w-full rounded-xl bg-black object-cover" />
                            ) : (
                              <div className="flex aspect-video items-center justify-center rounded-xl bg-black/[0.05] text-sm text-[#8f8f8f]">Belum ada video</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-[#8f8f8f]">
                            {media.mode === "foto" ? "Gunakan satu foto yang tetap tampil." : "Foto berganti otomatis setiap 6 detik. Slideshow memerlukan 2 sampai 5 foto."}
                          </p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {fotoYangDitampilkan.map((url, index) => (
                              <div key={`${url || "kosong"}-${index}`} className="space-y-2">
                                <ImageUpload
                                  label={media.mode === "foto" ? "Foto Tentang Kami" : `Foto ${index + 1}`}
                                  tipe="beranda"
                                  value={url || null}
                                  hint={media.mode === "foto" ? "Kosongkan untuk memakai foto bawaan." : undefined}
                                  onChange={(nilai) => ubahFoto(index, nilai)}
                                />
                                {url && media.mode === "slideshow" && (
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button type="button" aria-label={`Naikkan foto ${index + 1}`} disabled={index === 0} onClick={() => geserFoto(index, -1)} className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}><ArrowUp weight="bold" />Naik</button>
                                    <button type="button" aria-label={`Turunkan foto ${index + 1}`} disabled={index === media.fotoUrls.length - 1} onClick={() => geserFoto(index, 1)} className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}><ArrowDown weight="bold" />Turun</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {media.mode === "slideshow" && media.fotoUrls.length > 0 && media.fotoUrls.length < 5 && (
                            <button type="button" onClick={() => ubahKonfig(s.id, { fotoUrls: [...media.fotoUrls, ""] })} className={`${tombolKecil} bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.18]`}><Plus weight="bold" />Tambah foto</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {s.kunci === "lima-cara" && (
                  <div className="space-y-3 border-t border-black/[0.08] pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0f1012]">
                        Poin &ldquo;lima cara kami menyambung&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => tambahItemLima(s.id)}
                        disabled={itemsLimaUntukEditor(d.konfigurasi).length >= 10}
                        className={`${tombolKecil} bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.18]`}
                      >
                        <Plus weight="bold" />
                        Tambah poin
                      </button>
                    </div>

                    {itemsLimaUntukEditor(d.konfigurasi).length === 0 ? (
                      <p className="text-xs text-[#5e5e5e]">
                        Belum ada poin — beranda memakai daftar bawaan.
                      </p>
                    ) : (
                      itemsLimaUntukEditor(d.konfigurasi).map((it, i) => (
                        <div
                          key={i}
                          className="grid min-w-0 gap-3 rounded-xl border border-black/[0.06] bg-white p-3 sm:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)]"
                        >
                          <div className="space-y-2">
                            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[#0f1012]">
                              <input
                                type="checkbox"
                                checked={it.tampilkanFoto}
                                onChange={(e) => ubahItemLima(s.id, i, { tampilkanFoto: e.target.checked })}
                                className="size-4 accent-[#0071e3]"
                              />
                              Tampilkan foto di beranda
                            </label>
                            {it.tampilkanFoto && <ImageUpload
                            label={`Foto panel ${i + 1}`}
                            tipe="beranda"
                            value={it.fotoUrl || null}
                            hint="Kosongkan untuk memakai foto bawaan."
                            onChange={(url) =>
                              ubahItemLima(s.id, i, { fotoUrl: url ?? "" })
                            }
                          />}
                          </div>
                          <div className="flex min-w-0 flex-col gap-2">
                            <input
                              type="text"
                              value={it.judul}
                              onChange={(e) =>
                                ubahItemLima(s.id, i, { judul: e.target.value })
                              }
                              placeholder={`Judul poin ${i + 1}`}
                              className={inputClass}
                            />
                            <textarea
                              rows={2}
                              value={it.deskripsi}
                              onChange={(e) =>
                                ubahItemLima(s.id, i, { deskripsi: e.target.value })
                              }
                              placeholder="Deskripsi"
                              className={inputClass}
                            />
                            <KontrolWarna
                              label={`Warna latar panel ${i + 1}`}
                              nilai={it.warnaLatar}
                              palet={PALET_WARNA_BACKGROUND}
                              onUbah={(warnaLatar) =>
                                ubahItemLima(s.id, i, { warnaLatar })
                              }
                            />
                            <button
                              type="button"
                              onClick={() => hapusItemLima(s.id, i)}
                              className={`${tombolKecil} self-end bg-red-50 text-red-600 hover:bg-red-100`}
                              aria-label={`Hapus poin ${i + 1}`}
                            >
                              <Trash weight="bold" /> Hapus poin
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {s.kunci === "kontak" && (
                  <div className="border-t border-black/[0.08] pt-4">
                    <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                      Email kanal resmi
                    </label>
                    <input
                      type="email"
                      value={emailKontak(d.konfigurasi)}
                      onChange={(e) => ubahKonfig(s.id, { email: e.target.value })}
                      placeholder="sekretariat@ikasada-fibui.or.id"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-[#8f8f8f]">
                      Dikosongkan = pakai email bawaan.
                    </p>
                  </div>
                )}

                {s.kunci === "sebaran-geografis" && (
                  <div className="grid grid-cols-1 gap-4 border-t border-black/[0.08] pt-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                        Nama titik asal
                      </label>
                      <input
                        type="text"
                        value={asalSebaran(d.konfigurasi).nama}
                        onChange={(e) => ubahAsal(s.id, { nama: e.target.value })}
                        placeholder="Indonesia"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                        Latitude asal
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={asalSebaran(d.konfigurasi).lat}
                        onChange={(e) => ubahAsal(s.id, { lat: e.target.value })}
                        placeholder="-6.4025"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                        Longitude asal
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={asalSebaran(d.konfigurasi).lng}
                        onChange={(e) => ubahAsal(s.id, { lng: e.target.value })}
                        placeholder="106.7942"
                        className={inputClass}
                      />
                    </div>
                    <p className="text-xs text-[#8f8f8f] sm:col-span-3">
                      Titik asal = pangkal semua busur di peta. Labelnya tampil
                      di peta.
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => simpanSection(s)}
                    disabled={
                      menyimpanSection === s.id ||
                      ((s.kunci === "hero" || s.kunci === "tentang-kami") && mengunggahVideo)
                    }
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#005fc1] disabled:opacity-60 sm:w-auto"
                  >
                    <Check weight="bold" />
                    {menyimpanSection === s.id ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Titik sebaran geografis */}
      <div className="min-w-0 space-y-4 rounded-2xl border border-black/[0.08] bg-[#fdfdfd] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <GlobeHemisphereWest weight="bold" /> Sebaran Geografis
            </h2>
            <p className="mt-1 text-sm text-[#5e5e5e]">
              Titik tujuan busur pada peta beranda. Busur digambar dari titik
              asal (almamater) ke tiap titik di bawah.
            </p>
          </div>
          <button
            type="button"
            onClick={bukaTitikBaru}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#005fc1]"
          >
            <Plus weight="bold" />
            Tambah titik
          </button>
        </div>

        {titik.length === 0 ? (
          <EmptyState
            title="Belum ada titik sebaran"
            description="Tambahkan titik (nama + koordinat) untuk menggambar busur di peta beranda."
            showAction={false}
          />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {titik.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0f1012]">
                    {t.nama}
                    {!t.aktif && (
                      <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5e5e5e]">
                        Nonaktif
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#5e5e5e]">
                    {t.lat}, {t.lng}
                    {t.keterangan ? ` · ${t.keterangan}` : ""} · urutan {t.urutan}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bukaTitikUbah(t)}
                    className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}
                  >
                    <Pencil weight="bold" />
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitikHapus(t)}
                    className={`${tombolKecil} bg-red-50 text-red-600 hover:bg-red-100`}
                  >
                    <Trash weight="bold" />
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog titik sebaran */}
      <Dialog
        terbuka={titikBuka}
        judul={titikEdit ? "Ubah titik sebaran" : "Tambah titik sebaran"}
        deskripsi="Nama tampil di peta, koordinat dalam derajat desimal (WGS84)."
        onTutup={() => setTitikBuka(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Nama</label>
            <input
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              placeholder="Contoh: Asia"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                placeholder="35.6762"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                placeholder="139.6503"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Keterangan (opsional)
            </label>
            <input
              value={form.keterangan}
              onChange={(e) =>
                setForm((f) => ({ ...f, keterangan: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">Urutan</label>
              <input
                type="number"
                min={0}
                max={999}
                value={form.urutan}
                onChange={(e) => setForm((f) => ({ ...f, urutan: e.target.value }))}
                className={inputClass}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#0071e3]"
                checked={form.aktif}
                onChange={(e) => setForm((f) => ({ ...f, aktif: e.target.checked }))}
              />
              Aktif
            </label>
          </div>

          {errorTitik && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
              <WarningCircle weight="bold" className="mt-0.5 shrink-0" />
              <span>{errorTitik}</span>
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setTitikBuka(false)}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={simpanTitik}
              disabled={isSimpanTitik}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#005fc1] disabled:opacity-60"
            >
              <Check weight="bold" />
              {isSimpanTitik ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(titikHapus)}
        title="Hapus titik sebaran ini?"
        message="Titik dihapus (soft) dan tidak lagi digambar di peta beranda."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isLoading={false}
        onConfirm={hapusTitik}
        onCancel={() => setTitikHapus(null)}
      />
    </div>
  );
}
