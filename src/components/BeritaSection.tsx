"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, ImageSquare } from "@phosphor-icons/react";
import type { PublicBerita } from "@/lib/types";
import { panggilApi } from "@/lib/api-client";
import { reportAssetError } from "@/lib/asset-error";
import { formatTanggalWIB, formatWaktuWIB } from "@/lib/format";
import {
  sectionAktif,
  teksSection,
  useBerandaConfig,
  gayaSection,
  gayaBackgroundSection,
} from "@/lib/beranda-client";

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
    <li className="border-b border-[#0B5ED7]/15">
      <Link
        href={`/berita/${item.slug}`}
        className="group flex items-start gap-4 py-4 outline-none transition-colors hover:bg-[#EAF4FF]/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5ED7] sm:gap-5"
      >
        <span className="relative block h-[88px] w-[112px] flex-none overflow-hidden rounded-[10px] bg-[#e7e7ec] sm:h-[100px] sm:w-[140px]">
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
          <span className="self-end rounded-full bg-[#F4C430] px-[11px] py-[5px] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0f1012]">
            {item.tipe}
          </span>
          <Judul className="font-display text-[19px] font-semibold leading-snug tracking-[-0.02em] text-[#0f1012] text-pretty decoration-[#0B5ED7]/50 underline-offset-4 group-hover:underline sm:text-[21px]">
            {item.judul}
          </Judul>
          {item.deskripsiSingkat && (
            <p className="line-clamp-2 text-[13px] leading-relaxed text-[#5e5e5e] sm:text-sm">
              {item.deskripsiSingkat}
            </p>
          )}
          <span className="mt-auto text-[13px] text-[#5e5e5e]">
            {formatTanggalWIB(item.tanggal)} · {formatWaktuWIB(item.tanggal)}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function BeritaSection() {
  const beranda = useBerandaConfig();
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

  const eyebrowBerita = teksSection(beranda, "berita", "eyebrow", "Berita");
  const judulBerita = teksSection(beranda, "berita", "judul", "Berita Terkini.");
  const gayaJudulBerita = gayaSection(beranda, "berita", "judul");
  const gayaEyebrowBerita = gayaSection(beranda, "berita", "eyebrow");
  const gayaBackgroundBerita = gayaBackgroundSection(beranda, "berita");

  // Tidak ada berita terbit atau section dimatikan: jangan tampil kosong.
  if (!sectionAktif(beranda, "berita")) return null;
  if (!isLoading && berita.length === 0) {
    return null;
  }

  return (
    <section
      id="berita"
      className={`home-jakarta-section ${plusJakartaSans.className} relative overflow-hidden border-y border-[rgba(11,94,215,0.14)] bg-white py-9 pb-6 md:pt-[50px] md:pb-6 text-[#0f1012] reveal-section`}
      style={gayaBackgroundBerita}
    >
      <div className="home-section-container relative z-10">
        <div className="mb-8">
          <div className="max-w-3xl">
            <span
              className="reveal-item block section-label"
              style={gayaEyebrowBerita}
            >
              {eyebrowBerita}
            </span>
            <h2
              className="reveal-item mt-4 section-title"
              style={gayaJudulBerita}
            >
              {judulBerita}
            </h2>
          </div>
        </div>

        {isLoading ? (
          <ul className="reveal-item border-t border-[#0B5ED7]/15">
            {Array.from({ length: TAMPIL_SEKSI }).map((_, i) => (
              <li key={i} className="border-b border-[#0B5ED7]/15 py-6">
                <div className="flex animate-pulse items-start gap-5 sm:gap-6">
                  <span className="h-[104px] w-[136px] flex-none rounded-[12px] bg-[#0B5ED7]/10 sm:h-[120px] sm:w-[168px]" />
                  <span className="flex flex-1 flex-col gap-3">
                    <span className="h-5 w-20 self-end rounded-full bg-[#0B5ED7]/10" />
                    <span className="h-5 w-3/4 bg-[#0B5ED7]/10" />
                    <span className="h-3 w-40 bg-[#0B5ED7]/[0.07]" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="reveal-item border-t border-[#0B5ED7]/15">
            {berita.map((item) => (
              <BeritaRow key={item.slug} item={item} level={3} />
            ))}
          </ul>
        )}

        <div className="reveal-item mt-6 flex justify-center">
          <Link href="/berita" className="augen-cta whitespace-nowrap px-5">
            Lihat Semua Berita
            <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
