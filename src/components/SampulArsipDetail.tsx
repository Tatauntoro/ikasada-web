"use client";

import { useState } from "react";

/** Sampul di halaman detail arsip; gagal dimuat → disembunyikan, halaman cukup menampilkan informasi. */
export default function SampulArsipDetail({ src, alt }: { src: string; alt: string }) {
  const [gagal, setGagal] = useState(false);
  if (gagal) return null;

  return (
    <div className="relative mb-10 aspect-[4/3] w-full overflow-hidden border border-black/10 sm:aspect-[16/9]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // Gambar dari HTML server bisa sudah gagal sebelum hydration, jadi onError terlewat.
        ref={(img) => { if (img?.complete && img.naturalWidth === 0) setGagal(true); }}
        src={src}
        alt={alt}
        data-aset-opsional=""
        onError={() => setGagal(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
