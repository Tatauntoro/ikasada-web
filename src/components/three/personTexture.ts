import * as THREE from "three";

/**
 * A simple head-and-shoulders glyph drawn once to a canvas and reused as a
 * sprite map. White so a sprite material's `color` tints it.
 */
export function createPersonTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(size / 2, size * 0.32, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.18, size * 0.94);
    ctx.quadraticCurveTo(size * 0.5, size * 0.46, size * 0.82, size * 0.94);
    ctx.closePath();
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
