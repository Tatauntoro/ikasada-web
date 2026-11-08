"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import styles from "./WaysStory.module.css";

export type WayStoryItem = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  showImage?: boolean;
  backgroundColor?: string;
  inkColor?: string;
  label?: string;
  metadata?: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  media?: ReactNode;
};

type Props = {
  kicker: string;
  title: ReactNode;
  titleStyle?: CSSProperties;
  kickerStyle?: CSSProperties;
  firstBackground?: string;
  firstInk: string;
  items: WayStoryItem[];
  sectionId?: string;
  showIntro?: boolean;
  itemNoun?: string;
  variant?: "default" | "archive";
  deferMedia?: boolean;
};

const labels = ["Bertemu", "Berkolaborasi", "Berkegiatan", "Bertumbuh", "Terhubung"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function WaysStory({
  kicker,
  title,
  titleStyle,
  kickerStyle,
  firstBackground,
  firstInk,
  items,
  sectionId = "lima-cara",
  showIntro = true,
  itemNoun = "cara",
  variant = "default",
  deferMedia = false,
}: Props) {
  const storyRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const count = items.length;
  const [indeksMedia, setIndeksMedia] = useState<number[]>(() =>
    deferMedia ? Array.from({ length: Math.min(2, count) }, (_, index) => index) : []
  );
  const storyStyle = {
    "--ways-desktop-height": `${100 + Math.max(0, count - 1) * 150}svh`,
    "--ways-mobile-height": `${100 + Math.max(0, count - 1) * 110}svh`,
    "--ways-first-surface": firstBackground || "#076bda",
    "--ways-first-ink": firstInk,
  } as CSSProperties;

  useEffect(() => {
    const story = storyRef.current;
    const pin = pinRef.current;
    if (!story || !pin) return;

    const panels = Array.from(story.querySelectorAll<HTMLElement>(`.${styles.panel}`));
    const buttons = Array.from(story.querySelectorAll<HTMLButtonElement>(`.${styles.stepNav} button`));
    const mobile = window.matchMedia("(max-width: 700px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let dekatDenganLayar = false;
    let tataLetakPanel: boolean | null = null;
    let lebarPanel = -1;
    let pasanganPanelTerlihat = "";
    let panelAktif = -1;

    function render() {
      frame = 0;
      if (!story || !pin) return;

      if (reduced.matches) {
        if (pasanganPanelTerlihat !== "reduced") {
          panels.forEach((panel) => {
            panel.style.removeProperty("left");
            panel.style.removeProperty("width");
            panel.style.removeProperty("transform");
            panel.removeAttribute("aria-hidden");
            panel.inert = false;
          });
          if (deferMedia) setIndeksMedia(Array.from({ length: count }, (_, index) => index));
          pasanganPanelTerlihat = "reduced";
          tataLetakPanel = null;
          lebarPanel = -1;
        }
        return;
      }

      const start = story.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, story.offsetHeight - pin.offsetHeight);
      const progress = clamp((window.scrollY - start) / range, 0, 1) * Math.max(0, panels.length - 1);
      const width = pin.clientWidth;
      const strip = Math.min(width * 0.092, 135);
      const mobileLayout = mobile.matches;

      const ukuranBerubah = mobileLayout !== tataLetakPanel || width !== lebarPanel;
      if (mobileLayout !== tataLetakPanel) {
        panels.forEach((panel) => {
          panel.style.removeProperty("left");
          panel.style.removeProperty("width");
        });
        tataLetakPanel = mobileLayout;
      }
      lebarPanel = width;

      panels.forEach((panel, index) => {
        if (mobileLayout) {
          const entry = index === 0 ? 1 : clamp(progress - (index - 1), 0, 1);
          panel.style.transform = `translate3d(0, ${(1 - entry) * 100}%, 0)`;
        } else {
          const offset = index * strip;
          const entry = index === 0 ? 1 : clamp((progress - (index - 1) - 0.22) / 0.68, 0, 1);
          const movement = (1 - entry) ** 3 * (width - offset);
          if (ukuranBerubah) {
            panel.style.left = `${offset}px`;
            panel.style.width = `${width - offset}px`;
          }
          panel.style.transform = `translate3d(${movement}px, 0, 0)`;
        }
      });

      const bawah = Math.floor(progress);
      const atas = Math.ceil(progress);
      const pasanganBaru = `${bawah}:${atas}`;
      if (pasanganBaru !== pasanganPanelTerlihat) {
        panels.forEach((panel, index) => {
          const terlihat = index === bawah || index === atas;
          panel.setAttribute("aria-hidden", terlihat ? "false" : "true");
          panel.inert = !terlihat;
        });
        if (deferMedia) {
          const mediaAktif = clamp(Math.round(progress), 0, count - 1);
          setIndeksMedia((sebelumnya) => {
            const tambahan = [mediaAktif, Math.min(mediaAktif + 1, count - 1)].filter((index) => !sebelumnya.includes(index));
            return tambahan.length ? [...sebelumnya, ...tambahan] : sebelumnya;
          });
        }
        pasanganPanelTerlihat = pasanganBaru;
      }

      const current = clamp(Math.round(progress), 0, buttons.length - 1);
      if (current !== panelAktif) {
        buttons.forEach((button, index) => {
          if (index === current) button.setAttribute("aria-current", "step");
          else button.removeAttribute("aria-current");
        });
        panelAktif = current;
      }
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(render);
    }

    function scheduleSaatDekat() {
      if (dekatDenganLayar && !reduced.matches) schedule();
    }

    const jump = (index: number) => {
      if (!story || !pin) return;
      const start = story.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(0, story.offsetHeight - pin.offsetHeight);
      window.scrollTo({
        top: start + (buttons.length > 1 ? (range * index) / (buttons.length - 1) : 0),
        behavior: reduced.matches ? "auto" : "smooth",
      });
    };

    const buttonHandlers = buttons.map((button, index) => {
      const handler = () => jump(index);
      button.addEventListener("click", handler);
      return handler;
    });
    const pengamat = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          dekatDenganLayar = entry.isIntersecting;
          if (dekatDenganLayar) schedule();
        }, { rootMargin: "100% 0px" })
      : null;
    pengamat?.observe(story);
    if (!pengamat) dekatDenganLayar = true;

    window.addEventListener("scroll", scheduleSaatDekat, { passive: true });
    window.addEventListener("resize", schedule);
    mobile.addEventListener("change", schedule);
    reduced.addEventListener("change", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      pengamat?.disconnect();
      window.removeEventListener("scroll", scheduleSaatDekat);
      window.removeEventListener("resize", schedule);
      mobile.removeEventListener("change", schedule);
      reduced.removeEventListener("change", schedule);
      buttons.forEach((button, index) => button.removeEventListener("click", buttonHandlers[index]));
    };
  }, [count, deferMedia]);

  return (
    <>
      {showIntro && <header id={`${sectionId}-intro`} className={styles.intro} aria-labelledby={`${sectionId}-title`}>
        <p className={styles.kicker} style={kickerStyle}>{kicker}</p>
        <h2 id={`${sectionId}-title`} className={styles.introTitle} style={titleStyle}>{title}</h2>
        <div className={styles.scrollHint}>Gulir untuk menjelajah ↓</div>
      </header>}

      <section
        id={sectionId}
        ref={storyRef}
        className={`${styles.story} ${variant === "archive" ? styles.archive : ""}`}
        style={storyStyle}
        aria-label={`Jelajahi ${itemNoun} IKASADA`}
      >
        <div ref={pinRef} className={styles.pin}>
          <nav className={styles.stepNav} aria-label={`Pilih ${itemNoun}`}>
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Lihat ${itemNoun} ${index + 1}: ${item.title}`}
                aria-current={index === 0 ? "step" : undefined}
              >
                {index + 1}
              </button>
            ))}
          </nav>
          {items.map((item, index) => (
            <article
              key={index}
              className={`${styles.panel} ${styles[`panel${index % 5}`]}`}
              aria-label={`${itemNoun} ${index + 1}: ${item.title}`}
              aria-hidden={index > 0}
              style={{
                zIndex: index + 1,
                ...(item.backgroundColor
                  ? {
                      "--surface": item.backgroundColor,
                      "--ink": item.inkColor ?? "#17191c",
                    }
                  : {}),
              } as CSSProperties}
            >
              <span className={styles.number} aria-hidden="true">{index + 1}</span>
              <div className={styles.copy}>
                <div className={styles.rule} />
                <span className={styles.index}>
                  {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
                  {(item.label ?? labels[index]) ? ` · ${item.label ?? labels[index]}` : ""}
                </span>
                {item.metadata && <div className={styles.metadata}>{item.metadata}</div>}
                <h3>{item.title}</h3>
                {item.subtitle}
                <p>{item.description}</p>
                {item.media && (!deferMedia || indeksMedia.includes(index)) && item.media}
                {item.media == null && item.showImage !== false && item.image && (
                  <div className={styles.photo}>
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(max-width: 700px) 53vw, 34vw"
                      quality={75}
                    />
                  </div>
                )}
                {item.action && <div className={styles.action}>{item.action}</div>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
