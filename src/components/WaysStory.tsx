"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
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
};

type Props = {
  kicker: string;
  title: ReactNode;
  titleStyle?: CSSProperties;
  kickerStyle?: CSSProperties;
  firstBackground?: string;
  firstInk: string;
  items: WayStoryItem[];
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
}: Props) {
  const storyRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const count = items.length;
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

    function render() {
      frame = 0;
      if (!story || !pin) return;

      if (reduced.matches) {
        panels.forEach((panel) => {
          panel.style.removeProperty("left");
          panel.style.removeProperty("width");
          panel.style.removeProperty("transform");
          panel.removeAttribute("aria-hidden");
        });
        return;
      }

      const start = story.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, story.offsetHeight - pin.offsetHeight);
      const progress = clamp((window.scrollY - start) / range, 0, 1) * Math.max(0, panels.length - 1);
      const width = pin.clientWidth;
      const strip = Math.min(width * 0.092, 135);

      panels.forEach((panel, index) => {
        if (mobile.matches) {
          panel.style.removeProperty("left");
          panel.style.removeProperty("width");
          const entry = index === 0 ? 1 : clamp(progress - (index - 1), 0, 1);
          panel.style.transform = `translate3d(0, ${(1 - entry) * 100}%, 0)`;
        } else {
          const offset = index * strip;
          const entry = index === 0 ? 1 : clamp((progress - (index - 1) - 0.22) / 0.68, 0, 1);
          const movement = (1 - entry) ** 3 * (width - offset);
          panel.style.left = `${offset}px`;
          panel.style.width = `${width - offset}px`;
          panel.style.transform = `translate3d(${movement}px, 0, 0)`;
        }
        panel.setAttribute(
          "aria-hidden",
          index === Math.floor(progress) || index === Math.ceil(progress) ? "false" : "true"
        );
      });

      const current = clamp(Math.round(progress), 0, buttons.length - 1);
      buttons.forEach((button, index) => {
        if (index === current) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(render);
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
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    mobile.addEventListener("change", schedule);
    reduced.addEventListener("change", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mobile.removeEventListener("change", schedule);
      reduced.removeEventListener("change", schedule);
      buttons.forEach((button, index) => button.removeEventListener("click", buttonHandlers[index]));
    };
  }, [count]);

  return (
    <>
      <header id="tiga-cara" className={styles.intro} aria-labelledby="ways-title">
        <p className={styles.kicker} style={kickerStyle}>{kicker}</p>
        <h2 id="ways-title" className={styles.introTitle} style={titleStyle}>{title}</h2>
        <div className={styles.scrollHint}>Gulir untuk menjelajah ↓</div>
      </header>

      <section
        id="lima-cara"
        ref={storyRef}
        className={styles.story}
        style={storyStyle}
        aria-label="Lima cara kami menyambung"
      >
        <div ref={pinRef} className={styles.pin}>
          <nav className={styles.stepNav} aria-label="Pilih cara menyambung">
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Lihat cara ${index + 1}: ${item.title}`}
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
              aria-label={`Cara ${index + 1}: ${item.title}`}
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
                  {labels[index] ? ` · ${labels[index]}` : ""}
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {item.showImage !== false && (
                  <div className={styles.photo}>
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(max-width: 700px) 53vw, 34vw"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
