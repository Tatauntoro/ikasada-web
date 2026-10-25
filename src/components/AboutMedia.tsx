"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  mode: "foto" | "slideshow" | "video";
  fotoUrls: string[];
  videoUrl: string;
  posterUrl: string;
  fallback: string;
};

export default function AboutMedia({ mode, fotoUrls, videoUrl, posterUrl, fallback }: Props) {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const photos = fotoUrls.length ? fotoUrls : [fallback];
  const poster = posterUrl || photos[0] || fallback;
  const imageSource =
    mode === "slideshow" && !reducedMotion ? photos[index] :
    mode === "video" ? poster : photos[0];

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (mode !== "slideshow" || reducedMotion || photos.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % photos.length), 6000);
    return () => window.clearInterval(timer);
  }, [mode, photos.length, reducedMotion]);

  if (mode === "video" && videoUrl && !reducedMotion) {
    return (
      <video
        key={videoUrl}
        src={videoUrl}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Video tentang jejaring alumni"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  return (
    <Image
      key={mode === "slideshow" && !reducedMotion ? index : photos[0]}
      src={imageSource}
      alt="Alumni berbincang dalam pertemuan santai"
      fill
      sizes="(max-width: 767px) 100vw, 48vw"
      unoptimized
      priority
    />
  );
}
