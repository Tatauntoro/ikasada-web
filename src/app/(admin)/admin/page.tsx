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

const cards = [
  {
    key: "totalAlumniTerdaftar" as const,
    label: "Total Alumni Terdaftar",
    icon: <UsersThree weight="duotone" className="text-2xl" />,
    href: "/admin/alumni",
    color: "bg-[#0f1012]",
  },
  {
    key: "totalAlumniTerhubung" as const,
    label: "Total Alumni Terhubung",
    icon: <ShareNetwork weight="duotone" className="text-2xl" />,
    href: "/admin/alumni",
    color: "bg-[#0f1012]",
  },
  {
    key: "totalKegiatan" as const,
    label: "Total Kegiatan",
    icon: <Calendar weight="duotone" className="text-2xl" />,
    href: "/admin/kegiatan",
    color: "bg-[#0f1012]",
  },
  {
    key: "totalArsip" as const,
    label: "Total Arsip",
    icon: <Archive weight="duotone" className="text-2xl" />,
    href: "/admin/arsip",
    color: "bg-[#0f1012]",
  },
  {
    key: "totalKerjasama" as const,
    label: "Total Kerjasama",
    icon: <Handshake weight="duotone" className="text-2xl" />,
    href: "/admin/kerjasama",
    color: "bg-[#0f1012]",
  },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { boleh } = useIzin();

  // Kartu "Alumni Terhubung" ke halaman Jejaring (langsung tab "Diterima") bila
  // berhak; kalau tidak, jangan dilempar balik oleh page guard — arahkan ke
  // direktori alumni.
  const hrefTerhubung = boleh(MODUL.JEJARING, AKSI.LIHAT)
    ? "/admin/jejaring?status=ACCEPTED"
    : "/admin/alumni";

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.key === "totalAlumniTerhubung" ? hrefTerhubung : card.href}
            className="glass-card glass-card-hover rounded-2xl p-6 flex items-start justify-between group"
          >
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
          </Link>
        ))}
      </div>
    </div>
  );
}
