/**
 * A cheap, dependency-free WebGL capability check. Kept out of the three.js
 * modules so components that only need to decide *whether* to render a scene
 * do not pull three into their bundle.
 */
let cached: boolean | null = null;

export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  /* Cache the probe: each call otherwise spins up a throwaway WebGL context,
     and a page with several scenes can exhaust the browser's context budget. */
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    cached = Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    cached = false;
  }
  return cached;
}
