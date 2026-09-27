"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowRight,
  ArrowsCounterClockwise,
  Briefcase,
  Handshake,
  LockKey,
  MagnifyingGlass,
  UserMinus,
} from "@phosphor-icons/react";
import type {
  PublicAlumniDirektori,
  PublicSektorIndustri,
} from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { getInitials } from "@/lib/format";
import type { StatusKoneksi } from "@/lib/connection";
import { StateCrossfade } from "./motion/StateCrossfade";
import { reportAssetError } from "@/lib/asset-error";
import Pagination from "./Pagination";
import FilterSelect from "./FilterSelect";
import {
  ConnectionButton,
  ConnectionRequestDialog,
  LabelTanpaAkunJejaring,
} from "./alumni/ConnectionButton";

const angkatanRanges = [
  { value: "lte:1980", label: "Angkatan 1980 dan sebelumnya" },
  { value: "1981-1989", label: "Angkatan 1981 - 1989" },
  { value: "1990-2000", label: "Angkatan 1990 - 2000" },
  { value: "2001-2010", label: "Angkatan 2001 - 2010" },
  { value: "2011-2020", label: "Angkatan 2011 - 2020" },
  { value: "2021+", label: "Angkatan 2021+" },
];

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Jawaban `GET /api/auth/alumni/me` yang dipakai direktori (FE-Planning §3.1). */
type SesiAlumni = {
  status: "PENDING" | "ACTIVE";
};

/**
 * Siapa yang sedang membuka direktori. Server sudah memutuskan data apa yang
 * boleh keluar (lewat `openStatusLocked`); ini hanya untuk memilih **tautan** pada
 * keadaan terkunci: pengunjung diarahkan ke login, akun pending ke halaman
 * status verifikasi (master planning §5).
 */
type AuthState = "memuat" | "anonim" | "pending" | "aktif";

/**
 * Tujuan tautan untuk keadaan koneksi yang sudah punya halamannya. `NONE`
 * membuka dialog, dan `PENDING_SENT` belum punya aksi di kartu — pembatalannya
 * ada di halaman jejaring.
 */
const TAUTAN_KONEKSI: Partial<Record<StatusKoneksi, string>> = {
  PENDING_RECEIVED: "/alumni/jejaring?tab=incoming",
  ACCEPTED: "/alumni/jejaring?tab=accepted",
  SELF: "/alumni/profil",
};

function AvailabilityBadge({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#0071e3]/75 bg-black/25 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/90">
      <span className="text-[#69adff]" aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
  );
}

/**
 * Status keterbukaan asli dari server. Kalau alumni belum menyalakan satu pun,
 * itu ditampilkan apa adanya — bukan badge kosong dan bukan status karangan
 * (FE-Planning §3.2).
 */
function AvailabilityBadges({
  openToCollaboration,
  openToOpportunity,
}: {
  openToCollaboration: boolean;
  openToOpportunity: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {openToCollaboration && (
        <AvailabilityBadge
          icon={<Handshake weight="regular" className="text-base" />}
          label="Terbuka kolaborasi"
        />
      )}
      {openToOpportunity && (
        <AvailabilityBadge
          icon={<Briefcase weight="regular" className="text-base" />}
          label="Terbuka kesempatan"
        />
      )}
      {!openToCollaboration && !openToOpportunity && (
        <span className="text-[11px] text-white/60">
          Belum mengatur status keterbukaan — permintaan koneksi tetap bisa
          dikirim
        </span>
      )}
    </div>
  );
}

/**
 * Keadaan terkunci (FE-Planning §3.3).
 *
 * Satu-satunya akses anonymous ke halaman internal, dan untuk akun pending
 * arahnya ke status verifikasi — bukan ke login, karena ia sudah punya session.
 */
function LockedAvailability({ authState }: { authState: AuthState }) {
  const menungguVerifikasi = authState === "pending";

  return (
    <Link
      href={menungguVerifikasi ? "/alumni/status" : "/alumni/login?next=%2Falumni"}
      className="inline-flex min-h-11 items-center gap-2 text-[12px] font-normal tracking-[0.01em] text-white/90 underline decoration-white/35 underline-offset-4 transition-colors hover:text-[#69adff] focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#69adff]"
    >
      <LockKey weight="regular" className="text-base" aria-hidden="true" />
      {menungguVerifikasi
        ? "Menunggu verifikasi akun"
        : "Login untuk melihat status keterbukaan"}
    </Link>
  );
}

/**
 * Penerima belum menyalakan satu pun status keterbukaan. Hanya berlaku untuk
 * kartu yang terbuka (alumni aktif) — kartu terkunci tidak mengirim nilainya.
 */
function belumMengaturKeterbukaan(item: PublicAlumniDirektori | null): boolean {
  if (!item || "openStatusLocked" in item) return false;
  // Alumni tanpa akun jejaring bukan "belum mengatur" — dia belum bisa dihubungi.
  if (!item.bisaDihubungi) return false;
  return !item.openToCollaboration && !item.openToOpportunity;
}

function getRangeBounds(value: string): { dari?: number; sampai?: number } {
  if (value === "lte:1980") return { sampai: 1980 };
  if (value === "1981-1989") return { dari: 1981, sampai: 1989 };
  if (value === "1990-2000") return { dari: 1990, sampai: 2000 };
  if (value === "2001-2010") return { dari: 2001, sampai: 2010 };
  if (value === "2011-2020") return { dari: 2011, sampai: 2020 };
  if (value === "2021+") return { dari: 2021 };
  return {};
}

/** Jeda ketik sebelum pencarian dikirim, supaya tidak ada request per huruf. */
const JEDA_CARI_MS = 400;

export default function AlumniDirectory({
  limit,
  sort,
  perPage,
  header,
}: {
  limit?: number;
  sort?: string;
  perPage?: number;
  header?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  /** Nilai yang benar-benar dikirim; `search` mengikuti ketikan. */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [industri, setIndustri] = useState("");

  const [data, setData] = useState<PublicAlumniDirektori[]>([]);
  const [total, setTotal] = useState(0);
  const [sektorList, setSektorList] = useState<PublicSektorIndustri[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [authState, setAuthState] = useState<AuthState>("memuat");
  const [connectionTarget, setConnectionTarget] =
    useState<PublicAlumniDirektori | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  /*
   * Permintaan sebelumnya dibatalkan setiap kali ada yang baru: tanpa ini,
   * respons yang datang tidak berurutan (mis. saat mengetik cepat) bisa menimpa
   * hasil query terakhir dengan hasil query lama.
   */
  const controllerRef = useRef<AbortController | null>(null);

  const fetchSektor = useCallback(async () => {
    const hasil = await panggilApi<PublicSektorIndustri[]>(
      "/api/public/sektor-industri"
    );

    if (!hasil.ok) {
      reportAssetError("/api/public/sektor-industri", "api");
      return;
    }

    setSektorList(hasil.data);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), JEDA_CARI_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAlumni = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    const pageSize = perPage ?? limit ?? 1000;
    params.set("limit", String(pageSize));
    if (perPage) params.set("page", String(page));
    if (sort) params.set("sort", sort);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    const range = getRangeBounds(angkatan);
    if (range.dari) params.set("angkatanDari", String(range.dari));
    if (range.sampai) params.set("angkatanSampai", String(range.sampai));
    if (industri) params.set("sektorIndustriId", industri);

    const hasil = await panggilApi<PublicAlumniDirektori[]>(
      `/api/public/alumni?${params.toString()}`,
      { signal: controller.signal }
    );

    // Diabaikan kalau sudah ada permintaan yang lebih baru menggantikannya.
    if (controller.signal.aborted) return;

    if (!hasil.ok) {
      setError(hasil.error.message);
      setIsLoading(false);
      return;
    }

    setData(hasil.data);
    setTotal(hasil.meta?.total ?? hasil.data.length);
    setTotalPages(hasil.meta?.totalPages ?? 1);
    setIsLoading(false);
  }, [debouncedSearch, angkatan, industri, limit, sort, perPage, page]);

  /*
   * Siapa yang sedang membuka halaman ini (FE-Planning §3.1). Server tetap
   * penentu data apa yang boleh keluar; state ini dipakai untuk memilih tautan
   * pada kartu terkunci. `401` berarti belum login — termasuk akun yang
   * ditangguhkan, karena endpoint itu membersihkan sessionnya.
   */
  const fetchSesi = useCallback(async (signal: AbortSignal) => {
    const hasil = await panggilApi<SesiAlumni>("/api/auth/alumni/me", { signal });

    if (signal.aborted) return;

    if (!hasil.ok) {
      setAuthState("anonim");
      return;
    }

    setAuthState(hasil.data.status === "ACTIVE" ? "aktif" : "pending");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // State baru di-set setelah request selesai, bukan di badan effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSesi(controller.signal);
    return () => controller.abort();
  }, [fetchSesi]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSektor();
  }, [fetchSektor]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAlumni();
  }, [fetchAlumni]);

  const displayed = useMemo(() => {
    return limit ? data.slice(0, limit) : data;
  }, [data, limit]);

  const reset = () => {
    setSearch("");
    // Langsung dikosongkan juga supaya daftar penuh kembali tanpa menunggu jeda
    // debounce (efek debounce berikutnya tidak memicu fetch baru karena nilainya sama).
    setDebouncedSearch("");
    setAngkatan("");
    setIndustri("");
    setPage(1);
  };

  const changePage = (next: number) => {
    setPage(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * Tuliskan status koneksi terbaru ke kartu pemiliknya.
   *
   * Server tetap sumber kebenaran: setelah create, statusnya `PENDING_SENT`, dan
   * kalau server menolak (`409`) status terkini dari server yang dipakai — bukan
   * tebakan FE.
   */
  const setStatusKoneksi = (alumniId: string, status: StatusKoneksi) => {
    setData((current) =>
      current.map((kartu) =>
        kartu.id === alumniId && "connectionStatus" in kartu
          ? { ...kartu, connectionStatus: status }
          : kartu
      )
    );
  };

  /**
   * Kirim permintaan koneksi untuk kartu yang sedang dibuka dialognya.
   *
   * Mengembalikan pesan siap tampil: dialog yang menampilkannya inline dan tetap
   * terbuka, sehingga draf pesan pengantar tidak hilang saat gagal.
   */
  const kirimPermintaanKoneksi = async (
    pesanPengantar: string
  ): Promise<{ ok: boolean; pesan?: string }> => {
    if (!connectionTarget) {
      return { ok: false, pesan: "Permintaan belum terkirim. Coba lagi." };
    }

    const hasil = await panggilApi<{ id: string }>("/api/alumni/connections", {
      method: "POST",
      body: {
        recipientAlumniId: connectionTarget.id,
        message: pesanPengantar || undefined,
      },
    });

    if (hasil.ok) {
      setStatusKoneksi(connectionTarget.id, "PENDING_SENT");
      return { ok: true };
    }

    /*
     * Konflik `409` mengirim status terkini di `error.fields.connectionStatus`
     * (BE-Planning §4.4) — itu bukan error per field, jadi dipakai untuk
     * menyesuaikan tombol, bukan dirender di bawah input.
     */
    const statusTerkini = hasil.error.fields?.connectionStatus;
    if (statusTerkini) {
      setStatusKoneksi(connectionTarget.id, statusTerkini as StatusKoneksi);
    }

    /*
     * Session yang tidak lagi sah (kedaluwarsa atau akun disuspend) bukan
     * kegagalan pengiriman biasa: direktori dikembalikan ke keadaan anonymous
     * supaya seluruh kartu berhenti menawarkan aksi privat.
     */
    if (hasil.status === 401) {
      setAuthState("anonim");
      return { ok: false, pesan: "Sesi berakhir. Silakan login kembali." };
    }

    return {
      ok: false,
      pesan:
        hasil.error.code === "NETWORK_ERROR"
          ? "Permintaan belum terkirim. Coba lagi."
          : hasil.error.message,
    };
  };

  /*
   * `isLoading` sengaja TIDAK ikut jadi key: setiap perubahan filter membuat
   * loading → selesai dalam hitungan milidetik, dan pergantian key di tengah
   * animasi `AnimatePresence mode="wait"` membuat grid tidak pernah ter-mount
   * (kartu hilang tanpa pesan). Key hanya menandai keadaan akhir.
   */
  const stateKey = error
    ? "error"
    : displayed.length === 0
    ? "empty"
    : "ready";

  const adaFilter = Boolean(search.trim() || angkatan || industri);
  const memuatPertamaKali = isLoading && data.length === 0;
  const sedangMenyaring = isLoading && data.length > 0;

  return (
    <section
      ref={sectionRef}
      id="alumni"
      className={`alumni-directory-page ${plusJakartaSans.className} relative scroll-mt-8 overflow-hidden bg-[#f2f2f4] py-[88px] text-[#0f1012] reveal-section`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10">
        {header && <div className="mb-10">{header}</div>}

        {/* Header editorial + filter */}
        <div className="mb-16">
          <div className="reveal-item">
            <span className="section-label mb-4 block">
              Direktori
            </span>
            <h2 className="section-title">
              Temukan Rekan Alumni.
            </h2>
          </div>

          <div className="reveal-item mt-8 grid w-full grid-cols-1 items-center gap-y-4 border-b border-black/[0.06] pb-3 md:grid-cols-[minmax(240px,1fr)_minmax(180px,auto)_minmax(220px,auto)_auto] md:gap-x-8">
            <label className="flex min-w-0 items-center gap-2">
              <MagnifyingGlass
                weight="bold"
                className="flex-none text-[#0f1012]/40"
              />
              <input
                id="alumni-search"
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama / profesi…"
                className="w-full border-0 bg-transparent text-[14px] text-[#0f1012] outline-0 placeholder:text-[#5e5e5e]"
              />
            </label>

            <FilterSelect
              className="w-full"
              value={angkatan}
              onChange={(value) => {
                setAngkatan(value);
                setPage(1);
              }}
              ariaLabel="Filter angkatan"
            >
              <option value="">Semua Angkatan</option>
              {angkatanRanges.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              className="w-full"
              value={industri}
              onChange={(value) => {
                setIndustri(value);
                setPage(1);
              }}
              ariaLabel="Filter sektor industri"
            >
              <option value="">Semua Sektor Industri</option>
              {sektorList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.namaSektor}
                </option>
              ))}
            </FilterSelect>

            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 justify-self-start text-[13px] font-normal text-neutral-500 transition-colors hover:text-[#0f1012]"
            >
              <ArrowsCounterClockwise weight="bold" />
              Reset
            </button>
          </div>
        </div>

        {/* State: pemuatan pertama (belum ada kartu sama sekali) */}
        <StateCrossfade stateKey={stateKey}>
        {memuatPertamaKali && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[420px] w-full animate-pulse rounded-[32px] bg-[rgba(0,0,0,0.06)] motion-reduce:animate-none sm:h-[500px]"
              />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="py-12 text-center text-neutral-600">
            <p>{error}</p>
            <button
              onClick={fetchAlumni}
              className="mt-4 rounded-full bg-black px-5 py-2 text-sm font-normal text-white transition-colors hover:bg-neutral-800"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!isLoading && !error && displayed.length === 0 && (
          <div className="py-12 text-center text-[#0f1012]/50">
            <UserMinus
              weight="bold"
              className="mx-auto mb-2 text-4xl text-neutral-500"
            />
            <p>
              {adaFilter
                ? "Tidak ada alumni yang cocok dengan filter ini."
                : "Belum ada data alumni."}
            </p>
            {adaFilter && (
              <button
                type="button"
                onClick={reset}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-black/[0.12] px-5 text-[13px] text-[#0f1012] transition-colors hover:border-[#0071e3] hover:text-[#0071e3]"
              >
                <ArrowsCounterClockwise weight="bold" aria-hidden="true" />
                Reset filter
              </button>
            )}
          </div>
        )}

        {/* Grid kartu */}
        {!isLoading && !error && displayed.length > 0 && (
          <>
            {/*
              Jumlah hasil ditampilkan supaya efek filter langsung terlihat —
              termasuk saat beranda hanya meminta sebagian (limit 6).
            */}
            <p className="mb-8 text-[13px] text-black/55" aria-live="polite">
              {displayed.length < total
                ? `Menampilkan ${displayed.length} dari ${total} alumni`
                : `${total} alumni`}
              {adaFilter ? " untuk filter ini" : ""}
            </p>
            <div
              aria-busy={sedangMenyaring}
              className={`grid grid-cols-1 gap-8 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${
                sedangMenyaring ? "opacity-60" : ""
              }`}
            >
            {displayed.map((item) => {
              /*
               * Sumber kebenaran tampilan adalah response server, bukan state
               * session di client: kartu terkunci kalau server memang tidak
               * mengirim nilai keterbukaan (FE-Planning §3.1, master planning §7).
               */
              const terkunci = "openStatusLocked" in item;

              return (
                <article
                  key={item.id}
                  className="reveal-item group relative flex h-[420px] w-full flex-col justify-between overflow-hidden rounded-[32px] bg-[#0f1012] p-7 transition-transform duration-500 hover:-translate-y-2 sm:h-[500px] sm:p-8"
                >
                  {/* Foto / fallback */}
                  <div className="absolute inset-0 h-full w-full">
                    {item.fotoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.fotoUrl}
                        alt={item.namaLengkap}
                        className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1b1b1b] to-[#0f1012]">
                        <span className="font-display text-[64px] font-normal text-white/40">
                          {getInitials(item.namaLengkap)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                  </div>

                  {/* Konten */}
                  <div className="relative z-10 mt-auto">
                    <h3 className="mb-3 font-display text-[26px] font-normal leading-[1.05] tracking-[-0.02em] text-white sm:text-[28px]">
                      {item.namaLengkap}
                      {item.gelar && (
                        <span className="font-sans text-[14px] font-normal text-white/65">
                          {" "}
                          {item.gelar}
                        </span>
                      )}
                    </h3>
                    <p className="mb-5 text-[14px] text-white/80">
                      {item.profesi}
                    </p>
                    <div className="mb-5 min-h-8">
                      {terkunci ? (
                        <LockedAvailability authState={authState} />
                      ) : item.bisaDihubungi ? (
                        <AvailabilityBadges
                          openToCollaboration={item.openToCollaboration}
                          openToOpportunity={item.openToOpportunity}
                        />
                      ) : (
                        <span className="text-[11px] text-white/60">
                          Belum bergabung di jejaring alumni — belum bisa
                          dihubungi
                        </span>
                      )}
                    </div>
                    {!terkunci && (
                      <div className="mb-5">
                        {item.bisaDihubungi ? (
                          <ConnectionButton
                            status={item.connectionStatus}
                            onConnect={
                              item.connectionStatus === "NONE"
                                ? () => setConnectionTarget(item)
                                : undefined
                            }
                            tautan={TAUTAN_KONEKSI[item.connectionStatus]}
                          />
                        ) : (
                          <LabelTanpaAkunJejaring />
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-white/20 pt-4 text-white/90">
                      <span className="font-serif text-[20px] italic text-white">
                        {item.angkatan}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-white/65">
                        {item.sektorIndustri?.namaSektor || "-"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          </>
        )}
        </StateCrossfade>

        <ConnectionRequestDialog
          recipientName={connectionTarget?.namaLengkap ?? null}
          penerimaBelumMengaturKeterbukaan={belumMengaturKeterbukaan(
            connectionTarget
          )}
          onClose={() => setConnectionTarget(null)}
          onSubmit={kirimPermintaanKoneksi}
        />

        {perPage && !isLoading && !error && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={changePage}
            className="mt-16"
          />
        )}

        {/* CTA (beranda) */}
        {limit && (
          <div className="reveal-item mt-16 flex justify-center">
            <Link
              href="/alumni"
              className="augen-cta group gap-3 px-8 py-4"
            >
              <span className="font-display font-normal tracking-wide">
                Lihat Semua Alumni
              </span>
              <ArrowRight
                weight="bold"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
