"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollExperience() {
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".public-page");
    if (!page) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progress = progressRef.current;

    page.dataset.motionReady = "true";
    page.querySelectorAll<HTMLElement>("h1, h2").forEach((heading) => {
      heading.dataset.editorialHeading = "true";
    });

    if (reduced) {
      if (progress) progress.style.transform = "scaleX(1)";
      return () => {
        delete page.dataset.motionReady;
      };
    }

    const context = gsap.context(() => {
      if (progress) {
        gsap.to(progress, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
          },
        });
      }

      const headings = page.querySelectorAll<HTMLElement>("[data-editorial-heading]");
      headings.forEach((heading) => {
        if (heading.closest("#hero")) return;
        /*
         * Judul Tentang Kami dipegang OverviewSection dengan animasi kata
         * sendiri (kata per kata berputar masuk). Kalau ia ikut animasi umum ini,
         * clip-path di level <h2> memotong kata-kata yang sedang berputar.
         */
        if (heading.closest("#overview")) return;
        gsap.fromTo(
          heading,
          { opacity: 0.12, y: 28, clipPath: "inset(0 0 100% 0)" },
          {
            opacity: 1,
            y: 0,
            clipPath: "inset(0 0 0% 0)",
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: { trigger: heading, start: "top 82%", once: true },
          }
        );
      });

    }, page);

    return () => {
      context.revert();
      delete page.dataset.motionReady;
    };
  }, []);

  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <span ref={progressRef} />
      </div>
    </>
  );
}
