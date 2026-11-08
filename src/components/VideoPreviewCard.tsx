"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Play, X } from "@phosphor-icons/react";
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Putar video: ${title}`}
        className="group relative block aspect-video w-full overflow-hidden bg-transparent p-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlThumbnail(videoId)}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-[#0f1012] transition-transform duration-300 group-hover:scale-110">
            <Play weight="fill" className="text-[22px]" />
          </span>
        </span>
      </button>

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup video"
              className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white text-[#0f1012] transition hover:bg-[#f4c430]"
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
