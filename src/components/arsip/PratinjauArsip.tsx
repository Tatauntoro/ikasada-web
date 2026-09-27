"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, LockKey, Spinner } from "@phosphor-icons/react";

/**
 * Pratinjau PDF arsip.
 *
 * Berkasnya diambil lewat `fetch` (bukan `<iframe src>` langsung) supaya
 * tanggapan 401 bisa ditangani sebagai pesan ramah — kalau iframe yang kena 401,
 * yang tampil justru JSON error mentah. Hasilnya diubah jadi blob URL supaya
 * tidak ada URL berkas yang menempel di DOM.
 */
type Status = "memuat" | "siap" | "kedaluwarsa" | "gagal";

export function PratinjauArsip({
  slug,
  jalurLogin,
}: {
  slug: string;
  jalurLogin: string;
}) {
  const [status, setStatus] = useState<Status>("memuat");
  const [urlBerkas, setUrlBerkas] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const muat = useCallback(async () => {
    setStatus("memuat");

    try {
      const res = await fetch(`/api/arsip/${slug}/unduh?mode=inline`, {
        credentials: "include",
      });

      if (res.status === 401) {
        setStatus("kedaluwarsa");
        return;
      }

      if (!res.ok) {
        setStatus("gagal");
        return;
      }

      const blob = await res.blob();

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      setUrlBerkas(urlRef.current);
      setStatus("siap");
    } catch {
      setStatus("gagal");
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  if (status === "memuat") {
    return (
      <div className="flex h-[320px] items-center justify-center border border-black/10 bg-[#f2f2f4] text-[13px] text-black/50">
        <Spinner weight="bold" className="mr-2 animate-spin text-[#0f1012]" />
        Memuat pratinjau…
      </div>
    );
  }

  if (status === "kedaluwarsa") {
    return (
      <div className="border border-dashed border-black/20 px-6 py-8">
        <p className="flex items-center gap-2 text-[13px] text-black/70">
          <LockKey weight="bold" />
          Sesi Anda sudah berakhir. Masuk kembali untuk membuka pratinjau.
        </p>
        <Link
          href={jalurLogin}
          className="mt-4 inline-block border border-black px-4 py-2 text-[13px] font-normal text-[#0f1012] transition-colors hover:bg-black hover:text-white"
        >
          Masuk sebagai alumni
        </Link>
      </div>
    );
  }

  if (status === "gagal" || !urlBerkas) {
    return (
      <div className="border border-dashed border-black/20 px-6 py-8">
        <p className="text-[13px] text-black/70">
          Pratinjau gagal dimuat. Coba lagi, atau unduh berkasnya langsung.
        </p>
        <button
          type="button"
          onClick={muat}
          className="mt-4 inline-flex items-center gap-2 border border-black px-4 py-2 text-[13px] font-normal text-[#0f1012] transition-colors hover:bg-black hover:text-white"
        >
          <ArrowClockwise weight="bold" />
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <object
      data={urlBerkas}
      type="application/pdf"
      className="h-[70vh] w-full border border-black/10"
      aria-label="Pratinjau dokumen PDF"
    >
      {/* Fallback browser tanpa penampil PDF bawaan. */}
      <p className="px-6 py-8 text-[13px] text-black/60">
        Peramban Anda tidak bisa menampilkan pratinjau PDF. Gunakan tombol unduh
        di bawah.
      </p>
    </object>
  );
}
