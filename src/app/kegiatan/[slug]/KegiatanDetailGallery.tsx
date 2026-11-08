"use client";

import { useRef, useState } from "react";
import styles from "./KegiatanDetail.module.css";

type GalleryItem = {
  id: string;
  jenis: "FOTO" | "VIDEO";
  src: string;
  caption: string | null;
};

export default function KegiatanDetailGallery({
  items,
  judul,
}: {
  items: GalleryItem[];
  judul: string;
}) {
  const [selected, setSelected] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  if (!items.length) return null;

  const active = items[selected] ?? items[0];
  const label = active.caption?.trim() ||
    `${active.jenis === "VIDEO" ? "Video" : "Foto"} ${selected + 1}`;
  const select = (offset: number) => {
    setSelected((current) => (current + offset + items.length) % items.length);
  };
  const openPreview = () => {
    setPreviewOpen(true);
    dialogRef.current?.showModal();
  };
  const closePreview = () => dialogRef.current?.close();

  return (
    <>
      <div className={styles.galleryViewer}>
        <div className={styles.galleryStage}>
          {active.jenis === "VIDEO" ? (
            <video
              key={active.id}
              src={active.src}
              controls
              playsInline
              preload="metadata"
              aria-label={active.caption || `Video ${selected + 1}: ${judul}`}
              className={styles.galleryStageMedia}
            />
          ) : (
            // Media publik dapat berasal dari penyimpanan lokal maupun R2.
            <button type="button" className={styles.galleryOpen} onClick={openPreview} aria-label={`Buka pratinjau ${label}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={active.id}
                src={active.src}
                alt={active.caption || `${judul}, foto ${selected + 1}`}
                className={styles.galleryStageMedia}
              />
            </button>
          )}
          <div className={styles.galleryControls}>
            <button type="button" onClick={() => select(-1)} disabled={items.length === 1} aria-label="Media sebelumnya">←</button>
            <button type="button" onClick={() => select(1)} disabled={items.length === 1} aria-label="Media berikutnya">→</button>
          </div>
        </div>
      </div>
      <div className={styles.galleryThumbs} aria-label="Pilih media galeri">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Lihat ${item.jenis === "VIDEO" ? "video" : "foto"} ${index + 1}${item.caption ? `: ${item.caption}` : ""}`}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {item.jenis === "VIDEO" ? (
              <span className={styles.galleryVideoThumb} aria-hidden="true">▶<small>VIDEO</small></span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.src} alt="" loading="lazy" />
            )}
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className={styles.galleryDialog}
        aria-label={`Pratinjau media: ${judul}`}
        onClose={() => setPreviewOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) closePreview(); }}
        onKeyDown={(event) => {
          if (event.target instanceof HTMLVideoElement) return;
          if (event.key === "ArrowLeft") { event.preventDefault(); select(-1); }
          if (event.key === "ArrowRight") { event.preventDefault(); select(1); }
        }}
      >
        <div className={styles.galleryDialogTop}>
          <strong>{label}</strong>
          <button type="button" onClick={closePreview} aria-label="Tutup pratinjau">×</button>
        </div>
        <div
          className={styles.galleryDialogMedia}
          onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (active.jenis === "VIDEO" || touchStartX.current === null) return;
            const distance = event.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(distance) > 50) select(distance < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          {previewOpen && (active.jenis === "VIDEO" ? (
            <video key={active.id} src={active.src} controls playsInline preload="metadata" aria-label={active.caption || `Video ${selected + 1}: ${judul}`} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={active.id} src={active.src} alt={active.caption || `${judul}, foto ${selected + 1}`} />
          ))}
          <div className={styles.galleryDialogControls}>
            <button type="button" onClick={() => select(-1)} disabled={items.length === 1} aria-label="Foto atau video sebelumnya">←</button>
            <button type="button" onClick={() => select(1)} disabled={items.length === 1} aria-label="Foto atau video berikutnya">→</button>
          </div>
        </div>
        <div className={styles.galleryDialogFooter}>
          <span>{String(selected + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
        </div>
      </dialog>
    </>
  );
}
