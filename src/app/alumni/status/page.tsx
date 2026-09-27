import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  Briefcase,
  CheckCircle,
  GraduationCap,
  Handshake,
  HourglassMedium,
} from "@phosphor-icons/react/dist/ssr";
import RuangAlumni from "@/components/alumni/RuangAlumni";
import { StatusAlumniAccount } from "@/generated/prisma/enums";
import { formatTanggalWIB, getInitials } from "@/lib/format";
import { akunAlumniHalaman } from "@/lib/halaman-alumni";

export const metadata: Metadata = {
  title: "Status Akun Alumni - IKASADA FIB UI",
  description:
    "Status verifikasi akun dan data keanggotaan jejaring alumni IKASADA FIB UI.",
};

export const dynamic = "force-dynamic";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const LABEL_STATUS: Record<StatusAlumniAccount, string> = {
  [StatusAlumniAccount.PENDING]: "Menunggu verifikasi pengurus",
  [StatusAlumniAccount.ACTIVE]: "Aktif",
  [StatusAlumniAccount.REJECTED]: "Ditolak pengurus",
  [StatusAlumniAccount.SUSPENDED]: "Ditangguhkan",
};

/**
 * Halaman status akun alumni (Task 11).
 *
 * Session dibaca di server: pengunjung tanpa cookie sah langsung diarahkan ke
 * halaman login sebelum satu pun data akun dirender, jadi isi privat tidak
 * pernah sampai ke browser anonymous. Akun `PENDING` boleh melihat halaman ini
 * (master planning §6) — yang ia lihat hanya data pendaftarannya sendiri.
 */
export default async function StatusAkunAlumniPage() {
  const { akun } = await akunAlumniHalaman("/alumni/status");

  const aktif = akun.status === StatusAlumniAccount.ACTIVE;
  const alumni = akun.alumni;

  return (
    <RuangAlumni
      aktif={aktif}
      navAktif="status"
      fontClassName={`${plusJakartaSans.className} alumni-status-page`}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-[50px]">
        <section>
          <span className="section-label block">
            {aktif ? "Akun aktif" : "Status akun"}
          </span>
          <h1 className="page-title mt-4">
            {aktif
              ? "Akun Anda sudah aktif."
              : "Pendaftaran Anda sedang ditinjau pengurus."}
          </h1>

          <span
            className="mt-7 inline-flex min-h-8 items-center gap-[6px] rounded-full border border-[#bdd5f3] bg-[#eef5ff] px-3 text-[14px] font-semibold leading-[20px] tracking-[-0.02em] text-[#005bbb]"
          >
            {aktif ? (
              <CheckCircle weight="regular" aria-hidden="true" />
            ) : (
              <HourglassMedium weight="regular" aria-hidden="true" />
            )}
            {LABEL_STATUS[akun.status]}
          </span>

          <p className="mt-8 max-w-[48ch] text-[16px] leading-[1.5] tracking-[-0.02em] text-[#5e5e5e]">
            {aktif
              ? "Anda bisa melihat status keterbukaan alumni lain dan mengirim permintaan koneksi dari direktori alumni."
              : "Pengurus IKASADA mencocokkan data pendaftaran Anda dengan direktori alumni sebelum akun dipakai. Status keterbukaan alumni lain dan permintaan koneksi baru terbuka setelah akun disetujui."}
          </p>

          <ul className="mt-8 grid gap-3 text-[15px] leading-[23px] tracking-[-0.02em] text-[#1f2937]">
            {(aktif
              ? [
                  "Masa berlaku session 8 jam sejak login, lalu Anda diminta masuk lagi.",
                  "Data kontak hanya terbuka untuk koneksi yang Anda izinkan.",
                  "Pengurus dapat menangguhkan akun bila data yang dicocokkan tidak sesuai.",
                ]
              : [
                  "Anda masih bisa keluar dari akun ini kapan saja.",
                  "Pendaftaran tidak perlu diulang; pengurus memakai data yang sudah Anda kirim.",
                  "Setelah disetujui, Anda bisa mengatur profil dan mulai terhubung dengan alumni.",
                ]
            ).map((baris) => (
              <li key={baris} className="flex gap-3">
                <span
                  className="mt-[8px] size-1.5 shrink-0 rounded-full bg-[#0071e3]"
                  aria-hidden="true"
                />
                <span>{baris}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="h-fit rounded-[22px] border border-[#e1e5eb] border-l-4 border-l-[#ff4d00] bg-white px-6 py-7 sm:px-8">
          <h2 className="text-[12px] font-bold leading-[14px] uppercase tracking-[0.16em] text-[#6b7280]">
            Data pendaftaran
          </h2>

          <dl className="mt-6 grid gap-3">
            <Baris label="Nama lengkap" nilai={akun.namaLengkapSaatDaftar} />
            <Baris label="Email" nilai={akun.email} />
            <Baris label="Angkatan" nilai={akun.angkatanSaatDaftar} />
            <Baris
              label="Tanggal daftar"
              nilai={formatTanggalWIB(akun.createdAt)}
            />
            <Baris
              label="Persetujuan data"
              nilai={formatTanggalWIB(akun.consentDataAt)}
            />
            {aktif && (
              <>
                <Baris
                  label="Aktif sejak"
                  nilai={formatTanggalWIB(akun.approvedAt)}
                />
                <Baris
                  label="Login terakhir"
                  nilai={formatTanggalWIB(akun.lastLoginAt)}
                />
              </>
            )}
          </dl>
        </section>
      </div>

      {aktif && alumni && (
        <section className="mt-10 rounded-[24px] border border-[#0757a6] bg-[#0757a6] px-6 py-8 text-white sm:px-9 sm:py-9">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="size-[84px] shrink-0 overflow-hidden rounded-full bg-[#eaf2ff]">
              {alumni.fotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={alumni.fotoUrl}
                  alt={`Foto ${alumni.namaLengkap}`}
                  className="size-full object-cover"
                />
              ) : (
                <span className="grid size-full place-items-center text-[24px] text-[#005bbb]">
                  {getInitials(alumni.namaLengkap)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-[20px] font-semibold leading-[26px] tracking-[-0.02em] text-white">
                {alumni.namaLengkap}
              </h2>
              <p className="mt-2 text-[14px] tracking-[-0.02em] text-white/90">
                {alumni.profesi}
              </p>
              <p className="mt-1 inline-flex items-center gap-2 text-[13px] tracking-[-0.02em] text-white/85">
                <GraduationCap
                  weight="regular"
                  className="text-white/85"
                  aria-hidden="true"
                />
                Angkatan {alumni.angkatan}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/30 pt-6">
            <h3 className="text-[11px] font-bold leading-[14px] uppercase tracking-[0.16em] text-white/80">
              Status keterbukaan
            </h3>

            <div className="mt-5 flex flex-wrap gap-2">
              {akun.openToCollaboration && (
                <PilKeterbukaan
                  label="Terbuka kolaborasi"
                  ikon={<Handshake weight="regular" />}
                />
              )}
              {akun.openToOpportunity && (
                <PilKeterbukaan
                  label="Terbuka kesempatan"
                  ikon={<Briefcase weight="regular" />}
                />
              )}
              {!akun.openToCollaboration && !akun.openToOpportunity && (
                <span className="text-[13px] tracking-[-0.02em] text-white/80">
                  Belum mengatur status keterbukaan.
                </span>
              )}
            </div>

            <p className="mt-5 text-[13px] leading-[1.5] tracking-[-0.02em] text-white/90">
              Status keterbukaan diatur di{" "}
              <Link
                href="/alumni/profil"
                className="text-white underline decoration-white/50 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                halaman profil alumni
              </Link>
              , dan hanya terlihat oleh alumni yang sudah masuk.
            </p>
          </div>
        </section>
      )}
    </RuangAlumni>
  );
}

function Baris({ label, nilai }: { label: string; nilai: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-[#e1e5eb] pb-3 last:border-0 last:pb-0">
      <dt className="text-[11px] font-bold leading-[14px] uppercase tracking-[0.16em] text-[#6b7280]">
        {label}
      </dt>
      <dd className="text-right text-[15px] font-medium leading-[22px] tracking-[-0.02em] text-[#1f2937]">
        {nilai}
      </dd>
    </div>
  );
}

function PilKeterbukaan({
  label,
  ikon,
}: {
  label: string;
  ikon: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full border border-[#bdd5f3] bg-[#eef5ff] px-3 py-1 text-[14px] font-semibold leading-[20px] tracking-[-0.02em] text-[#005bbb]">
      <span aria-hidden="true">{ikon}</span>
      {label}
    </span>
  );
}
