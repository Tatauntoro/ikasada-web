"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowsCounterClockwise,
  Briefcase,
  CheckCircle,
  Handshake,
  Info,
  LockKey,
  UsersThree,
  UserMinus,
} from "@phosphor-icons/react";
import { panggilApi, type ApiError } from "@/lib/api-client";
import { formatTanggalWIB, getInitials } from "@/lib/format";

/**
 * Profil dan preferensi privasi alumni (FE-Planning §3.7).
 *
 * Lima switch disimpan **satu per satu** dengan PATCH parsial, tanpa tombol
 * simpan global: tiap respons berisi profil terbaru, jadi server tetap menjadi
 * sumber kebenaran dan tidak ada nilai yang "tertunda" di client. Kalau PATCH
 * gagal, switch dikembalikan ke nilai terakhir dari server.
 */

type Preferensi = {
  openToCollaboration: boolean;
  openToOpportunity: boolean;
  showEmailToConnections: boolean;
  showWhatsappToConnections: boolean;
  showSocialLinksToConnections: boolean;
};

type ProfilAlumni = Preferensi & {
  id: string;
  email: string;
  status: string;
  namaLengkapSaatDaftar: string;
  angkatanSaatDaftar: number;
  programStudiSaatDaftar: string;
  createdAt: string;
  approvedAt?: string | null;
  alumni: {
    id: string;
    namaLengkap: string;
    profesi: string;
    angkatan: number;
    programStudi: string;
    fotoUrl: string | null;
  } | null;
};

const PESAN_GAGAL_MUAT = "Profil belum dapat dimuat.";
const PESAN_GAGAL_SIMPAN = "Preferensi belum tersimpan. Coba lagi.";

/** Enum Prisma datang sebagai string dari API; labelnya dari daftar bersama. */
export default function AlumniProfileSettings() {
  const [profil, setProfil] = useState<ProfilAlumni | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldDisimpan, setFieldDisimpan] = useState<keyof Preferensi | null>(
    null
  );
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  const muatProfil = useCallback(async () => {
    setMemuat(true);
    setError(null);

    const hasil = await panggilApi<ProfilAlumni>("/api/alumni/me/profile");

    setMemuat(false);

    if (!hasil.ok) {
      setError(
        hasil.status === 401 ? "Sesi berakhir. Silakan login kembali." : PESAN_GAGAL_MUAT
      );
      return;
    }

    setProfil(hasil.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muatProfil();
  }, [muatProfil]);

  useEffect(() => {
    if (!pesanSukses) return;
    const t = setTimeout(() => setPesanSukses(null), 3000);
    return () => clearTimeout(t);
  }, [pesanSukses]);

  const simpan = async (field: keyof Preferensi, nilai: boolean) => {
    setFieldDisimpan(field);
    setPesanGagal(null);
    setPesanSukses(null);

    const hasil = await panggilApi<ProfilAlumni>("/api/alumni/me/profile", {
      method: "PATCH",
      body: { [field]: nilai },
    });

    setFieldDisimpan(null);

    if (!hasil.ok) {
      const { pesan, dariServer } = pesanGagalSimpan(hasil.error);

      setPesanGagal(pesan);
      if (dariServer) {
        // Server sudah menolak; nilainya diambil ulang supaya kartu tidak
        // menampilkan tebakan.
        void muatProfil();
      }
      return;
    }

    setProfil(hasil.data);
    setPesanSukses("Preferensi tersimpan.");
  };

  if (memuat) {
    return (
      <section className="space-y-6">
        <HeaderProfil />
        <div className="grid gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[148px] w-full animate-pulse rounded-[22px] bg-[#e8edf4] motion-reduce:animate-none"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !profil) {
    return (
      <section className="space-y-6">
        <HeaderProfil />
        <div
          role="alert"
          className="grid justify-items-center gap-4 rounded-[22px] border border-[#e1e5eb] bg-white px-6 py-12 text-center"
        >
          <UserMinus weight="regular" className="text-[28px] text-[#0071e3]" aria-hidden="true" />
          <p className="text-[15px] tracking-[-0.02em] text-[#1f2937]">
            {error ?? PESAN_GAGAL_MUAT}
          </p>
          <button
            type="button"
            onClick={muatProfil}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#bdd5f3] bg-[#eef5ff] px-5 text-[13px] tracking-[-0.02em] text-[#005bbb] transition-colors hover:bg-[#e1efff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
          >
            <ArrowsCounterClockwise weight="regular" className="text-base text-[#0071e3]" aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      </section>
    );
  }

  const alumni = profil.alumni;
  const statusAktif = [
    profil.openToCollaboration ? "Kolaborasi" : null,
    profil.openToOpportunity ? "Mencari kesempatan" : null,
  ].filter((nilai): nilai is string => Boolean(nilai));
  const kontakDiizinkan = [
    profil.showEmailToConnections ? "Email" : null,
    profil.showWhatsappToConnections ? "WhatsApp" : null,
    profil.showSocialLinksToConnections ? "Media sosial" : null,
  ].filter((nilai): nilai is string => Boolean(nilai));

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-start lg:gap-5">
      <div className="min-w-0 space-y-5">
        <HeaderProfil />

        <div className="flex items-start gap-3 rounded-[18px] border border-[#e1e5eb] border-l-4 border-l-[#ff4d00] bg-white px-4 py-4 sm:px-5">
          <Info
            weight="regular"
            className="mt-0.5 shrink-0 text-[20px] text-[#ff4d00]"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-[15px] font-medium tracking-[-0.02em] text-[#1f2937]">
              Mulai di sini
            </h2>
            <p className="mt-1 text-[13px] leading-[1.5] tracking-[-0.02em] text-[#4b5563]">
              Pilih cara Anda ingin terhubung dengan alumni lain. Semua pilihan
              opsional, bisa diubah kapan saja, dan tersimpan otomatis.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-[22px] border border-[#0757a6] bg-[#0757a6] px-5 py-5 text-white sm:flex-row sm:items-center sm:px-6">
          <span className="size-16 shrink-0 overflow-hidden rounded-full border border-white bg-white">
            {alumni?.fotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={alumni.fotoUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center text-[18px] text-[#005bbb]">
                {getInitials(alumni?.namaLengkap ?? profil.namaLengkapSaatDaftar)}
              </span>
            )}
          </span>

          <div className="min-w-0">
            <h2 className="text-[20px] leading-tight tracking-[-0.02em] text-white">
              {alumni?.namaLengkap ?? profil.namaLengkapSaatDaftar}
            </h2>
            {alumni && (
              <p className="mt-1 text-[14px] tracking-[-0.02em] text-white/90">
                {alumni.profesi}
              </p>
            )}
            <p className="mt-1 text-[12px] tracking-[-0.02em] text-white/75">
              {alumni ? `Angkatan ${alumni.angkatan}` : profil.email}
            </p>
            <p className="mt-1 text-[12px] tracking-[-0.02em] text-white/75">
              {profil.email} · aktif sejak {formatTanggalWIB(profil.approvedAt)}
            </p>
          </div>
        </div>

        {pesanSukses && (
          <div
            role="status"
            className="fixed left-1/2 top-5 z-[100] flex w-[min(92vw,420px)] -translate-x-1/2 items-start gap-2 rounded-[16px] border border-[#b7e3ca] bg-[#effaf3]/95 px-4 py-3 text-[13px] tracking-[-0.02em] text-[#1f2937] shadow-lg backdrop-blur"
          >
            <CheckCircle
              weight="regular"
              className="mt-[2px] shrink-0 text-base text-[#067647]"
              aria-hidden="true"
            />
            <span>{pesanSukses}</span>
          </div>
        )}

        {pesanGagal && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[16px] border border-[#f1c7c4] bg-[#fff5f4] px-4 py-3 text-[13px] tracking-[-0.02em] text-[#7a271a]"
          >
            <UserMinus
              weight="regular"
              className="mt-[2px] shrink-0 text-base text-[#b42318]"
              aria-hidden="true"
            />
            <span>{pesanGagal}</span>
          </div>
        )}

        <section className="rounded-[22px] border border-[#e1e5eb] bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[14px] font-medium text-[#005bbb]">
              1
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#005bbb]">
                Langkah 1
              </p>
              <h2 className="mt-0.5 text-[17px] font-medium tracking-[-0.02em] text-[#1f2937]">
                Pilih status keterbukaan
              </h2>
              <p className="mt-1 text-[13px] leading-[1.5] tracking-[-0.02em] text-[#5e6b7b]">
                Status yang aktif muncul sebagai badge di direktori dan hanya
                terlihat oleh alumni yang sudah masuk. Status ini tidak membuka
                kontak Anda.
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-[#e1e5eb] pl-0 sm:ml-12">
            <Switch
              id="openToCollaboration"
              label="Terbuka untuk kolaborasi"
              keterangan="Tandai bahwa Anda bersedia diajak bekerja sama."
              ikon={<Handshake weight="regular" />}
              checked={profil.openToCollaboration}
              sedangSimpan={fieldDisimpan === "openToCollaboration"}
              onToggle={(nilai) => simpan("openToCollaboration", nilai)}
            />
            <Switch
              id="openToOpportunity"
              label="Terbuka mencari kesempatan"
              keterangan="Tandai bahwa Anda sedang membuka peluang baru."
              ikon={<Briefcase weight="regular" />}
              checked={profil.openToOpportunity}
              sedangSimpan={fieldDisimpan === "openToOpportunity"}
              onToggle={(nilai) => simpan("openToOpportunity", nilai)}
            />
          </div>
        </section>

        <section className="rounded-[22px] border border-[#e1e5eb] bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[14px] font-medium text-[#005bbb]">
              2
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#005bbb]">
                Langkah 2
              </p>
              <h2 className="mt-0.5 text-[17px] font-medium tracking-[-0.02em] text-[#1f2937]">
                Atur visibilitas kontak
              </h2>
              <p className="mt-1 text-[13px] leading-[1.5] tracking-[-0.02em] text-[#5e6b7b]">
                Kontak yang Anda aktifkan hanya terlihat oleh koneksi yang sudah
                diterima, jika datanya tersedia.
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-[#e1e5eb] sm:ml-12">
            <Switch
              id="showEmailToConnections"
              label="Tampilkan email"
              keterangan="Email yang tercatat di data alumni Anda."
              checked={profil.showEmailToConnections}
              sedangSimpan={fieldDisimpan === "showEmailToConnections"}
              onToggle={(nilai) => simpan("showEmailToConnections", nilai)}
            />
            <Switch
              id="showWhatsappToConnections"
              label="Tampilkan nomor WhatsApp"
              keterangan="Koneksi akan menerima tautan wa.me."
              checked={profil.showWhatsappToConnections}
              sedangSimpan={fieldDisimpan === "showWhatsappToConnections"}
              onToggle={(nilai) => simpan("showWhatsappToConnections", nilai)}
            />
            <Switch
              id="showSocialLinksToConnections"
              label="Tampilkan media sosial"
              keterangan="Instagram dan tautan sosial lain yang tercatat."
              checked={profil.showSocialLinksToConnections}
              sedangSimpan={fieldDisimpan === "showSocialLinksToConnections"}
              onToggle={(nilai) => simpan("showSocialLinksToConnections", nilai)}
            />
          </div>

          <p className="mt-3 rounded-[14px] border border-[#d9e5f4] bg-[#f3f7fd] px-4 py-3 text-[13px] leading-[1.5] tracking-[-0.02em] text-[#5e6b7b] sm:ml-12">
            Pengunjung dan permintaan yang belum diterima tidak dapat melihat
            detail kontak. Data kontak dikelola pengurus; jika datanya belum
            tersedia, switch aktif tidak menampilkan informasi.
          </p>
        </section>
      </div>

      <RingkasanPrivasi
        statusAktif={statusAktif}
        kontakDiizinkan={kontakDiizinkan}
      />
    </section>
  );
}

function HeaderProfil() {
  return (
    <header>
      <span className="section-label block">Profil</span>
      <h1 className="page-title mt-2">Profil dan preferensi Anda.</h1>
      <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.5] tracking-[-0.02em] text-[#5e6b7b]">
        Atur bagaimana Anda terlihat di direktori alumni dan siapa yang dapat
        melihat informasi Anda.
      </p>
    </header>
  );
}

function RingkasanPrivasi({
  statusAktif,
  kontakDiizinkan,
}: {
  statusAktif: string[];
  kontakDiizinkan: string[];
}) {
  return (
    <aside
      aria-labelledby="ringkasan-privasi-judul"
      className="rounded-[22px] border border-[#e1e5eb] border-l-4 border-l-[#ff4d00] bg-white p-4 sm:p-5"
    >
      <h2
        id="ringkasan-privasi-judul"
        className="text-[17px] font-medium tracking-[-0.02em] text-[#ff4d00]"
      >
        Siapa yang bisa melihat?
      </h2>
      <p className="mt-1 text-[13px] leading-[1.5] tracking-[-0.02em] text-[#5e6b7b]">
        Ringkasan dampak pilihan Anda.
      </p>

      <ul className="mt-4 grid gap-2">
        <li className="flex items-start gap-3 rounded-[14px] border border-[#e1e5eb] bg-white px-3 py-3">
          <UsersThree
            weight="regular"
            className="mt-0.5 shrink-0 text-[20px] text-[#0071e3]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="text-[13px] font-medium text-[#1f2937]">
              Alumni yang sudah masuk
            </h3>
            <p className="mt-1 text-[12px] leading-[1.45] text-[#5e6b7b]">
              {statusAktif.length > 0
                ? `Badge: ${statusAktif.join(", ")}.`
                : "Belum ada status keterbukaan yang ditampilkan."}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3 rounded-[14px] border border-[#e1e5eb] bg-white px-3 py-3">
          <UsersThree
            weight="regular"
            className="mt-0.5 shrink-0 text-[20px] text-[#16734a]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="text-[13px] font-medium text-[#1f2937]">
              Koneksi yang sudah diterima
            </h3>
            <p className="mt-1 text-[12px] leading-[1.45] text-[#5e6b7b]">
              {kontakDiizinkan.length > 0
                ? `Diizinkan: ${kontakDiizinkan.join(", ")}. Jika datanya tersedia.`
                : "Belum ada jenis kontak yang diizinkan."}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3 rounded-[14px] border border-[#e1e5eb] bg-white px-3 py-3">
          <LockKey
            weight="regular"
            className="mt-0.5 shrink-0 text-[20px] text-[#64748b]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="text-[13px] font-medium text-[#1f2937]">
              Pengunjung dan permintaan belum diterima
            </h3>
            <p className="mt-1 text-[12px] leading-[1.45] text-[#5e6b7b]">
              Tidak dapat melihat detail kontak.
            </p>
          </div>
        </li>
      </ul>
    </aside>
  );
}

/**
 * Pesan galat sesuai aturan yang berlaku (FE-Planning §6 dan §9): kegagalan
 * jaringan memakai copy kita, sedangkan 4xx memakai pesan server. `fields.root`
 * adalah cara Zod melaporkan kunci asing di akar — itu bukan error satu switch,
 * jadi ditampilkan sebagai pesan umum.
 */
function pesanGagalSimpan(error: ApiError): {
  pesan: string;
  dariServer: boolean;
} {
  if (error.code === "NETWORK_ERROR") {
    return { pesan: PESAN_GAGAL_SIMPAN, dariServer: false };
  }

  return {
    pesan: error.fields?.root ?? error.message ?? PESAN_GAGAL_SIMPAN,
    dariServer: true,
  };
}

function Switch({
  id,
  label,
  keterangan,
  ikon,
  checked,
  sedangSimpan,
  onToggle,
}: {
  id: string;
  label: string;
  keterangan: string;
  ikon?: ReactNode;
  checked: boolean;
  sedangSimpan: boolean;
  onToggle: (nilai: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-[#e1e5eb] py-5 last:border-0">
      <div className="min-w-0">
        <p
          id={`${id}-label`}
          className="flex items-center gap-2 text-[15px] tracking-[-0.02em] text-[#1f2937]"
        >
          {ikon && (
            <span className="text-base text-[#0071e3]" aria-hidden="true">
              {ikon}
            </span>
          )}
          {label}
        </p>
        <p className="mt-1 text-[13px] leading-[1.45] tracking-[-0.02em] text-[#6b7280]">
          {keterangan}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={sedangSimpan}
        onClick={() => onToggle(!checked)}
        className="flex min-h-11 shrink-0 items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] disabled:cursor-wait disabled:opacity-70"
      >
        <span
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
            checked
              ? "border-[#0071e3] bg-[#0071e3]"
              : "border-[#cbd5e1] bg-[#e5e7eb]"
          }`}
        >
          <span
            className={`absolute size-5 rounded-full transition-transform ${
              checked ? "translate-x-6 bg-white" : "translate-x-1 bg-white"
            }`}
          />
        </span>
        <span className={`min-w-[70px] text-left text-[11px] uppercase tracking-[0.12em] ${checked ? "text-[#005bbb]" : "text-[#6b7280]"}`}>
          {sedangSimpan ? "Menyimpan" : checked ? "Aktif" : "Mati"}
        </span>
      </button>
    </div>
  );
}
