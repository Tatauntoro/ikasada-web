"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLoader } from "./LoaderProvider";
import { preloaderAktif } from "@/lib/preloader-gate";
import { useHeroMotionPolicy } from "@/lib/useHeroMotionPolicy";
import {
  ATP_SANS,
  ATP_SCRIPT,
  atpBeats,
  atpDecode,
  atpLayout,
  atpNib,
  atpPath,
  atpRandom,
  atpStage,
  atpSupported,
  type Glyph,
  type Laid,
} from "@/lib/animator-lettering";
import styles from "./Preloader.module.css";

/*
 * Kartu judul animator: pemuatan ditampilkan sebagai produksi sebuah judul.
 * Sketsa pensil biru "IKASADA" digambar, tiap huruf di-ink lalu dicat, tulisan
 * tangan menulis diri, dan dua tangan bersarung memegang kata itu. Di 100%
 * tangan melempar, iris menutup pada maskot yang mengedip, lalu iris membuka
 * tepat di tengah aksara hero, yang muncul dengan squash and stretch.
 *
 * Progresnya nyata: `progressRef` dari LoaderProvider (font, window load, dan
 * tugas terdaftar). Animasinya sendiri tidak pernah lebih cepat dari 100%
 * dalam 2,6 detik supaya tiap tahap sempat main.
 */

const KICKER = "Ikatan Alumni Sastra Daerah";
const TITLE = "IKASADA";
const CONNECTOR = "";
const NAME = "FIB UI";
const SEED = 11;
const STAGES = ["Sketsa", "Tinta", "Warna", "Jadi"];

const DISPLAY_STACK = 'var(--font-plus-jakarta), "Plus Jakarta Sans", Inter, "Helvetica Neue", "Segoe UI", Arial, sans-serif';
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace';
const FALLBACK_SCRIPT = "'Segoe Script','Bradley Hand','Snell Roundhand','Brush Script MT',cursive";

/** Warna situs: abu halaman, tinta, dan biru UI. Sarung putih, lengan biru. */
const PALET = {
  stage: "#f2f2f4",
  ink: "#0f1012",
  muted: "#5e5e5e",
  rough: "#0071e3",
  ghost: "#7db1f5",
  word0: "#2d3037",
  word1: "#1a1c21",
  word2: "#0f1012",
  sleeve0: "#3b93f0",
  sleeve1: "#0071e3",
  sleeve2: "#0a4aa8",
  pattern: "#cfe4ff",
  speck: "#06234d",
  skin0: "#ffffff",
  skin1: "#eceef2",
  skin2: "#9ea3b0",
  nail: "#d3d7e0",
  cuff: "#0f1012",
};

const GRIP_MS = 520;
const HOLD_MS = 1150;
const FLING_MS = 760;
const IRIS_MS = 900;
const WINK_MS = 760;
const SHUT_MS = 300;
const REVEAL_MS = 1000;
const FADE_MS = 600;
/** Sudut lengan dari sudut bawah: landai di landscape, curam di layar potret. */
const ARM_DEG = 24;
const ARM_DEG_TALL = 52;

type Phase = "draw" | "grip" | "hold" | "fling" | "iris" | "wink" | "shut" | "reveal" | "fade" | "done";
type Box = { x: number; w: number };
type Metrics = { boxes: Box[]; base: number; size: number; ww: number; wh: number; tall: boolean };
type Stroke = { d: string; w: number; a: number; b: number; guide?: boolean; keep?: boolean };

const SCRIPT_OPTS = { jitter: 0.3, condense: 0.86, tracking: 0.3, space: 9, capGap: 2 };

let scriptCache: Glyph[] | null = null;
let sansCache: Glyph[] | null = null;
const scriptFont = () => scriptCache ?? (scriptCache = atpDecode(ATP_SCRIPT));
const sansFont = () => sansCache ?? (sansCache = atpDecode(ATP_SANS));

// ---- tangan, dilukis sekali dalam satuan lokal ------------------------------
// Ujung jari di titik asal dan lengan memanjang ke -x; tangan kanan adalah
// cerminnya.

const r1 = (v: number) => Math.round(v * 10) / 10;

function handFinger(x0: number, y: number, len: number, h: number) {
  const r = h * 0.46;
  const tx = x0 + len;
  return (
    "M" + x0 + " " + r1(y - h / 2) +
    " Q" + r1(x0 + len * 0.5) + " " + r1(y - h * 0.56) + " " + r1(tx - r) + " " + r1(y - h * 0.46) +
    " A" + r1(r) + " " + r1(r) + " 0 0 1 " + r1(tx - r) + " " + r1(y + h * 0.46) +
    " Q" + r1(x0 + len * 0.5) + " " + r1(y + h * 0.56) + " " + x0 + " " + r1(y + h / 2) + "Z"
  );
}

function handNail(tx: number, y: number, h: number) {
  return (
    "M" + r1(tx - h * 0.62) + " " + r1(y - h * 0.3) +
    " Q" + r1(tx - h * 0.2) + " " + r1(y - h * 0.34) + " " + r1(tx - h * 0.1) + " " + r1(y - h * 0.04) +
    " Q" + r1(tx - h * 0.2) + " " + r1(y + h * 0.14) + " " + r1(tx - h * 0.62) + " " + r1(y + h * 0.1) + "Z"
  );
}

function spiral(cx: number, cy: number, turns: number, radius: number) {
  let d = "";
  const n = Math.round(40 * turns);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const r = 2 + radius * t;
    d += (i ? " L" : "M") + r1(cx + Math.cos(a) * r) + " " + r1(cy + Math.sin(a) * r);
  }
  return d;
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => r1(cx + Math.cos(a) * r) + " " + r1(cy + Math.sin(a) * r);
  return "M" + p(a0) + " A" + r + " " + r + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + p(a1);
}

const SWIRLS = [
  spiral(30, 34, 2.2, 20),
  spiral(92, 92, 1.6, 15),
  arc(96, 26, 14, 0.4, 3.6),
  arc(96, 26, 7, 0.6, 3.2),
  arc(26, 96, 12, 3.6, 6.6),
  arc(62, 62, 9, 1, 4),
].join(" ");

// [x0, y, panjang, tebal], kelingking → telunjuk.
const FINGERS = [
  [-182, 58, 150, 40],
  [-182, 20, 172, 44],
  [-182, -22, 184, 46],
  [-186, -64, 180, 46],
];
const SLEEVE = "M-2100 -176 L-256 -118 Q-228 -116 -228 -96 L-220 104 Q-220 124 -244 124 L-2100 190 Z";
const SLEEVE_LIGHT = "M-2100 -176 L-256 -118 Q-238 -117 -232 -108 L-2100 -150 Z";
const PALM = "M-212 -96 Q-150 -112 -60 -100 L-40 70 Q-120 96 -212 90 Z";
const THUMB = "M-196 -92 C-150 -128 -90 -136 -30 -126 C-6 -122 4 -110 0 -98 C-4 -86 -18 -82 -34 -86 C-90 -96 -140 -86 -176 -58 Z";

function Hand({ id, side }: { id: string; side: "l" | "r" }) {
  return (
    <g filter={"url(#" + id + "-paint)"} transform={side === "r" ? "scale(-1 1)" : undefined}>
      <path d={SLEEVE} fill={"url(#" + id + "-sleeve)"} />
      <path d={SLEEVE} fill={"url(#" + id + "-swirl)"} />
      <path d={SLEEVE_LIGHT} fill="#fff" opacity=".16" />
      <path d={PALM} style={{ fill: "var(--atp-skin2)" }} />
      {FINGERS.map(([x0, y, len, h], i) => (
        <g key={i}>
          <path d={handFinger(x0, y, len, h)} fill={"url(#" + id + "-skin)"} />
          <path d={handNail(x0 + len, y, h)} style={{ fill: "var(--atp-nail)" }} opacity=".78" />
          <path
            d={"M" + r1(x0 + len * 0.42) + " " + r1(y - h * 0.36) + " q" + r1(len * 0.12) + " " + r1(-h * 0.08) + " " + r1(len * 0.26) + " " + r1(-h * 0.02)}
            fill="none" style={{ stroke: "var(--atp-nail)" }} strokeWidth="3.2" strokeLinecap="round" opacity=".8"
          />
          <path
            d={"M" + r1(x0 + len * 0.62) + " " + r1(y - h * 0.3) + " q-4 " + r1(h * 0.3) + " 0 " + r1(h * 0.6)}
            fill="none" style={{ stroke: "var(--atp-skin2)" }} strokeWidth="2.6" strokeLinecap="round" opacity=".7"
          />
        </g>
      ))}
      <g className={styles.thumb}>
        <path d={THUMB} style={{ fill: "var(--atp-skin0)" }} />
        <path d="M-150 -116 C-110 -128 -70 -130 -34 -124" fill="none" style={{ stroke: "var(--atp-nail)" }} strokeWidth="3.5" strokeLinecap="round" opacity=".85" />
        <path d={handNail(0, -106, 34)} style={{ fill: "var(--atp-nail)" }} opacity=".85" />
      </g>
      <rect x="-268" y="-128" width="78" height="258" rx="28" style={{ fill: "var(--atp-cuff)" }} />
      <rect x="-254" y="-124" width="12" height="250" rx="6" fill="#fff" opacity=".2" />
      <rect x="-216" y="-124" width="8" height="250" rx="4" fill="#000" opacity=".22" />
    </g>
  );
}

// ---- baris tulisan tangan ---------------------------------------------------

function ScriptLine({
  laid, text, maskId, filterId, on, duration, className, flourish,
}: {
  laid: Laid;
  text: string;
  maskId: string;
  filterId: string;
  on: boolean;
  duration: number;
  className: string;
  flourish?: boolean;
}) {
  if (!atpSupported(text)) {
    return (
      <span className={styles.line + " " + styles.fallback + " " + className} data-on={on ? "1" : "0"} style={{ fontFamily: FALLBACK_SCRIPT }} aria-hidden="true">
        {text}
      </span>
    );
  }
  const strokes = laid.strokes.slice();
  const lengths = laid.lengths.slice();
  let y1 = laid.y1;
  if (flourish && strokes.length) {
    // Garis tebal di bawah seluruh nama: masuk dari kiri, melingkar, keluar ke kanan.
    const a = laid.x0 - 2;
    const b = laid.x1 + 6;
    const w = b - a;
    const by = laid.y1 + 3;
    const pts: number[] = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const x = a + w * t - Math.sin(t * Math.PI * 2) * w * 0.03;
      const y = by + Math.sin(t * Math.PI) * 2.4 - Math.max(0, Math.sin((t - 0.78) * Math.PI * 4.5)) * 5 * (t > 0.78 ? 1 : 0);
      pts.push(x, y);
    }
    strokes.push(pts);
    lengths.push(w * 1.1);
    y1 = by + 3.5;
  }
  const pad = 4;
  const vx = laid.x0 - pad;
  const vy = Math.min(laid.y0, -2) - pad;
  const vw = laid.x1 - laid.x0 + pad * 2 + (flourish ? 8 : 0);
  const vh = Math.max(y1, 30) - vy + pad;
  const total = lengths.reduce((s, l) => s + l, 0) || 1;
  const pause = 0.03;
  const span = 1 + pause * strokes.length;
  // Awal tiap goresan = panjang goresan sebelumnya, ditambah jeda di antaranya.
  const before: number[] = [];
  lengths.reduce((sum, l, i) => {
    before[i] = sum;
    return sum + l;
  }, 0);
  const nib = 1.3;
  const angle = (-38 * Math.PI) / 180;
  const nx = Math.cos(angle) * nib;
  const ny = Math.sin(angle) * nib;
  return (
    <svg
      className={styles.line + " " + className}
      data-on={on ? "1" : "0"}
      viewBox={r1(vx) + " " + r1(vy) + " " + r1(vw) + " " + r1(vh)}
      style={{ width: r1(vw / 21) + "em", height: r1(vh / 21) + "em" }}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
          <g fill="none" stroke="#fff" strokeWidth={nib * 3.4} strokeLinecap="round" strokeLinejoin="round">
            {strokes.map((s, i) => {
              const start = (before[i] / total + pause * i) / span;
              const len = lengths[i] / total / span;
              return (
                <path
                  key={i}
                  className={styles.w}
                  d={atpPath(s)}
                  pathLength={1}
                  style={{ transitionDelay: Math.round(start * duration) + "ms", transitionDuration: Math.max(40, Math.round(len * duration)) + "ms" }}
                />
              );
            })}
          </g>
        </mask>
      </defs>
      <g mask={"url(#" + maskId + ")"} filter={"url(#" + filterId + ")"}>
        <path d={strokes.map((s) => atpNib(s, nx, ny)).join("")} fill="currentColor" />
        <path d={strokes.map(atpPath).join("")} fill="none" stroke="currentColor" strokeWidth={nib * 0.55} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function Trinket({ className, filterId }: { className: string; filterId: string }) {
  return (
    <svg className={className} viewBox="0 0 30 70" aria-hidden="true">
      <g filter={"url(#" + filterId + ")"} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 1 L15 16" />
        <circle cx="15" cy="21" r="4.4" />
        <path d="M15 27 C22 31 26 37 25 44 C24 52 19 57 15 63 C11 57 6 52 5 44 C4 37 8 31 15 27 Z" />
        <path d="M11 41 C13 38 17 38 19 41" opacity=".7" />
        <circle cx="15" cy="49" r="1.6" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

// ---- gerbang ----------------------------------------------------------------

/** Aksara memuat Jawa dan Latin; kartu ini memakai kata Latin, jadi ukurannya mengikuti jumlah huruf. */
const LETTERS = Array.from(TITLE);
const WORD_VW = Math.round(1400 / Math.max(LETTERS.length, 6)) / 10;

export default function Preloader() {
  const { progressRef, assetsReady, setReady } = useLoader();
  const aktif = preloaderAktif();
  const hematGerak = useHeroMotionPolicy() === "reduced";
  const uid = "atp" + useId().replace(/[^a-zA-Z0-9]/g, "");

  const gateRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const roughRef = useRef<SVGGElement>(null);
  const handLRef = useRef<HTMLDivElement>(null);
  const handRRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<SVGSVGElement>(null);
  const pupilRefs = useRef<(SVGCircleElement | null)[]>([]);

  const [phase, setPhase] = useState<Phase>("draw");
  const [pct, setPct] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [fit, setFit] = useState(1);
  const fitRef = useRef(1);

  const phaseRef = useRef<Phase>(phase);
  const assetsReadyRef = useRef(assetsReady);
  const hematGerakRef = useRef(hematGerak);
  const rushRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const armRef = useRef(ARM_DEG);

  const tampil = aktif && phase !== "done";

  useEffect(() => {
    phaseRef.current = phase;
    assetsReadyRef.current = assetsReady;
    hematGerakRef.current = hematGerak;
  }, [phase, assetsReady, hematGerak]);

  // Intro tidak main (navigasi client-side): hero langsung diizinkan tampil.
  useEffect(() => {
    if (aktif) return;
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, [aktif, setReady]);

  // Halaman dikunci di puncak selama kartu judul main; gutter tetap supaya lebar tidak melompat.
  useEffect(() => {
    if (!tampil) return;
    const el = document.documentElement;
    const sebelum = { overflow: el.style.overflow, gutter: el.style.scrollbarGutter };
    el.style.overflow = "hidden";
    el.style.scrollbarGutter = "stable";
    return () => {
      el.style.overflow = sebelum.overflow;
      el.style.scrollbarGutter = sebelum.gutter;
    };
  }, [tampil]);

  const kickLaid = useMemo(() => atpLayout(KICKER, scriptFont(), { seed: SEED + 1, ...SCRIPT_OPTS }), []);
  const ofLaid = useMemo(() => atpLayout(CONNECTOR, scriptFont(), { seed: SEED + 2, ...SCRIPT_OPTS }), []);
  const nameLaid = useMemo(() => atpLayout(NAME, scriptFont(), { seed: SEED + 3, ...SCRIPT_OPTS }), []);

  // Ukur tiap huruf kata judul supaya rough, gradasi cat, dan tangan bisa
  // diletakkan padanya, dan kecilkan kata sampai tangan punya ruang. Memakai
  // offset layout, bukan bounding rect, agar huruf yang sedang pop tetap terukur.
  useLayoutEffect(() => {
    if (!tampil) return;
    const word = wordRef.current;
    const probe = probeRef.current;
    const stage = stageRef.current;
    if (!word || !probe || !stage) return;
    const measure = () => {
      const ww = word.offsetWidth;
      const sw = stage.clientWidth;
      if (!ww || !sw) return;
      const tall = stage.clientHeight > sw * 1.15;
      const room = sw * (tall ? 0.74 : sw > 720 ? 0.6 : 0.7);
      const natural = ww / fitRef.current;
      // Layar potret punya tinggi lebih, jadi kata boleh melebihi ukuran dasarnya.
      const next = Math.min(tall ? 1.5 : 1, room / natural);
      if (Math.abs(next - fitRef.current) > 0.005) {
        fitRef.current = next;
        setFit(next);
        return;
      }
      const boxes: Box[] = [];
      word.querySelectorAll("[data-ch]").forEach((el) => {
        const ch = el as HTMLElement;
        boxes.push({ x: ch.offsetLeft, w: ch.offsetWidth });
      });
      const size = parseFloat(getComputedStyle(word).fontSize) || 100;
      const hasil = { boxes, base: probe.offsetTop, size, ww, wh: word.offsetHeight, tall };
      setMetrics((m) =>
        m && m.tall === tall && m.ww === hasil.ww && m.wh === hasil.wh && m.base === hasil.base && m.boxes.length === boxes.length && m.boxes.every((b, i) => b.x === boxes[i].x)
          ? m
          : hasil,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(word);
    ro.observe(stage);
    let hidup = true;
    if (document.fonts?.ready) void document.fonts.ready.then(() => hidup && measure());
    return () => {
      hidup = false;
      ro.disconnect();
    };
  }, [tampil, fit]);

  // Rough: garis konstruksi, lalu dua goresan longgar kerangka sans per huruf.
  const roughStrokes = useMemo<Stroke[]>(() => {
    if (!metrics) return [];
    const font = sansFont();
    const rand = atpRandom(SEED + 9);
    const { boxes, base, size } = metrics;
    const cap = size * 0.72;
    const s = cap / 21;
    const out: { d: string; w: number; pts: number[]; guide?: boolean; keep?: boolean }[] = [];
    // Seperti clean-up animator, sebagian besar rough dihapus setelah judul dicat.
    // Huruf pertama dan tiga huruf terakhir tetap berpensil biru, kecuali yang
    // hanya batang, yang roughnya cuma sebuah garis.
    const kept = (i: number) =>
      LETTERS.length < 4 || i === 0 || (i >= LETTERS.length - 3 && !/[\sIJLTiljtf1!|.,'-]/.test(LETTERS[i]));
    const left = (boxes[0] ? boxes[0].x : 0) - size * 0.12;
    const last = boxes[boxes.length - 1];
    const right = (last ? last.x + last.w : metrics.ww) + size * 0.16;
    const guide = (y: number, k: number) => {
      const pts: number[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push(left + (right - left) * t + (rand() - 0.5) * 2, y + (rand() - 0.5) * size * 0.012 + k * t * size * 0.02);
      }
      out.push({ d: atpPath(pts), w: Math.max(1, size * 0.005), pts, guide: true });
    };
    guide(base, 0.4);
    guide(base - cap, -0.3);
    LETTERS.forEach((ch, i) => {
      const box = boxes[i];
      const g = ch === " " ? null : font[ch.charCodeAt(0) - 33];
      if (!box || !g) return;
      let gx0 = Infinity;
      let gx1 = -Infinity;
      for (const st of g.strokes) {
        for (let k = 0; k < st.length; k += 2) {
          gx0 = Math.min(gx0, st[k]);
          gx1 = Math.max(gx1, st[k]);
        }
      }
      const gcx = (gx0 + gx1) / 2;
      const cx = box.x + box.w / 2;
      for (let pass = 0; pass < 2; pass++) {
        const sx = s * (pass ? 1.04 : 0.98) * (1.12 + (rand() - 0.5) * 0.08);
        const sy = s * (pass ? 1.03 : 1);
        const rot = (rand() - 0.5) * 0.08;
        const ox = (rand() - 0.5) * size * 0.03 + (pass ? size * 0.012 : 0);
        const oy = (rand() - 0.5) * size * 0.02;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        for (const st of g.strokes) {
          const pts: number[] = [];
          for (let k = 0; k < st.length; k += 2) {
            const lx = (st[k] - gcx) * sx;
            const ly = (st[k + 1] - 22) * sy;
            pts.push(
              cx + ox + lx * cos - ly * sin + (rand() - 0.5) * size * 0.008,
              base + oy + lx * sin + ly * cos + (rand() - 0.5) * size * 0.008,
            );
          }
          out.push({ d: atpPath(pts), w: size * (pass ? 0.009 : 0.018), pts, keep: kept(i) });
        }
      }
    });
    const lens = out.map((o) => {
      let l = 0;
      for (let k = 2; k < o.pts.length; k += 2) l += Math.hypot(o.pts[k] - o.pts[k - 2], o.pts[k + 1] - o.pts[k - 1]);
      return Math.max(l, size * 0.02);
    });
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return out.map((o, i) => {
      const a = acc / total;
      acc += lens[i];
      return { d: o.d, w: o.w, a, b: acc / total, guide: o.guide, keep: o.keep };
    });
  }, [metrics]);

  const roughListRef = useRef(roughStrokes);
  const armDeg = metrics && metrics.tall ? ARM_DEG_TALL : ARM_DEG;
  useEffect(() => {
    roughListRef.current = roughStrokes;
    armRef.current = armDeg;
  }, [roughStrokes, armDeg]);

  // Loop animasi: progres, rough, tangan, pointer, keluar, dan iris. Semua yang
  // kontinu ditulis langsung ke DOM; React hanya tahu langkah persen dan fase.
  useEffect(() => {
    if (!tampil) return;
    const stage = stageRef.current;
    const gate = gateRef.current;
    const backdrop = backdropRef.current;
    if (!stage || !gate || !backdrop) return;
    const reduced = hematGerakRef.current;
    let raf = 0;
    let shown = 0;
    let pctLast = -1;
    let last = performance.now();
    let phaseAt = last;
    let local: Phase = "draw";
    let irisX = 0;
    let irisY = 0;
    let irisMax = 1;
    let openX = 0;
    let openY = 0;
    let openMax = 1;
    let roughEls: SVGPathElement[] = [];
    let roughFor: unknown = null;

    const farthest = (x: number, y: number) => {
      const gr = gate.getBoundingClientRect();
      return Math.hypot(Math.max(x, gr.width - x), Math.max(y, gr.height - y)) + 4;
    };
    const mascotR = () => (mascotRef.current ? mascotRef.current.getBoundingClientRect().width : 80) * 0.64;

    const go = (p: Phase, now: number) => {
      local = p;
      phaseAt = now;
      setPhase(p);
      if (p === "reveal") {
        // Iris membuka tepat di tengah aksara hero, lalu hero diizinkan masuk.
        const gr = gate.getBoundingClientRect();
        if (document.querySelector("[data-hero-aksara]")) {
          const h = Math.max(gr.height, 560);
          openX = gr.width / 2;
          openY = gr.width < 700 ? h * 0.46 : h * 0.5;
        } else {
          openX = gr.width / 2;
          openY = gr.height / 2;
        }
        openMax = farthest(openX, openY);
        setReady(true);
      }
      if (p === "fade") setReady(true);
    };

    const setIris = (el: HTMLElement, r: number, inside: boolean, x: number, y: number) => {
      const R = Math.max(0, r);
      const g = inside
        ? "radial-gradient(circle at " + x + "px " + y + "px, #000 " + R + "px, transparent " + (R + 1.5) + "px)"
        : "radial-gradient(circle at " + x + "px " + y + "px, transparent " + R + "px, #000 " + (R + 1.5) + "px)";
      el.style.webkitMaskImage = g;
      el.style.maskImage = g;
    };
    const aimIris = () => {
      const gr = gate.getBoundingClientRect();
      const m = mascotRef.current;
      if (m) {
        // Wajah maskot sedikit di bawah tengah kotaknya.
        const r = m.getBoundingClientRect();
        irisX = r.left + r.width / 2 - gr.left;
        irisY = r.top + r.height * 0.56 - gr.top;
      } else {
        irisX = gr.width / 2;
        irisY = gr.height / 2;
      }
      irisMax = farthest(irisX, irisY);
    };

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeIn = (t: number) => t * t * t;
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - last);
      last = now;
      const ph = local;
      const since = now - phaseAt;

      // ---- progres ----
      if (ph === "draw") {
        const siap = assetsReadyRef.current;
        let target = Math.max(0, Math.min(100, progressRef.current * 100));
        // Cepat-cepat hanya bila aset memang sudah siap.
        if (rushRef.current && siap) target = 100;
        // Tidak pernah lebih cepat dari 100% dalam 2,6 detik (1,1 detik bila didesak).
        const cap = (dt / (rushRef.current ? 1100 : 2600)) * 100;
        const ease = 1 - Math.exp(-dt / 160);
        shown = reduced ? target : Math.min(target, shown + Math.min(cap, Math.max(0.02, (target - shown) * ease)));
        if (target >= 100 && shown > 99.6) shown = 100;
        const p = Math.floor(shown);
        if (p !== pctLast) {
          pctLast = p;
          setPct(p);
        }
        if (shown >= 100) go(reduced ? "hold" : "grip", now);
      } else if (ph === "grip" && since > GRIP_MS) go("hold", now);
      else if (ph === "hold" && since > (reduced ? 900 : HOLD_MS)) go(reduced ? "fade" : "fling", now);
      else if (ph === "fling" && since > FLING_MS) {
        aimIris();
        go("iris", now);
      } else if (ph === "iris" && since > IRIS_MS) go("wink", now);
      else if (ph === "wink" && since > WINK_MS) go("shut", now);
      else if (ph === "shut" && since > SHUT_MS) go("reveal", now);
      else if (ph === "reveal" && since > REVEAL_MS) {
        cancelAnimationFrame(raf);
        setPhase("done");
        return;
      } else if (ph === "fade" && since > FADE_MS) {
        cancelAnimationFrame(raf);
        setPhase("done");
        return;
      }

      // ---- iris ----
      if (ph === "iris") {
        const r0 = mascotR();
        setIris(stage, r0 + (irisMax - r0) * (1 - easeInOut(clamp(since / IRIS_MS))), true, irisX, irisY);
      } else if (ph === "wink") {
        setIris(stage, mascotR(), true, irisX, irisY);
      } else if (ph === "shut") {
        setIris(stage, mascotR() * (1 - easeIn(clamp(since / SHUT_MS))), true, irisX, irisY);
      } else if (ph === "reveal") {
        stage.style.visibility = "hidden";
        setIris(backdrop, openMax * easeOut(clamp(since / REVEAL_MS)), false, openX, openY);
      }

      // ---- pointer, dihaluskan ----
      const pt = pointerRef.current;
      pt.x += (pt.tx - pt.x) * 0.08;
      pt.y += (pt.ty - pt.y) * 0.08;
      const card = cardRef.current;
      if (card && !reduced) card.style.transform = "translate(calc(-50% + " + (pt.x * 7).toFixed(2) + "px), calc(-50% + " + (pt.y * 5).toFixed(2) + "px))";
      pupilRefs.current.forEach((el) => {
        if (el) el.setAttribute("transform", "translate(" + (pt.x * 3.2).toFixed(2) + " " + (pt.y * 2.4).toFixed(2) + ")");
      });

      // ---- rough digambar mengikuti muat ----
      const rg = roughRef.current;
      if (rg) {
        if (roughFor !== roughListRef.current || !roughEls[0] || !roughEls[0].isConnected) {
          roughFor = roughListRef.current;
          roughEls = Array.from(rg.querySelectorAll("path"));
        }
        const k = ph === "draw" ? clamp((shown - 4) / 48) : 1;
        for (const el of roughEls) {
          const a = Number(el.dataset.a);
          const b = Number(el.dataset.b);
          const v = clamp((k - a) / Math.max(1e-6, b - a));
          const off = v >= 1 ? "0" : v <= 0 ? "1.001" : (1 - v).toFixed(4);
          if (el.style.strokeDashoffset !== off) el.style.strokeDashoffset = off;
        }
      }

      // ---- tangan ----
      const hl = handLRef.current;
      const hr = handRRef.current;
      if (hl && hr) {
        const sw = stage.clientWidth;
        const D = Math.max(sw, 700) * 0.85;
        let reach = reduced ? (shown >= 10 ? 1 : 0) : easeOut(clamp((shown - 10) / 62));
        let push = 0;
        if (ph === "grip") push = Math.sin(clamp(since / GRIP_MS) * Math.PI) * 10;
        if (ph === "hold") push = 3;
        if (ph === "fling") {
          const t = clamp(since / FLING_MS);
          push = t < 0.24 ? Math.sin((t / 0.24) * (Math.PI / 2)) * 16 : 16 - easeIn((t - 0.24) / 0.76) * (D * 1.3);
          reach = 1;
        }
        if (ph === "iris" || ph === "wink" || ph === "shut" || ph === "reveal") reach = -0.6;
        // Gerak diam di dua: tangan bergerak 12fps seperti gambar tangan.
        const tw = Math.floor(now / 83.3) * 83.3;
        const bob = reduced ? 0 : Math.sin(tw / 620) * 3.2;
        const tilt = reduced ? 0 : Math.sin(tw / 910) * 0.8;
        const along = -(1 - reach) * D + push;
        const rad = (armRef.current * Math.PI) / 180;
        const dx = along * Math.cos(rad);
        const dy = -along * Math.sin(rad);
        const py = reduced ? 0 : pt.y * 9;
        hl.style.transform = "translate(" + dx.toFixed(1) + "px," + (dy + bob + py).toFixed(1) + "px) rotate(" + (tilt + pt.y * 1.5).toFixed(2) + "deg)";
        hr.style.transform = "translate(" + (-dx).toFixed(1) + "px," + (dy - bob * 0.8 + py).toFixed(1) + "px) rotate(" + (-tilt - pt.y * 1.5).toFixed(2) + "deg)";
        const vis = reach > -0.55 ? "visible" : "hidden";
        if (hl.style.visibility !== vis) {
          hl.style.visibility = vis;
          hr.style.visibility = vis;
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tampil, progressRef, setReady]);

  if (!tampil) return null;

  const onActivate = () => {
    if (phaseRef.current === "draw") rushRef.current = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    pointerRef.current.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointerRef.current.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  const onPointerLeave = () => {
    pointerRef.current.tx = 0;
    pointerRef.current.ty = 0;
  };

  const final = phase !== "draw";
  const stageIdx = final ? 3 : atpStage(pct);
  const n = LETTERS.length;
  const fullTitle = [KICKER, TITLE, CONNECTOR, NAME].filter(Boolean).join(" ");
  const keluar = phase !== "draw" && phase !== "grip" && phase !== "hold";

  // Tangan memegang kata di ujungnya, berskala mengikuti ukuran kata.
  const handScale = metrics ? metrics.size * (metrics.tall ? 0.0046 : 0.0036) : 0;
  const handY = metrics ? metrics.base - metrics.size * 0.3 : 0;
  const firstBox = metrics && metrics.boxes[0];
  const lastBox = metrics && metrics.boxes[metrics.boxes.length - 1];
  const handLX = firstBox && metrics ? firstBox.x + metrics.size * 0.05 : 0;
  const handRX = lastBox && metrics ? lastBox.x + lastBox.w - metrics.size * 0.04 : 0;

  const c = PALET;
  const vars = {
    "--atp-stage": c.stage,
    "--atp-ink": c.ink,
    "--atp-muted": c.muted,
    "--atp-rough": c.rough,
    "--atp-word0": c.word0,
    "--atp-word1": c.word1,
    "--atp-word2": c.word2,
    "--atp-skin0": c.skin0,
    "--atp-skin2": c.skin2,
    "--atp-nail": c.nail,
    "--atp-cuff": c.cuff,
    "--atp-display": DISPLAY_STACK,
    "--atp-mono": MONO_STACK,
    "--atp-word-size": "calc(min(" + WORD_VW + "cqw, 21cqh) * " + fit.toFixed(3) + ")",
  } as CSSProperties;

  return (
    <div
      ref={gateRef}
      className={styles.gate}
      data-phase={phase}
      data-preloader-state={keluar ? "exiting" : "loading"}
      role="progressbar"
      aria-label="Menyiapkan beranda IKASADA"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={final ? 100 : pct}
      aria-valuetext={STAGES[stageIdx] + ", " + (final ? 100 : pct) + "%"}
      style={vars}
      tabIndex={0}
      onClick={onActivate}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <div ref={backdropRef} className={styles.backdrop} />
      <div
        ref={stageRef}
        className={styles.stage}
        data-trinkets={pct >= 3 || final ? "1" : "0"}
        data-mascot={pct >= 88 || final ? "1" : "0"}
        data-final={final ? "1" : "0"}
      >
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <defs>
            <filter id={uid + "-boil"} x="-10%" y="-30%" width="120%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="2" result="n">
                {hematGerak ? null : <animate attributeName="seed" values="2;5;8" dur="0.375s" calcMode="discrete" repeatCount="indefinite" />}
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id={uid + "-boilpx"} x="-5%" y="-20%" width="110%" height="140%" filterUnits="objectBoundingBox">
              <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="3" result="n">
                {hematGerak ? null : <animate attributeName="seed" values="3;6;9" dur="0.375s" calcMode="discrete" repeatCount="indefinite" />}
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale={metrics ? Math.max(2, metrics.size * 0.022) : 3} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id={uid + "-paint"} x="-5%" y="-15%" width="110%" height="130%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 0  0 0 0 0 .02  0 0 0 -1.7 1.08" result="dark" />
              <feComposite in="dark" in2="SourceGraphic" operator="in" result="grain" />
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="5" result="w" />
              <feDisplacementMap in="SourceGraphic" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G" result="wob" />
              <feMerge>
                <feMergeNode in="wob" />
                <feMergeNode in="grain" />
              </feMerge>
            </filter>
            <filter id={uid + "-grain"} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" result="n" />
              <feColorMatrix in="n" type="saturate" values="0" />
            </filter>
            <linearGradient id={uid + "-sleeve"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={c.sleeve0} />
              <stop offset=".5" stopColor={c.sleeve1} />
              <stop offset="1" stopColor={c.sleeve2} />
            </linearGradient>
            <linearGradient id={uid + "-skin"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={c.skin0} />
              <stop offset=".55" stopColor={c.skin1} />
              <stop offset="1" stopColor={c.skin2} />
            </linearGradient>
            <pattern id={uid + "-swirl"} width="124" height="124" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
              <path d={SWIRLS} fill="none" stroke={c.pattern} strokeWidth="4.5" strokeLinecap="round" opacity=".55" />
              <circle cx="70" cy="18" r="3" fill={c.speck} opacity=".6" />
              <circle cx="8" cy="64" r="2.4" fill={c.speck} opacity=".5" />
              <circle cx="60" cy="108" r="1.8" fill={c.speck} opacity=".55" />
              <circle cx="112" cy="58" r="2.6" fill={c.speck} opacity=".5" />
              <circle cx="48" cy="80" r="1.4" fill={c.speck} opacity=".5" />
            </pattern>
          </defs>
        </svg>

        <svg className={styles.grain} aria-hidden="true">
          <rect width="100%" height="100%" filter={"url(#" + uid + "-grain)"} />
        </svg>
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.pegs} aria-hidden="true">
          <span className={styles.peg} style={{ width: 30, height: 10 }} />
          <span className={styles.peg} style={{ width: 13, height: 13 }} />
          <span className={styles.peg} style={{ width: 30, height: 10 }} />
        </div>

        <div ref={cardRef} className={styles.card}>
          <div className={styles.kickrow}>
            <Trinket className={styles.trinket} filterId={uid + "-boil"} />
            <ScriptLine
              laid={kickLaid}
              text={KICKER}
              maskId={uid + "-mk"}
              filterId={uid + "-boil"}
              on={pct >= 1 || final}
              duration={hematGerak ? 0 : 1600}
              className={styles.kicker}
            />
            <Trinket className={styles.trinket + " " + styles.t2} filterId={uid + "-boil"} />
          </div>

          <div className={styles.titlewrap}>
            {metrics ? (
              <>
                <div className={styles.handslot} style={{ left: handLX, top: handY }} aria-hidden="true">
                  <div ref={handLRef} className={styles.hand} style={{ visibility: "hidden" }}>
                    <svg>
                      <g transform={"scale(" + handScale + ") rotate(" + -armDeg + ")"}>
                        <Hand id={uid} side="l" />
                      </g>
                    </svg>
                  </div>
                </div>
                <div className={styles.handslot} style={{ left: handRX, top: handY }} aria-hidden="true">
                  <div ref={handRRef} className={styles.hand} style={{ visibility: "hidden" }}>
                    <svg>
                      <g transform={"scale(" + handScale + ") rotate(" + armDeg + ")"}>
                        <Hand id={uid} side="r" />
                      </g>
                    </svg>
                  </div>
                </div>
              </>
            ) : null}

            <p
              ref={wordRef}
              className={styles.word}
              aria-hidden="true"
              style={metrics ? ({ "--atp-ww": metrics.ww + "px" } as CSSProperties) : undefined}
            >
              {LETTERS.map((ch, i) => {
                const beat = atpBeats(i, n);
                const box = metrics && metrics.boxes[i];
                return (
                  <span
                    key={i}
                    data-ch=""
                    className={styles.ch}
                    data-ink={pct >= beat.ink || final ? "1" : "0"}
                    data-paint={pct >= beat.paint || final ? "1" : "0"}
                    style={box ? ({ "--atp-gx": -box.x + "px" } as CSSProperties) : undefined}
                  >
                    <span className={styles.ink}>{ch === " " ? " " : ch}</span>
                    <span className={styles.paint}>{ch === " " ? " " : ch}</span>
                  </span>
                );
              })}
              <span ref={probeRef} style={{ display: "inline-block", width: 0, height: 0 }} />
            </p>

            {metrics ? (
              <svg className={styles.rough} width={metrics.ww} height={metrics.wh} aria-hidden="true">
                {/* Bayangan adalah path sungguhan, bukan <use>: klon path beranimasi membuat
                    Chrome memfilter ulang tangan yang dicat tiap frame. */}
                <g ref={roughRef} filter={"url(#" + uid + "-boilpx)"} fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <g stroke={c.ghost} opacity=".7" transform={"translate(" + (metrics.size * 0.014).toFixed(1) + " " + (metrics.size * 0.01).toFixed(1) + ")"}>
                    {roughStrokes.map((s, i) => (
                      <path key={i} d={s.d} strokeWidth={s.w} strokeOpacity={s.guide ? 0.5 : 1} pathLength={1} data-a={s.a} data-b={s.b} data-keep={s.keep ? "1" : "0"} />
                    ))}
                  </g>
                  <g stroke={c.rough}>
                    {roughStrokes.map((s, i) => (
                      <path key={i} d={s.d} strokeWidth={s.w} strokeOpacity={s.guide ? 0.5 : 1} pathLength={1} data-a={s.a} data-b={s.b} data-keep={s.keep ? "1" : "0"} />
                    ))}
                  </g>
                </g>
              </svg>
            ) : null}
          </div>

          {CONNECTOR ? (
            <div className={styles.ofrow}>
              <ScriptLine
                laid={ofLaid}
                text={CONNECTOR}
                maskId={uid + "-mo"}
                filterId={uid + "-boil"}
                on={pct >= 72 || final}
                duration={hematGerak ? 0 : 500}
                className=""
              />
            </div>
          ) : null}

          <div className={styles.namerow}>
            <ScriptLine
              laid={nameLaid}
              text={NAME}
              maskId={uid + "-mn"}
              filterId={uid + "-boil"}
              on={pct >= 78 || final}
              duration={hematGerak ? 0 : 1900}
              className=""
              flourish
            />
          </div>

          <svg ref={mascotRef} className={styles.mascot} viewBox="0 0 120 84" aria-hidden="true">
            <g filter={"url(#" + uid + "-boil)"} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <circle className={styles.mdot} cx="44" cy="12" r="2.4" fill="currentColor" stroke="none" />
              <circle className={styles.mdot + " " + styles.d2} cx="60" cy="10" r="5" fill="currentColor" stroke="none" />
              <circle className={styles.mdot + " " + styles.d3} cx="76" cy="12" r="2.4" fill="currentColor" stroke="none" />
              <path className={styles.mdraw} pathLength={1} d="M58 52 C58 40 44 36 34 40 C22 45 22 62 34 65 C46 68 56 62 58 52 C60 62 70 68 82 65 C94 62 98 45 86 40 C76 36 62 40 62 52" />
              <path className={styles.mdraw} pathLength={1} d="M22 46 C14 44 9 47 6 52 M98 46 C106 44 111 47 114 52" />
              <g className={styles.eye}>
                <circle ref={(el) => { pupilRefs.current[0] = el; }} cx="40" cy="53" r="4.6" fill="currentColor" stroke="none" />
              </g>
              <g className={styles.eye + " " + styles.e2}>
                <circle ref={(el) => { pupilRefs.current[1] = el; }} cx="80" cy="53" r="4.6" fill="currentColor" stroke="none" />
              </g>
              <path className={styles.lid} d="M71 54 Q80 59 89 54" />
            </g>
          </svg>
        </div>
      </div>
      <span className={styles.sr} aria-live="polite">
        {fullTitle + (final ? ". Selesai dimuat." : "")}
      </span>
    </div>
  );
}
