"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  UsersThree,
  Calendar,
  Archive,
  Handshake,
  ShareNetwork,
} from "@phosphor-icons/react";
import { useIzin } from "@/components/admin/IzinProvider";
import { FITUR_JEJARING_ALUMNI } from "@/lib/fitur";
import { AKSI, MODUL } from "@/lib/permission";

type DashboardResponse = {
  success: boolean;
  data: {
    ringkasan: {
      totalAlumniTerdaftar: number;
      totalAlumniTerhubung: number;
      totalKegiatan: number;
      totalArsip: number;
      totalKerjasama: number;
    };
    admin: { nama: string; email: string };
  };
};

const cards: {
  key:
    | "totalAlumniTerdaftar"
    | "totalAlumniTerhubung"
    | "totalKegiatan"
    | "totalArsip"
    | "totalKerjasama";
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  /** Modul yang menaungi halaman tujuan (untuk cek izin klik). */
  modul: (typeof MODUL)[keyof typeof MODUL];
}[] = [
  {
    key: "totalAlumniTerdaftar",
    label: "Total Alumni Terdaftar",
    icon: <UsersThree weight="duotone" className="text-2xl" />,
    href: "/admin/alumni",
    color: "bg-[#0f1012]",
    modul: MODUL.ALUMNI,
  },
  {
    key: "totalAlumniTerhubung",
    label: "Total Alumni Terhubung",
    icon: <ShareNetwork weight="duotone" className="text-2xl" />,
    href: "/admin/alumni",
    color: "bg-[#0f1012]",
    modul: MODUL.ALUMNI,
  },
  {
    key: "totalKegiatan",
    label: "Total Kegiatan",
    icon: <Calendar weight="duotone" className="text-2xl" />,
    href: "/admin/kegiatan",
    color: "bg-[#0f1012]",
    modul: MODUL.KEGIATAN,
  },
  {
    key: "totalArsip",
    label: "Total Arsip",
    icon: <Archive weight="duotone" className="text-2xl" />,
    href: "/admin/arsip",
    color: "bg-[#0f1012]",
    modul: MODUL.ARSIP,
  },
  {
    key: "totalKerjasama",
    label: "Total Kerjasama",
    icon: <Handshake weight="duotone" className="text-2xl" />,
    href: "/admin/kerjasama",
    color: "bg-[#0f1012]",
    modul: MODUL.KERJASAMA,
  },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { boleh } = useIzin();
  // Tanpa izin "Lihat Detail", kartu hanya tampil sebagai ringkasan (tak bisa diklik).
  const bolehDetail = boleh(MODUL.DASHBOARD, AKSI.LIHAT_DETAIL);

  // Kartu "Alumni Terhubung" ke halaman Jejaring (langsung tab "Diterima") bila
  // berhak; kalau tidak, jangan dilempar balik oleh page guard — arahkan ke
  // direktori alumni.
  const hrefTerhubung = boleh(MODUL.JEJARING, AKSI.LIHAT)
    ? "/admin/jejaring?status=ACCEPTED"
    : "/admin/alumni";

  /*
   * Saat mode jejaring dimatikan (`@/lib/fitur`), kartu "Total Alumni
   * Terhubung" ikut disembunyikan — tanpa menghapus definisinya.
   */
  const kartuTampil = FITUR_JEJARING_ALUMNI
    ? cards
    : cards.filter((card) => card.key !== "totalAlumniTerhubung");

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/dashboard");
      const result: DashboardResponse = await response.json();
      if (!response.ok) {
        const err = result as unknown as { error?: { message?: string } };
        setError(err?.error?.message || "Gagal memuat dashboard");
        return;
      }
      setData(result.data);
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-normal font-serif text-[#0f1012]">
          Dashboard
        </h1>
        <p className="text-[#5e5e5e] mt-1">
          Selamat datang{data?.admin?.nama ? `, ${data.admin.nama}` : ""}.
          Ringkasan portal admin IKASADA.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboard} className="font-bold hover:underline">
            Coba lagi
          </button>
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
          FITUR_JEJARING_ALUMNI ? "xl:grid-cols-5" : "xl:grid-cols-4"
        }`}
      >
        {kartuTampil.map((card) => {
          const href =
            card.key === "totalAlumniTerhubung" ? hrefTerhubung : card.href;
          const modulTarget =
            card.key === "totalAlumniTerhubung"
              ? boleh(MODUL.JEJARING, AKSI.LIHAT)
                ? MODUL.JEJARING
                : MODUL.ALUMNI
              : card.modul;
          const bisaKlik = bolehDetail && boleh(modulTarget, AKSI.LIHAT);

          const isi = (
            <>
              <div>
                <p className="text-sm text-[#5e5e5e]">{card.label}</p>
                <p className="text-3xl font-bold text-[#0f1012] mt-2">
                  {isLoading || !data ? (
                    <span className="inline-block w-10 h-8 bg-[#f2f2f4] rounded animate-pulse" />
                  ) : (
                    data.ringkasan[card.key]
                  )}
                </p>
              </div>
              <div
                className={`${card.color} text-white p-3 rounded-xl shadow-lg transition-transform group-hover:scale-110`}
              >
                {card.icon}
              </div>
            </>
          );

          if (!bisaKlik) {
            return (
              <div
                key={card.key}
                aria-disabled="true"
                title="Anda tidak punya izin melihat detail"
                className="glass-card rounded-2xl p-6 flex items-start justify-between opacity-80"
              >
                {isi}
              </div>
            );
          }

          return (
            <Link
              key={card.key}
              href={href}
              className="glass-card glass-card-hover rounded-2xl p-6 flex items-start justify-between group"
            >
              {isi}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
