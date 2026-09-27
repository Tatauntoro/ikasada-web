"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Faders,
  Key,
  MagnifyingGlass,
  Prohibit,
  SealCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useIzin } from "@/components/admin/IzinProvider";
import { AKSI, MODUL } from "@/lib/permission";
import { formatTanggalWIB } from "@/lib/format";

/**
 * Antrean verifikasi akun alumni (Task 19).
 *
 * Satu-satunya halaman portal admin yang bekerja pada `AlumniAccount`, bukan
 * `Alumni`. Empat aksinya memakai endpoint yang sudah ada sejak Task 5 —
 * approve (wajib memilih record `Alumni`), reject, suspend, dan reset kata
 * sandi — sehingga pengurus tidak perlu lagi memanggil API manual.
 *
 * Aturan yang dipegang di sini:
 * - Satu `Alumni` hanya boleh punya satu akun; memilih record yang sudah
 *   tertaut akan dijawab `409` oleh server dan pesannya ditampilkan apa adanya.
 * - Kata sandi hasil reset **tidak pernah** dikembalikan server maupun
 *   ditampilkan di layar; admin menentukannya dan menyampaikannya sendiri.
 * - Setiap aksi memuat ulang daftar dari server, jadi status di layar tidak
 *   pernah mendahului kenyataan.
 */

type AkunAlumni = {
  id: string;
  email: string;
  status: string;
  namaLengkapSaatDaftar: string;
  angkatanSaatDaftar: number;
  programStudiSaatDaftar: string;
  consentDataAt: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  suspendedAt: string | null;
  lastLoginAt: string | null;
  alumni: {
    id: string;
    namaLengkap: string;
    angkatan: number;
    programStudi: string;
    status: string;
    email: string | null;
  } | null;
};

type KandidatAlumni = {
  id: string;
  namaLengkap: string;
  gelar: string | null;
  angkatan: number;
  profesi: string;
  programStudi: string;
  status: string;
  email: string | null;
};

type Meta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const FILTER_STATUS = [
  { value: "", label: "Semua Status" },
  { value: "PENDING", label: "Menunggu verifikasi" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "SUSPENDED", label: "Ditangguhkan" },
];

const PASSWORD_MIN = 8;

/** Bandingkan email tanpa peduli spasi/kapitalisasi. */
function normalEmail(nilai: string | null | undefined): string {
  return (nilai ?? "").trim().toLowerCase();
}

type PeringatanEmail = { jenis: "kosong" | "beda"; pesan: string };

/**
 * Peringatan saat mencocokkan akun dengan record alumni (tidak memblokir approve).
 *
 * `kosong` → server akan mengisi otomatis, tidak perlu konfirmasi.
 * `beda`   → admin boleh menimpa email record dengan email akun (opt-in).
 */
function peringatanEmail(
  emailAkun: string,
  kandidat: KandidatAlumni
): PeringatanEmail | null {
  const emailKandidat = normalEmail(kandidat.email);

  if (emailKandidat.length === 0) {
    return {
      jenis: "kosong",
      pesan: `Record alumni ini belum punya email. Setelah disetujui, email akun (${emailAkun}) akan otomatis dipakai sebagai email kontak pada record tersebut.`,
    };
  }

  if (normalEmail(emailAkun) !== emailKandidat) {
    return {
      jenis: "beda",
      pesan: `Email akun (${emailAkun}) berbeda dari email pada record alumni (${kandidat.email}). Pastikan ini orang yang sama sebelum menyetujui.`,
    };
  }

  return null;
}

/**
 * Kotak dialog berbasis `<dialog>` native: fokus terkurung, Escape menutup, dan
 * latar tidak bisa diakses keyboard tanpa perlu kode tambahan.
 */
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
        <p className="mt-1 text-sm text-[#5e5e5e]">
          {deskripsi}
        </p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}

export default function AlumniAccountsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { boleh } = useIzin();
  const bisaUbah = boleh(MODUL.VERIFIKASI_AKUN, AKSI.UBAH);

  const [data, setData] = useState<AkunAlumni[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [tolakId, setTolakId] = useState<string | null>(null);
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [setujuiUntuk, setSetujuiUntuk] = useState<AkunAlumni | null>(null);
  const [cariAlumni, setCariAlumni] = useState("");
  const [kandidat, setKandidat] = useState<KandidatAlumni[]>([]);
  const [isMencari, setIsMencari] = useState(false);
  const [terpilih, setTerpilih] = useState<KandidatAlumni | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  /** Centang "timpa email record dengan email akun" (hanya saat email berbeda). */
  const [samakanEmail, setSamakanEmail] = useState(false);

  const [resetUntuk, setResetUntuk] = useState<AkunAlumni | null>(null);
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [isReset, setIsReset] = useState(false);
  const [errorReset, setErrorReset] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "12");
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/alumni-accounts?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || "Gagal memuat daftar akun alumni");
        return;
      }

      setData(result.data ?? []);
      setMeta(result.meta ?? null);
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  /* Kandidat alumni untuk dialog approve: hanya PUBLISHED, dibatasi 10 hasil. */
  const cariKandidat = useCallback(async (kata: string) => {
    setIsMencari(true);
    const params = new URLSearchParams();
    params.set("limit", "10");
    params.set("status", "PUBLISHED");
    if (kata.trim()) params.set("search", kata.trim());

    try {
      const response = await fetch(`/api/admin/alumni?${params.toString()}`);
      const result = await response.json();
      setKandidat(response.ok ? (result.data ?? []) : []);
    } catch {
      setKandidat([]);
    } finally {
      setIsMencari(false);
    }
  }, []);

  useEffect(() => {
    if (!setujuiUntuk) return;

    const timer = setTimeout(() => {
      cariKandidat(cariAlumni);
    }, 350);

    return () => clearTimeout(timer);
  }, [cariAlumni, setujuiUntuk, cariKandidat]);

  async function jalankanAksi(
    id: string,
    aksi: "reject" | "suspend",
    pesanSukses: string
  ) {
    setIsProcessing(true);
    setError(null);
    setSukses(null);

    try {
      const response = await fetch(`/api/admin/alumni-accounts/${id}/${aksi}`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || "Aksi gagal dijalankan");
        return;
      }

      setTolakId(null);
      setSuspendId(null);
      setSukses(pesanSukses);
      fetchData();
    } catch {
      setError("Terjadi kesalahan jaringan saat menjalankan aksi.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleApprove() {
    if (!setujuiUntuk || !terpilih) {
      setError("Pilih record alumni yang cocok terlebih dahulu.");
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/alumni-accounts/${setujuiUntuk.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alumniId: terpilih.id, samakanEmail }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        const pesanField = result?.error?.fields?.alumniId;
        setError(pesanField || result?.error?.message || "Gagal menyetujui akun");
        return;
      }

      setSukses(
        `Akun ${setujuiUntuk.email} disetujui dan ditautkan ke ${terpilih.namaLengkap}.${
          samakanEmail
            ? " Email pada record alumni disamakan dengan email akun."
            : ""
        }`
      );
      tutupApprove();
      fetchData();
    } catch {
      setError("Terjadi kesalahan jaringan saat menyetujui akun.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReset() {
    if (!resetUntuk) return;

    if (password.length < PASSWORD_MIN) {
      setErrorReset(`Kata sandi minimal ${PASSWORD_MIN} karakter.`);
      return;
    }
    if (password !== konfirmasi) {
      setErrorReset("Konfirmasi kata sandi belum sama.");
      return;
    }

    setIsReset(true);
    setErrorReset(null);

    try {
      const response = await fetch(
        `/api/admin/alumni-accounts/${resetUntuk.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setErrorReset(
          result?.error?.fields?.password ||
            result?.error?.message ||
            "Gagal menyimpan kata sandi baru"
        );
        return;
      }

      setSukses(
        `Kata sandi ${resetUntuk.email} sudah diganti. Sampaikan kata sandi baru ke pemiliknya lewat jalur aman — layar ini tidak menampilkannya lagi.`
      );
      tutupReset();
      fetchData();
    } catch {
      setErrorReset("Terjadi kesalahan jaringan saat menyimpan kata sandi.");
    } finally {
      setIsReset(false);
    }
  }

  function tutupApprove() {
    setSetujuiUntuk(null);
    setTerpilih(null);
    setCariAlumni("");
    setKandidat([]);
    setSamakanEmail(false);
  }

  function tutupReset() {
    setResetUntuk(null);
    setPassword("");
    setKonfirmasi("");
    setErrorReset(null);
  }

  /* Peringatan lunak email akun vs record alumni pada dialog Setujui. */
  const pesanEmail =
    terpilih && setujuiUntuk
      ? peringatanEmail(setujuiUntuk.email, terpilih)
      : null;

  const columns = [
    {
      key: "pendaftar",
      header: "Pendaftar",
      cell: (row: AkunAlumni) => (
        <div className="min-w-0">
          <p className="font-semibold text-[#0f1012]">
            {row.namaLengkapSaatDaftar}
          </p>
          <p className="text-xs text-[#5e5e5e]">
            {row.email}
          </p>
        </div>
      ),
    },
    {
      key: "data",
      header: "Data pendaftaran",
      className: "hidden md:table-cell",
      cell: (row: AkunAlumni) => (
        <span className="text-sm">Angkatan {row.angkatanSaatDaftar}</span>
      ),
    },
    {
      key: "alumni",
      header: "Akun tertaut",
      className: "hidden lg:table-cell",
      cell: (row: AkunAlumni) =>
        row.alumni ? (
          <span className="text-sm">
            {row.alumni.namaLengkap}{" "}
            <span className="text-xs text-[#8f8f8f]">
              ({row.alumni.angkatan})
            </span>
          </span>
        ) : (
          <span className="text-[#8f8f8f]">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: AkunAlumni) => <StatusBadge status={row.status} />,
    },
    {
      key: "tanggal",
      header: "Daftar",
      className: "hidden sm:table-cell",
      cell: (row: AkunAlumni) => (
        <span className="text-xs text-[#5e5e5e]">
          {formatTanggalWIB(row.createdAt)}
        </span>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      cell: (row: AkunAlumni) => {
        if (!bisaUbah) {
          return <span className="text-xs text-[#8f8f8f]">—</span>;
        }

        const tombol =
          "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60";

        return (
          <div className="flex flex-wrap items-center gap-2">
            {row.status !== "ACTIVE" && (
              <button
                type="button"
                onClick={() => {
                  setSukses(null);
                  setError(null);
                  setSetujuiUntuk(row);
                  setSamakanEmail(false);
                }}
                className={`${tombol} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
              >
                <SealCheck weight="bold" />
                Setujui
              </button>
            )}

            {row.status === "PENDING" && (
              <button
                type="button"
                onClick={() => {
                  setSukses(null);
                  setTolakId(row.id);
                }}
                className={`${tombol} bg-red-50 text-red-600 hover:bg-red-100`}
              >
                <Prohibit weight="bold" />
                Tolak
              </button>
            )}

            {row.status === "ACTIVE" && (
              <button
                type="button"
                onClick={() => {
                  setSukses(null);
                  setSuspendId(row.id);
                }}
                className={`${tombol} bg-amber-50 text-amber-700 hover:bg-amber-100`}
              >
                <WarningCircle weight="bold" />
                Suspend
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSukses(null);
                setError(null);
                setResetUntuk(row);
              }}
              className={`${tombol} bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/[0.16]`}
            >
              <Key weight="bold" />
              Reset sandi
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#0f1012] lg:text-3xl">
            Verifikasi Akun Alumni
          </h1>
          <p className="mt-1 text-sm text-[#5e5e5e]">
            Cocokkan pendaftar dengan data alumni, lalu setujui, tolak, atau
            tangguhkan akunnya.
          </p>
        </div>

        <div className="relative">
          <Faders
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
          />
          <select
            aria-label="Filter status akun"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
              setSukses(null);
            }}
            className="appearance-none rounded-xl border border-black/[0.08] bg-[#fdfdfd] py-2.5 pl-10 pr-8 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            {FILTER_STATUS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
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
              title="Tidak ada akun pada filter ini"
              description="Belum ada pendaftar yang perlu ditangani, atau semua akun di filter ini sudah selesai diproses."
              showAction={false}
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
          onPageChange={(halaman) => setPage(halaman)}
        />
      )}

      {/* Setujui: pilih record alumni yang dicocokkan */}
      <Dialog
        terbuka={Boolean(setujuiUntuk)}
        judul="Setujui akun alumni"
        deskripsi={`Pilih record alumni yang cocok untuk ${setujuiUntuk?.namaLengkapSaatDaftar ?? ""} (${setujuiUntuk?.email ?? ""}). Satu alumni hanya boleh punya satu akun.`}
        onTutup={tutupApprove}
      >
        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlass
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
            />
            <input
              type="text"
              value={cariAlumni}
              onChange={(event) => setCariAlumni(event.target.value)}
              aria-label="Cari data alumni"
              placeholder="Cari nama atau profesi alumni..."
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] py-2.5 pl-10 pr-4 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-black/[0.08]">
            {isMencari ? (
              <p className="p-4 text-sm text-[#5e5e5e]">
                Mencari...
              </p>
            ) : kandidat.length === 0 ? (
              <p className="p-4 text-sm text-[#5e5e5e]">
                Tidak ada data alumni yang cocok.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {kandidat.map((item) => {
                  const dipilih = terpilih?.id === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setTerpilih(item);
                          // Peringatan/centang mengikuti kandidat yang dipilih.
                          setSamakanEmail(false);
                        }}
                        aria-pressed={dipilih}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                          dipilih
                            ? "bg-[#0071e3]/10"
                            : "hover:bg-black/[0.04]"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {item.namaLengkap}
                            {item.gelar ? `, ${item.gelar}` : ""}
                          </span>
                          <span className="block text-xs text-[#5e5e5e]">
                            {item.profesi} · Angkatan {item.angkatan}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#8f8f8f]">
                            {item.email
                              ? item.email
                              : "Email direktori belum diisi"}
                          </span>
                        </span>
                        {dipilih && <Check weight="bold" className="text-[#0071e3]" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {pesanEmail && (
            <div
              className={`flex flex-col gap-3 rounded-xl border p-3 text-xs leading-[1.4] ${
                pesanEmail.jenis === "beda"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-[#c8d9ee] bg-[#f3f7fd] text-[#005bbb]"
              }`}
            >
              <p role="status" className="flex items-start gap-2">
                <WarningCircle
                  weight="bold"
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{pesanEmail.pesan}</span>
              </p>

              {pesanEmail.jenis === "beda" && (
                <label className="flex items-start gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={samakanEmail}
                    onChange={(event) => setSamakanEmail(event.target.checked)}
                    className="mt-0.5 h-4 w-4 flex-none accent-[#0071e3]"
                  />
                  <span>
                    Timpa email record alumni dengan email akun (
                    {setujuiUntuk?.email}).
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={tutupApprove}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold text-[#0f1012] transition-colors hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || !terpilih}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#005fc1] disabled:opacity-60"
            >
              <SealCheck weight="bold" />
              {isApproving ? "Menyetujui..." : "Setujui & tautkan"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Reset kata sandi manual */}
      <Dialog
        terbuka={Boolean(resetUntuk)}
        judul="Reset kata sandi"
        deskripsi={`Tentukan kata sandi baru untuk ${resetUntuk?.email ?? ""}. Pemilik akun memakainya untuk masuk; kata sandi tidak ditampilkan lagi setelah disimpan.`}
        onTutup={tutupReset}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="password-baru" className="mb-1 block text-sm font-semibold">
              Kata sandi baru
            </label>
            <input
              id="password-baru"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-2.5 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
            <p className="mt-1 text-xs text-[#5e5e5e]">
              Minimal {PASSWORD_MIN} karakter.
            </p>
          </div>

          <div>
            <label htmlFor="password-konfirmasi" className="mb-1 block text-sm font-semibold">
              Ulangi kata sandi baru
            </label>
            <input
              id="password-konfirmasi"
              type="password"
              autoComplete="new-password"
              value={konfirmasi}
              onChange={(event) => setKonfirmasi(event.target.value)}
              className="w-full rounded-xl border border-black/[0.08] bg-[#fdfdfd] px-4 py-2.5 text-[#0f1012] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
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
              onClick={tutupReset}
              className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-sm font-semibold text-[#0f1012] transition-colors hover:bg-black/[0.06]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isReset}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#005fc1] disabled:opacity-60"
            >
              <Key weight="bold" />
              {isReset ? "Menyimpan..." : "Simpan kata sandi"}
            </button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(tolakId)}
        title="Tolak pendaftaran?"
        message="Akun tidak dihapus, hanya ditandai ditolak. Pendaftar tidak bisa masuk, dan pengurus masih bisa menyetujuinya nanti."
        confirmLabel="Ya, Tolak"
        cancelLabel="Batal"
        isLoading={isProcessing}
        onConfirm={() =>
          tolakId && jalankanAksi(tolakId, "reject", "Pendaftaran ditolak.")
        }
        onCancel={() => setTolakId(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(suspendId)}
        title="Tangguhkan akun ini?"
        message="Akun langsung kehilangan akses ke seluruh fitur jejaring, walau sesinya masih berjalan. Koneksi dan data yang sudah ada tidak dihapus."
        confirmLabel="Ya, Tangguhkan"
        cancelLabel="Batal"
        isLoading={isProcessing}
        onConfirm={() =>
          suspendId && jalankanAksi(suspendId, "suspend", "Akun ditangguhkan.")
        }
        onCancel={() => setSuspendId(null)}
      />
    </div>
  );
}
