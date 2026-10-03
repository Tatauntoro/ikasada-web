"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, ImageSquare } from "@phosphor-icons/react";
import type { PublicBerita } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { reportAssetError } from "@/lib/asset-error";
import { formatTanggalWIB, formatWaktuWIB } from "@/lib/format";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Berapa berita terbaru yang dipratinjau di beranda. */
const TAMPIL_SEKSI = 5;

/**
 * Satu baris berita. Dipakai di section beranda (level 3, karena judul
 * section-nya sendiri sudah `h2`) dan di halaman `/berita` (level 2).
 *
 * Susunannya: gambar di kiri, lalu kolom kanan bertumpuk — badge tipe, judul,
 * dan tanggal · waktu.
 */
export function BeritaRow({
  item,
  level = 2,
}: {
  item: PublicBerita;
  level?: 2 | 3;
}) {
  const Judul = level === 3 ? "h3" : "h2";

  return (
    <li className="border-b border-black/10">
      <Link
        href={`/berita/${item.slug}`}
        className="group flex items-start gap-5 py-6 outline-none transition-colors hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:gap-6"
      >
        <span className="relative block h-[104px] w-[136px] flex-none overflow-hidden rounded-[12px] bg-[#e7e7ec] sm:h-[120px] sm:w-[168px]">
          <ImageSquare
            weight="regular"
            aria-hidden="true"
            className="absolute inset-0 m-auto text-2xl text-black/25"
          />
          {item.gambarUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.gambarUrl}
              alt={item.judul}
              loading="lazy"
              className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="self-end rounded-full bg-[#0f1012] px-[11px] py-[5px] text-[10px] font-normal uppercase tracking-[0.12em] text-[#fdfdfd]">
            {item.tipe}
          </span>
          <Judul className="font-display text-[19px] font-normal leading-snug tracking-[-0.02em] text-[#0f1012] text-pretty decoration-black/30 underline-offset-4 group-hover:underline sm:text-[21px]">
            {item.judul}
          </Judul>
          <span className="mt-auto text-[13px] text-[#5e5e5e]">
            {formatTanggalWIB(item.tanggal)} · {formatWaktuWIB(item.tanggal)}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function BeritaSection() {
  const [berita, setBerita] = useState<PublicBerita[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const hasil = await panggilApi<PublicBerita[]>(
      `/api/public/berita?limit=${TAMPIL_SEKSI}`
    );

    if (!hasil.ok) {
      reportAssetError("/api/public/berita", "api");
      setIsLoading(false);
      return;
    }

    setBerita(hasil.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Tidak ada berita terbit: section tidak perlu tampil kosong.
  if (!isLoading && berita.length === 0) {
    return null;
  }

  return (
    <section
      id="berita"
      className={`home-jakarta-section ${plusJakartaSans.className} relative overflow-hidden border-y border-[rgba(0,0,0,0.06)] bg-white py-[88px] text-[#0f1012] reveal-section`}
    >
      <div className="relative z-10 mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10">
        <div className="mb-16">
          <div className="max-w-3xl">
            <span className="reveal-item block section-label">Berita</span>
            <h2 className="reveal-item mt-4 section-title">Berita Terkini.</h2>
          </div>
        </div>

        {isLoading ? (
          <ul className="reveal-item border-t border-black/10">
            {Array.from({ length: TAMPIL_SEKSI }).map((_, i) => (
              <li key={i} className="border-b border-black/10 py-6">
                <div className="flex animate-pulse items-start gap-5 sm:gap-6">
                  <span className="h-[104px] w-[136px] flex-none rounded-[12px] bg-black/10 sm:h-[120px] sm:w-[168px]" />
                  <span className="flex flex-1 flex-col gap-3">
                    <span className="h-5 w-20 self-end rounded-full bg-black/10" />
                    <span className="h-5 w-3/4 bg-black/10" />
                    <span className="h-3 w-40 bg-black/[0.07]" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="reveal-item border-t border-black/10">
            {berita.map((item) => (
              <BeritaRow key={item.slug} item={item} level={3} />
            ))}
          </ul>
        )}

        <div className="reveal-item mt-12 flex justify-center">
          <Link href="/berita" className="augen-cta whitespace-nowrap px-5">
            Lihat Semua Berita
            <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
