"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import SplitType from "split-type";
import styles from "./OverviewSection.module.css";

/**
 * Tentang Kami.
 *
 * Judulnya masuk kata per kata dengan putaran 3D (flip) sekaligus memudar dari
 * blur — jadi tiap kata seperti berputar naik ke tempatnya, bukan sekadar
 * tersingkap sebaris demi sebaris. Isinya menyusul dengan gerakan yang sama tapi
 * lebih pendek, supaya hierarkinya tetap terbaca.
 *
 * Pemicunya IntersectionObserver, bukan ScrollTrigger: section ini `sticky`, dan
 * ScrollTrigger mengukur posisi elemen yang dipin — di sini posisinya justru
 * sengaja tidak bergerak selama tertempel, jadi pengukuran itu meleset.
 */
export default function OverviewSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Kalau gerak dimatikan, teks dibiarkan apa adanya — jangan disentuh sama sekali.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = root.querySelector<HTMLElement>("section");
    const judul = root.querySelector<HTMLElement>("h2");
    const label = root.querySelector<HTMLElement>(`.${styles.label}`);
    const body = root.querySelector<HTMLElement>(`.${styles.body}`);
    if (!section || !judul) return;

    const pisahJudul = new SplitType(judul, { types: "words", tagName: "span" });
    const pisahBody = body ? new SplitType(body, { types: "words", tagName: "span" }) : null;

    const ctx = gsap.context(() => {
      const garis = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

      if (label) {
        garis.from(label, { opacity: 0, y: 14, duration: 0.5 }, 0);
      }

      garis.from(
        pisahJudul.words,
        {
          opacity: 0,
          rotationX: -92,
          yPercent: 48,
          filter: "blur(10px)",
          duration: 0.85,
          stagger: 0.055,
          transformOrigin: "50% 100%",
        },
        0.06
      );

      if (pisahBody?.words) {
        garis.from(
          pisahBody.words,
          {
            opacity: 0,
            rotationX: -60,
            yPercent: 30,
            filter: "blur(6px)",
            duration: 0.6,
            stagger: 0.014,
            transformOrigin: "50% 100%",
          },
          0.42
        );
      }

      const pengamat = new IntersectionObserver(
        (entri) => {
          if (!entri.some((e) => e.isIntersecting)) return;
          pengamat.disconnect();
          garis.play();
        },
        { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
      );
      pengamat.observe(section);

      return () => pengamat.disconnect();
    }, root);

    return () => {
      ctx.revert();
      pisahJudul.revert();
      pisahBody?.revert();
    };
  }, []);

  return (
    <div className={styles.stage} ref={ref}>
      <section id="overview" className={styles.section} aria-labelledby="overview-title">
        <div className={styles.inner}>
          <div className={styles.labelBlock}>
            <p className={styles.label}>Tentang Kami</p>
          </div>

          <div className={styles.content}>
            <h2 id="overview-title" className="section-title">
              Jejaring alumni yang tumbuh dari satu akar, bergerak lebih jauh bersama.
            </h2>
            <p className={styles.body}>
              IKASADA merawat hubungan lintas angkatan melalui ruang bertemu, berbagi pengetahuan,
              dan kontribusi yang terus hidup di dalam dan di luar kampus.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
