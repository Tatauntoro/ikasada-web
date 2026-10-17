"use client";

import { EnvelopeSimple } from "@phosphor-icons/react";
import { emailKontakBeranda, useBerandaConfig } from "@/lib/beranda-client";

/**
 * Tautan email pengurus untuk pengunjung yang tidak bisa mengunduh berkas arsip
 * sendiri.
 *
 * Dipakai selama akses akun alumni ditutup (`AKSES_ALUMNI_TERBUKA = false`):
 * pintu login tidak ada lagi (`/alumni/login` dialihkan ke beranda), jadi
 * pengunjung diarahkan meminta berkasnya ke pengurus. Alamat emailnya mengikuti
 * Kelola Beranda (section Kontak) dengan cadangan kanal resmi; kalimat di
 * sekitarnya sengaja tidak memuat alamat email supaya tidak ada dua sumber
 * kebenaran.
 */
export function TautanEmailPengurus({
  className = "mt-5",
}: {
  className?: string;
}) {
  const email = emailKontakBeranda(useBerandaConfig());

  return (
    <a
      href={`mailto:${email}`}
      className={`${className} inline-flex items-center gap-2 bg-[#0f1012] px-5 py-2.5 text-[13px] text-white transition-opacity hover:opacity-90`}
    >
      <EnvelopeSimple weight="bold" aria-hidden="true" />
      {email}
    </a>
  );
}
