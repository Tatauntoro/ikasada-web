"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { supportsWebGL } from "@/lib/webgl";

/**
 * Shared shell for the small interactive three.js scenes on the page: renderer,
 * camera, orbit controls, pointer + raycaster, a viewport-gated render loop and
 * full disposal. Each scene supplies only its own `init`/`update`.
 *
 * three.js is loaded lazily by the caller (`next/dynamic`, ssr: false), so this
 * never runs on the server and never enters the initial bundle.
 */
export type ThreeSceneContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  pointer: THREE.Vector2;
  raycaster: THREE.Raycaster;
  container: HTMLDivElement;
  pointerActive: boolean;
};

export type ThreeSceneSetup = {
  init?: (ctx: ThreeSceneContext) => void;
  update?: (ctx: ThreeSceneContext, elapsed: number, delta: number) => void;
  dispose?: () => void;
};

export type ThreeSceneOptions = {
  cameraZ?: number;
  autoRotateSpeed?: number;
  rotateSpeed?: number;
  /** Set false to skip orbit interaction (background scenes). */
  controls?: boolean;
  /** Whether the camera auto-rotates while idle. */
  autoRotate?: boolean;
  /** Renderer pixel-ratio cap. */
  maxDpr?: number;
  /** Where pointer input is read from — the scene box or the whole window. */
  pointerTarget?: "container" | "window";
};

export function useThreeScene(
  containerRef: RefObject<HTMLDivElement | null>,
  setup: ThreeSceneSetup,
  options: ThreeSceneOptions = {}
) {
  const setupRef = useRef(setup);
  const {
    cameraZ = 4.3,
    autoRotateSpeed = 0.6,
    rotateSpeed = 0.55,
    controls: controlsEnabled = true,
    autoRotate = true,
    maxDpr = 2,
    pointerTarget = "container",
  } = options;
  const [failed, setFailed] = useState(() => !supportsWebGL());

  useEffect(() => {
    if (failed) return;
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }

    const active = setupRef.current;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, cameraZ);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setClearAlpha(0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = rotateSpeed;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    controls.enabled = controlsEnabled && !coarsePointer;
    // Keep vertical page scrolling available over decorative scenes on touch.
    if (coarsePointer) renderer.domElement.style.touchAction = "pan-y";
    controls.autoRotate = controlsEnabled && autoRotate && !reduced;
    controls.autoRotateSpeed = autoRotateSpeed;

    const ctx: ThreeSceneContext = {
      scene,
      camera,
      renderer,
      controls,
      pointer: new THREE.Vector2(0, 0),
      raycaster: new THREE.Raycaster(),
      container,
      pointerActive: false,
    };

    active.init?.(ctx);

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      ctx.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ctx.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      ctx.pointerActive = true;
    };
    const onPointerLeave = () => {
      ctx.pointerActive = false;
    };
    const pointerElement: EventTarget =
      pointerTarget === "window" ? window : container;
    pointerElement.addEventListener(
      "pointermove",
      onPointerMove as EventListener
    );
    if (pointerTarget === "window") {
      window.addEventListener("blur", onPointerLeave);
    } else {
      container.addEventListener("pointerleave", onPointerLeave);
      if (controlsEnabled) container.style.cursor = "grab";
    }

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let raf = 0;
    let running = false;
    let inView = true;
    let visible = !document.hidden;
    let elapsed = 0;
    let last = performance.now();

    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      elapsed += delta;
      controls.update();
      active.update?.(ctx, elapsed, delta);
      renderer.render(scene, camera);
    };
    const start = () => {
      if (running || !inView || !visible) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { rootMargin: "120px" }
    );
    intersectionObserver.observe(container);

    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    start();

    return () => {
      stop();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      pointerElement.removeEventListener(
        "pointermove",
        onPointerMove as EventListener
      );
      if (pointerTarget === "window") {
        window.removeEventListener("blur", onPointerLeave);
      } else {
        container.removeEventListener("pointerleave", onPointerLeave);
      }
      active.dispose?.();
      controls.dispose();
      scene.traverse((object) => {
        const withGeometry = object as THREE.Mesh;
        if (withGeometry.geometry) withGeometry.geometry.dispose();
        const material = withGeometry.material;
        const materials = Array.isArray(material)
          ? material
          : material
            ? [material]
            : [];
        materials.forEach((m) => {
          const record = m as unknown as Record<string, unknown>;
          for (const key of [
            "map",
            "normalMap",
            "roughnessMap",
            "metalnessMap",
            "alphaMap",
            "emissiveMap",
          ]) {
            const value = record[key];
            if (value instanceof THREE.Texture) value.dispose();
          }
          m.dispose();
        });
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    failed,
    containerRef,
    cameraZ,
    autoRotateSpeed,
    rotateSpeed,
    controlsEnabled,
    autoRotate,
    maxDpr,
    pointerTarget,
  ]);

  return { failed };
}
