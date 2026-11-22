"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";

/** Thumbnail di tabel admin; URL kosong atau gambar gagal dimuat → `fallback`, tanpa memicu banner aset. */
export function ThumbAdmin({
  src,
  alt,
  sizes,
  className,
  fallback,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className: string;
  fallback: ReactNode;
}) {
  const [gagalUrl, setGagalUrl] = useState<string | null>(null);
  if (!src || gagalUrl === src) return <>{fallback}</>;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
        data-aset-opsional=""
        onError={() => setGagalUrl(src)}
      />
    </div>
  );
}
