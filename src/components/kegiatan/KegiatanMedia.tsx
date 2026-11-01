"use client";
import { useState } from "react";
import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import type { PublicKegiatan } from "@/lib/types";
import { formatAgenda } from "@/lib/kegiatan-client";

export function FotoKegiatan({ item, className, eager = false }: { item: PublicKegiatan; className?: string; eager?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!item.gambarThumbnailUrl || failedUrl === item.gambarThumbnailUrl) return <span className={className} aria-hidden="true" style={{ display: "grid", placeItems: "center", background: "#294156", color: "#fff", minHeight: 130 }}><CalendarBlank size={32} /></span>;
  // Public thumbnails include remote images and local uploads.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={item.gambarThumbnailUrl} alt="" width={800} height={540} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailedUrl(item.gambarThumbnailUrl)} />;
}
export function MetadataKegiatan({ item, className }: { item: PublicKegiatan; className: string }) {
  return <div className={className}>
    <span><CalendarBlank weight="bold" aria-hidden="true" /><time dateTime={item.tanggalMulai}>{formatAgenda(item.tanggalMulai, { day: "numeric", month: "short", year: "numeric" })} · {formatAgenda(item.tanggalMulai, { hour: "2-digit", minute: "2-digit" })} WIB</time></span>
    <span><MapPin weight="bold" aria-hidden="true" />{item.lokasi}</span>
  </div>;
}
