"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  EnvelopeSimple,
  Key,
  Pencil,
  Plus,
  Prohibit,
  SealCheck,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { DataTable } from "./DataTable";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./TableSkeleton";
import { ConfirmDialog } from "./ConfirmDialog";
import { panggilApi, type ApiError } from "@/lib/api-client";
import { formatTanggalWIB } from "@/lib/format";
import {
  LABEL_AKSI,
  MODUL_INFO,
  type AksiSlug,
  type Izin,
  type ModulSlug,
} from "@/lib/permission";

/**
 * Kelola Admin (khusus superadmin).
 *
 * Daftar akun admin + tambah admin, ubah role, aktif/nonaktif, atur izin
 * (matrix modul × aksi), dan reset kata sandi. Tanpa hard-delete: `AdminUser`
 * direferensikan `createdById` di banyak tabel, jadi akun dinonaktifkan.
 *
 * Semua endpoint-nya dijaga `requireSuperadmin()` di server; halaman ini hanya
 * menyembunyikan/menampilkan kontrol.
 */

type AdminItem = {
  id: string;
  nama: string;
  email: string;
  role: "SUPERADMIN" | "ADMIN";
  isAktif: boolean;
  permissions: Izin | null;
  createdAt: string;
  lastLoginAt: string | null;
  /** Aktivitas terbaru admin ini (kalimat siap tampil), dipisah dari login. */
  aktivitasTerakhir?: { kalimat: string; waktu: string } | null;
};

const PASSWORD_MIN = 8;

/** Ringkasan izin untuk kolom tabel: "3 modul" atau "—". */
function ringkasIzin(izin: Izin | null): string {
  const jumlah = izin
    ? Object.values(izin).filter((a) => Array.isArray(a) && a.length > 0).length
    : 0;
  return jumlah > 0 ? `${jumlah} modul` : "—";
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

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-2.5 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]";
const tombolKecil =
  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60";

export function KelolaAdmin() {
  const [data, setData] = useState<AdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [buatBuka, setBuatBuka] = useState(false);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [izinUntuk, setIzinUntuk] = useState<AdminItem | null>(null);
  const [izinLokal, setIzinLokal] = useState<Izin>({});
  const [isMenyimpanIzin, setIsMenyimpanIzin] = useState(false);

  const [resetUntuk, setResetUntuk] = useState<AdminItem | null>(null);
  const [sandiBaru, setSandiBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [isReset, setIsReset] = useState(false);
  const [errorReset, setErrorReset] = useState<string | null>(null);

  const [emailUntuk, setEmailUntuk] = useState<AdminItem | null>(null);
  const [emailBaru, setEmailBaru] = useState("");
  const [isSimpanEmail, setIsSimpanEmail] = useState(false);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);

  const [namaUntuk, setNamaUntuk] = useState<AdminItem | null>(null);
  const [namaBaru, setNamaBaru] = useState("");
  const [isSimpanNama, setIsSimpanNama] = useState(false);
  const [errorNama, setErrorNama] = useState<string | null>(null);

  const [nonaktifUntuk, setNonaktifUntuk] = useState<AdminItem | null>(null);
  const [isProses, setIsProses] = useState(false);

  const [pesanError, setPesanError] = useState<Record<string, string>>({});

  const muat = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const hasil = await panggilApi<AdminItem[]>("/api/admin/admin-users");
    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }
    setData(hasil.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  function terapkanError(apiError: ApiError, fallback: string) {
    if (apiError.fields) setPesanError(apiError.fields);
    return apiError.message || fallback;
  }

  async function handleBuat() {
    setErrorForm(null);
    setPesanError({});
    setIsSaving(true);
    const hasil = await panggilApi<AdminItem>("/api/admin/admin-users", {
      method: "POST",
      body: { nama: nama.trim(), email: email.trim(), password },
    });
    setIsSaving(false);
    if (!hasil.ok) {
      setErrorForm(terapkanError(hasil.error, "Gagal membuat admin."));
      return;
    }
    setSukses(`Admin ${email.trim()} dibuat dengan izin kosong. Atur izinnya di daftar.`);
    setBuatBuka(false);
    setNama("");
    setEmail("");
    setPassword("");
    muat();
  }

  async function patch(id: string, body: unknown, pesanSukses: string) {
    setIsProses(true);
    const hasil = await panggilApi<AdminItem>(`/api/admin/admin-users/${id}`, {
      method: "PATCH",
      body,
    });
    setIsProses(false);
    if (!hasil.ok) {
      setError(hasil.error.message);
      return false;
    }
    setSukses(pesanSukses);
    muat();
    return true;
  }

  async function handleSimpanIzin() {
    if (!izinUntuk) return;
    setIsMenyimpanIzin(true);
    setIsProses(true);
    const hasil = await panggilApi<AdminItem>(
      `/api/admin/admin-users/${izinUntuk.id}`,
      { method: "PATCH", body: { permissions: izinLokal } }
    );
    setIsMenyimpanIzin(false);
    setIsProses(false);
    if (!hasil.ok) {
      setError(hasil.error.message);
      return;
    }
    setSukses(`Izin ${izinUntuk.email} disimpan.`);
    setIzinUntuk(null);
    muat();
  }

  async function handleReset() {
    if (!resetUntuk) return;
    if (sandiBaru.length < PASSWORD_MIN) {
      setErrorReset(`Kata sandi minimal ${PASSWORD_MIN} karakter.`);
      return;
    }
    if (sandiBaru !== konfirmasi) {
      setErrorReset("Konfirmasi kata sandi belum sama.");
      return;
    }
    setIsReset(true);
    setErrorReset(null);
    const hasil = await panggilApi<{ message: string }>(
      `/api/admin/admin-users/${resetUntuk.id}/reset-password`,
      { method: "POST", body: { password: sandiBaru } }
    );
    setIsReset(false);
    if (!hasil.ok) {
      setErrorReset(hasil.error.message || "Gagal reset kata sandi.");
      return;
    }
    setSukses(`Kata sandi ${resetUntuk.email} sudah diganti.`);
    setResetUntuk(null);
    setSandiBaru("");
    setKonfirmasi("");
  }

  async function handleUbahEmail() {
    if (!emailUntuk) return;
    const email = emailBaru.trim().toLowerCase();
    if (!email) {
      setErrorEmail("Email wajib diisi.");
      return;
    }

    setIsSimpanEmail(true);
    setErrorEmail(null);
    const hasil = await panggilApi<AdminItem>(
      `/api/admin/admin-users/${emailUntuk.id}`,
      { method: "PATCH", body: { email } }
    );
    setIsSimpanEmail(false);

    if (!hasil.ok) {
      setErrorEmail(hasil.error.fields?.email ?? hasil.error.message);
      return;
    }

    setSukses(`Email ${emailUntuk.nama} diubah menjadi ${email}.`);
    setEmailUntuk(null);
    setEmailBaru("");
    muat();
  }

  async function handleUbahNama() {
    if (!namaUntuk) return;
    const nama = namaBaru.trim();
    if (nama.length < 3) {
      setErrorNama("Nama minimal 3 karakter.");
      return;
    }

    setIsSimpanNama(true);
    setErrorNama(null);
    const hasil = await panggilApi<AdminItem>(
      `/api/admin/admin-users/${namaUntuk.id}`,
      { method: "PATCH", body: { nama } }
    );
    setIsSimpanNama(false);

    if (!hasil.ok) {
      setErrorNama(hasil.error.fields?.nama ?? hasil.error.message);
      return;
    }

    setSukses(`Nama ${namaUntuk.email} diubah menjadi ${nama}.`);
    setNamaUntuk(null);
    setNamaBaru("");
    muat();
  }

  function toggleAksi(modul: ModulSlug, aksi: AksiSlug) {
    setIzinLokal((prev) => {
      const daftar = new Set(prev[modul] ?? []);
      if (daftar.has(aksi)) daftar.delete(aksi);
      else daftar.add(aksi);
      const berikut = { ...prev };
      if (daftar.size === 0) delete berikut[modul];
      else berikut[modul] = [...daftar];
      return berikut;
    });
  }

  const columns = [
    {
      key: "admin",
      header: "Admin",
      cell: (row: AdminItem) => (
        <div className="min-w-0">
          <p className="font-semibold text-[#0f1012]">{row.nama}</p>
          <p className="text-xs text-[#5e5e5e]">{row.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row: AdminItem) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            row.role === "SUPERADMIN"
              ? "bg-[#0071e3]/10 text-[#0071e3]"
              : "bg-black/[0.05] text-[#5e5e5e]"
          }`}
        >
          {row.role === "SUPERADMIN" ? "Superadmin" : "Admin"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: AdminItem) => (
        <span
          className={`text-xs font-semibold ${
            row.isAktif ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {row.isAktif ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "izin",
      header: "Izin",
      className: "hidden md:table-cell",
      cell: (row: AdminItem) =>
        row.role === "SUPERADMIN" ? (
          <span className="text-xs text-[#5e5e5e]">Penuh</span>
        ) : (
          <span className="text-xs text-[#5e5e5e]">
            {ringkasIzin(row.permissions)}
          </span>
        ),
    },
    {
      key: "login",
      header: "Login terakhir",
      className: "hidden lg:table-cell",
      cell: (row: AdminItem) => (
        <span className="text-xs text-[#5e5e5e]">
          {row.lastLoginAt ? formatTanggalWIB(row.lastLoginAt) : "—"}
        </span>
      ),
    },
    {
      key: "aktivitas",
      header: "Aktivitas terakhir",
      className: "hidden xl:table-cell",
      cell: (row: AdminItem) => (
        <span
          className="text-xs text-[#5e5e5e]"
          title={
            row.aktivitasTerakhir
              ? formatTanggalWIB(row.aktivitasTerakhir.waktu)
              : undefined
          }
        >
          {row.aktivitasTerakhir ? row.aktivitasTerakhir.kalimat : "—"}
        </span>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      cell: (row: AdminItem) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSukses(null);
              setError(null);
              setIzinUntuk(row);
              setIzinLokal(row.permissions ?? {});
            }}
            className={`${tombolKecil} bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.18]`}
          >
            <ShieldCheck weight="bold" />
            Atur izin
          </button>

          <button
            type="button"
            onClick={() => {
              setSukses(null);
              setError(null);
              setErrorNama(null);
              setNamaUntuk(row);
              setNamaBaru(row.nama);
            }}
            className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}
          >
            <Pencil weight="bold" />
            Ubah nama
          </button>

          <button
            type="button"
            onClick={() => {
              setSukses(null);
              setError(null);
              setErrorEmail(null);
              setEmailUntuk(row);
              setEmailBaru(row.email);
            }}
            className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}
          >
            <EnvelopeSimple weight="bold" />
            Ubah email
          </button>

          <select
            aria-label={`Role ${row.nama}`}
            value={row.role}
            disabled={isProses}
            onChange={(e) =>
              patch(
                row.id,
                { role: e.target.value },
                `Role ${row.email} diubah.`
              )
            }
            className="rounded-lg border border-black/[0.08] bg-[#fdfdfd] px-2 py-1.5 text-xs font-semibold"
          >
            <option value="ADMIN">Admin</option>
            <option value="SUPERADMIN">Superadmin</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSukses(null);
              setError(null);
              setResetUntuk(row);
            }}
            className={`${tombolKecil} bg-black/[0.05] text-[#0f1012] hover:bg-black/[0.08]`}
          >
            <Key weight="bold" />
            Reset sandi
          </button>

          {row.isAktif ? (
            <button
              type="button"
              onClick={() => {
                setSukses(null);
                setError(null);
                setNonaktifUntuk(row);
              }}
              className={`${tombolKecil} bg-amber-50 text-amber-700 hover:bg-amber-100`}
            >
              <Prohibit weight="bold" />
              Nonaktifkan
            </button>
          ) : (
            <button
              type="button"
              disabled={isProses}
              onClick={() =>
                patch(row.id, { isAktif: true }, `${row.email} diaktifkan lagi.`)
              }
              className={`${tombolKecil} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
            >
              <SealCheck weight="bold" />
              Aktifkan
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#0f1012] lg:text-3xl">
            Kelola Admin
          </h1>
          <p className="mt-1 text-sm text-[#5e5e5e]">
            Tambah akun admin, atur role, aktif/nonaktif, dan izin akses per
            modul. Hanya superadmin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSukses(null);
            setError(null);
            setErrorForm(null);
            setBuatBuka(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#005fc1]"
        >
          <Plus weight="bold" />
          Tambah admin
        </button>
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
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(row) => row.id}
          emptyState={
            <EmptyState
              title="Belum ada admin"
              description="Tambahkan akun admin dan atur izinnya."
              showAction={false}
            />
          }
        />
      )}

      {/* Tambah admin */}
      <Dialog
        terbuka={buatBuka}
        judul="Tambah admin"
        deskripsi="Akun baru dibuat dengan role Admin dan izin kosong."
        onTutup={() => setBuatBuka(false)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="admin-nama" className="mb-1 block text-sm font-semibold">
              Nama
            </label>
            <input
              id="admin-nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className={inputClass}
            />
            {pesanError.nama && (
              <p className="mt-1 text-xs text-red-600">{pesanError.nama}</p>
            )}
          </div>
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-sm font-semibold">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            {pesanError.email && (
              <p className="mt-1 text-xs text-red-600">{pesanError.email}</p>
            )}
          </div>
          <div>
            <label htmlFor="admin-sandi" className="mb-1 block text-sm font-semibold">
              Kata sandi awal
            </label>
            <input
              id="admin-sandi"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[#5e5e5e]">
              Minimal {PASSWORD_MIN} karakter.
            </p>
            {pesanError.password && (
              <p className="mt-1 text-xs text-red-600">{pesanError.password}</p>
            )}
          </div>

          {errorForm && (
            <p role="alert" className="text-sm text-red-600">
              {errorForm}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setBuatBuka(false)}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleBuat}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#005fc1] disabled:opacity-60"
            >
              <Plus weight="bold" />
              {isSaving ? "Menyimpan..." : "Buat admin"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Atur izin */}
      <Dialog
        terbuka={Boolean(izinUntuk)}
        judul="Atur izin"
        deskripsi={`Pilih modul dan aksi yang boleh diakses ${izinUntuk?.email ?? ""}.`}
        onTutup={() => setIzinUntuk(null)}
      >
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {MODUL_INFO.map((info) => (
            <div
              key={info.slug}
              className="rounded-xl border border-black/[0.08] p-3"
            >
              <p className="text-sm font-semibold">{info.label}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {info.aksi.map((aksi) => (
                  <label
                    key={aksi}
                    className="inline-flex items-center gap-1.5 text-xs text-[#0f1012]"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0071e3]"
                      checked={(izinLokal[info.slug] ?? []).includes(aksi)}
                      onChange={() => toggleAksi(info.slug, aksi)}
                    />
                    {LABEL_AKSI[aksi]}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-[#5e5e5e]">
            Catatan: tanpa centang “Lihat”, menu modul itu tidak muncul dan
            halamannya dialihkan.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setIzinUntuk(null)}
            className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSimpanIzin}
            disabled={isMenyimpanIzin}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#005fc1] disabled:opacity-60"
          >
            <Check weight="bold" />
            {isMenyimpanIzin ? "Menyimpan..." : "Simpan izin"}
          </button>
        </div>
      </Dialog>

      {/* Reset kata sandi */}
      <Dialog
        terbuka={Boolean(resetUntuk)}
        judul="Reset kata sandi admin"
        deskripsi={`Tentukan kata sandi baru untuk ${resetUntuk?.email ?? ""}. Kata sandi tidak ditampilkan lagi setelah disimpan.`}
        onTutup={() => setResetUntuk(null)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="sandi-baru" className="mb-1 block text-sm font-semibold">
              Kata sandi baru
            </label>
            <input
              id="sandi-baru"
              type="password"
              autoComplete="new-password"
              value={sandiBaru}
              onChange={(e) => setSandiBaru(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[#5e5e5e]">
              Minimal {PASSWORD_MIN} karakter.
            </p>
          </div>
          <div>
            <label htmlFor="sandi-konfirmasi" className="mb-1 block text-sm font-semibold">
              Ulangi kata sandi baru
            </label>
            <input
              id="sandi-konfirmasi"
              type="password"
              autoComplete="new-password"
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              className={inputClass}
            />
          </div>

          {errorReset && (
            <p role="alert" className="text-sm text-red-600">
              {errorReset}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setResetUntuk(null)}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isReset}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#005fc1] disabled:opacity-60"
            >
              <Key weight="bold" />
              {isReset ? "Menyimpan..." : "Simpan kata sandi"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Ubah nama */}
      <Dialog
        terbuka={Boolean(namaUntuk)}
        judul="Ubah nama admin"
        deskripsi={`Nama tampilan untuk ${namaUntuk?.email ?? ""}.`}
        onTutup={() => setNamaUntuk(null)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="admin-nama-baru" className="mb-1 block text-sm font-semibold">
              Nama
            </label>
            <input
              id="admin-nama-baru"
              type="text"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[#5e5e5e]">Minimal 3 karakter.</p>
          </div>

          {errorNama && (
            <p role="alert" className="text-sm text-red-600">
              {errorNama}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setNamaUntuk(null)}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleUbahNama}
              disabled={isSimpanNama}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#005fc1] disabled:opacity-60"
            >
              <Check weight="bold" />
              {isSimpanNama ? "Menyimpan..." : "Simpan nama"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Ubah email */}
      <Dialog
        terbuka={Boolean(emailUntuk)}
        judul="Ubah email admin"
        deskripsi={`Email login untuk ${emailUntuk?.nama ?? ""}. Setelah diubah, gunakan email baru untuk masuk.`}
        onTutup={() => setEmailUntuk(null)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="admin-email-baru" className="mb-1 block text-sm font-semibold">
              Email baru
            </label>
            <input
              id="admin-email-baru"
              type="email"
              autoComplete="email"
              value={emailBaru}
              onChange={(e) => setEmailBaru(e.target.value)}
              className={inputClass}
            />
          </div>

          {errorEmail && (
            <p role="alert" className="text-sm text-red-600">
              {errorEmail}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEmailUntuk(null)}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleUbahEmail}
              disabled={isSimpanEmail}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#005fc1] disabled:opacity-60"
            >
              <Check weight="bold" />
              {isSimpanEmail ? "Menyimpan..." : "Simpan email"}
            </button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(nonaktifUntuk)}
        title="Nonaktifkan admin ini?"
        message="Admin tidak bisa login dan sesi berjalannya langsung ditolak. Akun tidak dihapus dan bisa diaktifkan lagi."
        confirmLabel="Ya, Nonaktifkan"
        cancelLabel="Batal"
        isLoading={isProses}
        onConfirm={() => {
          if (!nonaktifUntuk) return;
          const target = nonaktifUntuk;
          setNonaktifUntuk(null);
          patch(target.id, { isAktif: false }, `${target.email} dinonaktifkan.`);
        }}
        onCancel={() => setNonaktifUntuk(null)}
      />

      {pesanError.root && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <WarningCircle weight="bold" className="mt-0.5 shrink-0" />
          <span>{pesanError.root}</span>
        </div>
      )}
    </div>
  );
}
