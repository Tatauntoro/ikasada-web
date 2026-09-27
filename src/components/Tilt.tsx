"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pointer-driven 3D tilt. Rotates its child toward the cursor with a light
 * spring, and settles back to flat when the pointer leaves. Skipped entirely
 * for reduced motion and for touch input, where there is no hover to answer.
 */
export default function Tilt({
  children,
  className = "",
  max = 9,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let raf = 0;
    let running = false;
    let hovering = false;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const apply = () => {
      el.style.transform = `perspective(1100px) rotateX(${currentX.toFixed(
        3
      )}deg) rotateY(${currentY.toFixed(3)}deg)`;
    };

    const loop = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      apply();
      if (
        !hovering &&
        Math.abs(targetX - currentX) < 0.02 &&
        Math.abs(targetY - currentY) < 0.02
      ) {
        currentX = targetX;
        currentY = targetY;
        apply();
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const onMove = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-no-tilt]")) {
        if (hovering) {
          hovering = false;
          targetX = 0;
          targetY = 0;
          start();
        }
        return;
      }
      hovering = true;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      targetY = px * max;
      targetX = -py * max * 0.8;
      start();
    };

    const onLeave = () => {
      hovering = false;
      targetX = 0;
      targetY = 0;
      start();
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointercancel", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointercancel", onLeave);
      el.style.transform = "";
    };
  }, [max]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ willChange: "transform" }}
    >
      {children}
    </div>
  );
}
