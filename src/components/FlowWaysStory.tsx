"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { WayStoryItem } from "./WaysStory";
import styles from "./FlowWaysStory.module.css";

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
const surfaces = ["#076bda", "#f4c430", "#087e59", "#f27b65", "#b8d9f4"];
const inks = ["#ffffff", "#17191c", "#ffffff", "#17191c", "#17191c"];

export default function FlowWaysStory({ kicker, title, titleStyle, kickerStyle, firstBackground, firstInk, items }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const match = gsap.matchMedia();
    let resizeTimer: ReturnType<typeof setTimeout>;
    let disposed = false;

    const rebuild = () => {
      match.revert();
      match.add({
        desktop: "(min-width: 801px) and (min-height: 650px)",
        mobile: "(max-width: 800px) and (min-height: 600px)",
        reduced: "(prefers-reduced-motion: reduce)",
      }, context => {
        const { desktop, mobile, reduced } = context.conditions ?? {};
        if (reduced || (!desktop && !mobile)) return;
        const sections = Array.from(root.querySelectorAll<HTMLElement>(`.${styles.section}`));
        // Preserve normal scrolling when custom admin content cannot fit a screen.
        if (!sections.every(section => {
          const inner = section.querySelector<HTMLElement>(`.${styles.inner}`);
          return inner && inner.scrollHeight <= window.innerHeight + 1;
        })) return;
        const mode = mobile ? styles.mobileMotion : styles.desktopMotion;
        root.classList.add(mode);
        sections.forEach((section, index) => {
          const inner = section.querySelector<HTMLElement>(`.${styles.inner}`);
          if (!inner) return;
          gsap.set(section, { zIndex: index + 1 });
          if (index > 0) {
            gsap.fromTo(inner, { rotation: mobile ? 4 : 10 }, {
              rotation: 0,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: mobile ? "top top" : "top 25%",
                scrub: true,
                invalidateOnRefresh: true,
              },
            });
          }
          if (index < sections.length - 1) {
            ScrollTrigger.create({
              trigger: section,
              pin: mobile ? inner : section,
              start: mobile ? "top top" : "bottom bottom",
              end: "bottom top",
              pinSpacing: false,
              invalidateOnRefresh: true,
            });
          }
        });
        return () => root.classList.remove(mode);
      }, root);
      ScrollTrigger.refresh();
    };
    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rebuild, 180);
    };
    rebuild();
    window.addEventListener("resize", resize);
    document.fonts.ready.then(() => { if (!disposed) rebuild(); });
    return () => {
      disposed = true;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      match.revert();
    };
  }, [items]);

  return (
    <>
      <header id="tiga-cara" className={styles.intro} aria-labelledby="ways-title">
        <p className={styles.kicker} style={kickerStyle}>{kicker}</p>
        <h2 id="ways-title" className={styles.introTitle} style={titleStyle}>{title}</h2>
        <p className={styles.hint}>Gulir untuk menjelajah ↓</p>
      </header>
      <div id="lima-cara" className={styles.flow} ref={rootRef} role="region" aria-label="Lima cara kami menyambung">
        {items.map((item, index) => (
          <section key={index} className={styles.section} aria-label={`Cara ${index + 1}: ${item.title}`}>
            <article className={styles.inner} style={{
              "--panel": item.backgroundColor || (index === 0 ? firstBackground : undefined) || surfaces[index % surfaces.length],
              "--ink": item.inkColor || (index === 0 ? firstInk : inks[index % inks.length]),
            } as CSSProperties}>
              <div className={styles.copy}>
                <div className={styles.index}>IKASADA / {String(index + 1).padStart(2, "0")} <span>Lima cara menyambung</span></div>
                <div className={styles.body}>
                  <span className={styles.tag}>{labels[index]}</span>
                  <h3 className={styles.panelTitle}>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className={styles.footer}><span>Jejaring IKASADA FIB UI</span><span>{String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span></div>
              </div>
              {item.showImage !== false && item.image ? (
                <figure className={styles.visual}>
                  <Image src={item.image} alt={item.imageAlt} fill unoptimized sizes="(max-width: 800px) 100vw, 50vw" />
                </figure>
              ) : (
                <div className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
              )}
            </article>
          </section>
        ))}
      </div>
    </>
  );
}
