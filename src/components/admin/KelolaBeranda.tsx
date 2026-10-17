"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
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

/**
 * Kelola Beranda: atur section beranda (tampil/tidak, urutan, teks) dan titik
 * sebaran geografis pada peta. Penegakan izin sebenarnya di server
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
  ukuranJudul: string;
  ukuranEyebrow: string;
  konfigurasi: Record<string, unknown>;
};

type ItemLima = { judul: string; deskripsi: string };

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-3 py-2 text-sm text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";
const tombolKecil =
  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60";

function labelSection(kunci: string): string {
  return kunciValid(kunci) ? DEFAULT_PER_KUNCI[kunci].label : kunci;
}

function konfigurasiDari(nilai: unknown): Record<string, unknown> {
  if (nilai && typeof nilai === "object" && !Array.isArray(nilai)) {
    return { ...(nilai as Record<string, unknown>) };
  }
  return {};
}

function itemsLima(konfig: Record<string, unknown>): ItemLima[] {
  const items = konfig.items;
  if (!Array.isArray(items)) return [];
  return items.map((x) => {
    const o = (x ?? {}) as { judul?: unknown; deskripsi?: unknown };
    return { judul: String(o.judul ?? ""), deskripsi: String(o.deskripsi ?? "") };
  });
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
}: {
  label: string;
  nilai: string;
  onUbah: (nilaiBaru: string) => void;
}) {
  const aktif = (hex: string) => nilai.trim().toLowerCase() === hex.toLowerCase();

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {PALET_WARNA.map((w) => (
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
      const items = itemsLima(d.konfigurasi).map((x, i) =>
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
      const items = itemsLima(d.konfigurasi);
      if (items.length >= 10) return prev;
      return {
        ...prev,
        [id]: {
          ...d,
          konfigurasi: {
            ...d.konfigurasi,
            items: [...items, { judul: "", deskripsi: "" }],
          },
        },
      };
    });
  }

  function hapusItemLima(id: string, index: number) {
    setDraft((prev) => {
      const d = prev[id];
      const items = itemsLima(d.konfigurasi).filter((_, i) => i !== index);
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
      body: {
        aktif: d.aktif,
        urutan: Number(d.urutan) || 0,
        eyebrow: d.eyebrow.trim() || null,
        judul: d.judul.trim() || null,
        deskripsi: d.deskripsi.trim() || null,
        warnaJudul: d.warnaJudul.trim() || null,
        warnaEyebrow: d.warnaEyebrow.trim() || null,
        ukuranJudul: d.ukuranJudul.trim() ? Number(d.ukuranJudul) : null,
        ukuranEyebrow: d.ukuranEyebrow.trim() ? Number(d.ukuranEyebrow) : null,
        // Section dengan data khas (lima-cara / kontak / sebaran-geografis)
        // ikut menyimpan config.
        ...(s.kunci === "lima-cara" ||
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
    setSukses(`Section "${labelSection(s.kunci)}" disimpan.`);
    muat();
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
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-[#0f1012] lg:text-3xl">
          Kelola Beranda
        </h1>
        <p className="mt-1 text-sm text-[#5e5e5e]">
          Atur section beranda (tampil/tidak, urutan, teks) dan titik sebaran
          geografis pada peta. Angka statistik &amp; sebaran angkatan mengikuti
          data alumni/kegiatan secara otomatis.
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
        <div className="space-y-4">
          {section.map((s) => {
            const d = draft[s.id] ?? draftDari(s);
            return (
              <div
                key={s.id}
                className="space-y-4 rounded-2xl border border-black/[0.08] bg-[#fdfdfd] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#0f1012]">
                    {labelSection(s.kunci)}
                  </h2>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f1012]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0071e3]"
                      checked={d.aktif}
                      onChange={(e) => ubahDraft(s.id, { aktif: e.target.checked })}
                    />
                    Tampilkan di beranda
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {SECTION_POSISI.some((k) => k === s.kunci) && (
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
                  {SECTION_PAKAI_EYEBROW.some((k) => k === s.kunci) && (
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
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                      Judul
                    </label>
                    <input
                      type="text"
                      value={d.judul}
                      onChange={(e) => ubahDraft(s.id, { judul: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  {SECTION_PAKAI_DESKRIPSI.some((k) => k === s.kunci) && (
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-[#5e5e5e]">
                        Deskripsi
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
                  <div className="sm:col-span-2">
                    <KontrolWarna
                      label="Warna judul"
                      nilai={d.warnaJudul}
                      onUbah={(v) => ubahDraft(s.id, { warnaJudul: v })}
                    />
                  </div>
                  {SECTION_PAKAI_EYEBROW.some((k) => k === s.kunci) && (
                    <div className="sm:col-span-2">
                      <KontrolWarna
                        label="Warna eyebrow"
                        nilai={d.warnaEyebrow}
                        onUbah={(v) => ubahDraft(s.id, { warnaEyebrow: v })}
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <KontrolUkuran
                      label="Ukuran judul (%)"
                      nilai={d.ukuranJudul}
                      onUbah={(v) => ubahDraft(s.id, { ukuranJudul: v })}
                    />
                  </div>
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

                {s.kunci === "lima-cara" && (
                  <div className="space-y-3 border-t border-black/[0.08] pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0f1012]">
                        Poin &ldquo;lima cara kami menyambung&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => tambahItemLima(s.id)}
                        disabled={itemsLima(d.konfigurasi).length >= 10}
                        className={`${tombolKecil} bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.18]`}
                      >
                        <Plus weight="bold" />
                        Tambah poin
                      </button>
                    </div>

                    {itemsLima(d.konfigurasi).length === 0 ? (
                      <p className="text-xs text-[#5e5e5e]">
                        Belum ada poin — beranda memakai daftar bawaan.
                      </p>
                    ) : (
                      itemsLima(d.konfigurasi).map((it, i) => (
                        <div
                          key={i}
                          className="flex flex-col gap-2 sm:flex-row sm:items-start"
                        >
                          <input
                            type="text"
                            value={it.judul}
                            onChange={(e) =>
                              ubahItemLima(s.id, i, { judul: e.target.value })
                            }
                            placeholder={`Judul poin ${i + 1}`}
                            className={`${inputClass} sm:w-56`}
                          />
                          <textarea
                            rows={2}
                            value={it.deskripsi}
                            onChange={(e) =>
                              ubahItemLima(s.id, i, { deskripsi: e.target.value })
                            }
                            placeholder="Deskripsi"
                            className={`${inputClass} flex-1`}
                          />
                          <button
                            type="button"
                            onClick={() => hapusItemLima(s.id, i)}
                            className={`${tombolKecil} bg-red-50 text-red-600 hover:bg-red-100`}
                            aria-label={`Hapus poin ${i + 1}`}
                          >
                            <Trash weight="bold" />
                          </button>
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
                    disabled={menyimpanSection === s.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#005fc1] disabled:opacity-60"
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
      <div className="space-y-4 rounded-2xl border border-black/[0.08] bg-[#fdfdfd] p-5">
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
