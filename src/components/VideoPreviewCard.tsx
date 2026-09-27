"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { CalendarBlank, Clock, Play, X } from "@phosphor-icons/react";
import { urlEmbedNoCookie, urlThumbnail } from "@/lib/youtube";

type VideoPreviewCardProps = {
  videoId: string;
  title?: string;
  description?: string;
  kategori?: string;
  durasi?: string;
};

export default function VideoPreviewCard({
  videoId,
  title = "Dokumentasi Kegiatan",
  description,
  kategori,
  durasi,
}: VideoPreviewCardProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-[#fdfdfd] p-6 ring-1 ring-black/10">
        {/* Shimmer */}
        <div
          aria-hidden="true"
          className="video-card-shimmer pointer-events-none absolute inset-0 opacity-[0.14]"
        />
        {/* Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-neutral-400/25 blur-3xl"
        />

        <div className="relative z-10">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Putar video dokumentasi"
            className="group relative block aspect-video w-full overflow-hidden rounded-2xl ring-1 ring-black/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlThumbnail(videoId)}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs text-white ring-1 ring-white/20 backdrop-blur-sm">
              <Play weight="fill" className="h-3.5 w-3.5" />
              Video
            </span>
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#fdfdfd] text-[#0f1012] transition-transform duration-300 group-hover:scale-110">
                <Play weight="fill" className="text-[22px]" />
              </span>
            </span>
          </button>

          <h3 className="mt-5 text-lg font-normal text-neutral-900">{title}</h3>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-black/60">
              {description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {kategori && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs text-neutral-700 ring-1 ring-black/10">
                <CalendarBlank weight="bold" className="h-3.5 w-3.5 text-neutral-500" />
                {kategori}
              </span>
            )}
            {durasi && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs text-neutral-700 ring-1 ring-black/10">
                <Clock weight="bold" className="h-3.5 w-3.5 text-neutral-500" />
                {durasi}
              </span>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Video dokumentasi"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup video"
              className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <X weight="bold" />
            </button>
            <m.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
              className="aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-black"
            >
              <iframe
                src={`${urlEmbedNoCookie(videoId)}?autoplay=1`}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
