export const KUNCI_PEMULIHAN_GULIR = "ikasada:pulihkan-gulir";
const KUNCI_JANGKAR = "ikasada:jangkar-gulir";
type Jangkar = { selector: string; offset: number; horizontal: { selector: string; left: number }[] };
let hentikanAktif: (() => void) | undefined;

export function catatJangkarGulir(alamat: string): void {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("main a[href], main section[id]"))
    .filter(el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; })
    .sort((a, b) => Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top));
  const el = candidates[0];
  if (!el) return;
  const selector = el.id ? `#${CSS.escape(el.id)}` : `a[href="${CSS.escape(el.getAttribute("href") ?? "")}"]`;
  const horizontal = Array.from(document.querySelectorAll<HTMLElement>('[aria-roledescription="carousel"][aria-label]'))
    .map(track => ({ selector: `[aria-roledescription="carousel"][aria-label="${CSS.escape(track.getAttribute("aria-label") ?? "")}"]`, left: track.scrollLeft }));
  try {
    const map = JSON.parse(sessionStorage.getItem(KUNCI_JANGKAR) ?? "{}");
    map[alamat] = { selector, offset: el.getBoundingClientRect().top, horizontal };
    sessionStorage.setItem(KUNCI_JANGKAR, JSON.stringify(map));
  } catch { /* Posisi numerik tetap menjadi cadangan. */ }
}

export function tujuanGulirTersimpan(alamat: string, posisi: number): () => number | null {
  let jangkar: Jangkar | undefined;
  try { jangkar = JSON.parse(sessionStorage.getItem(KUNCI_JANGKAR) ?? "{}")[alamat]; } catch { /* gunakan posisi */ }
  return () => {
    if (jangkar) {
      for (const item of jangkar.horizontal ?? []) {
        const track = document.querySelector<HTMLElement>(item.selector);
        if (track) track.scrollLeft = item.left;
      }
      const el = document.querySelector(jangkar.selector);
      if (el) return Math.max(0, el.getBoundingClientRect().top + scrollY - jangkar.offset);
    }
    return posisi;
  };
}

// Posisi dipasang saat layout siap, tanpa animasi perjalanan scroll.
export function pulihkanGulir(tujuan: () => number | null, selesai?: () => void) {
  hentikanAktif?.();
  const alamat = location.pathname + location.search + location.hash;
  const mulai = performance.now();
  let frame = 0;
  let stabilSejak = 0;
  let tinggiSebelumnya = 0;
  let sebelumnya: number | null = null;
  let berhenti = false;
  document.documentElement.dataset.historyRestoring = "true";
  document.documentElement.dataset.scrollReturnPending = "true";
  const hentikan = () => {
    if (berhenti) return;
    berhenti = true;
    cancelAnimationFrame(frame);
    for (const event of ["wheel", "touchstart", "keydown", "pointerdown"]) window.removeEventListener(event, hentikan);
    delete document.documentElement.dataset.historyRestoring;
    delete document.documentElement.dataset.sectionNavigation;
    delete document.documentElement.dataset.scrollReturnPending;
    if (hentikanAktif === hentikan) hentikanAktif = undefined;
    selesai?.();
    window.dispatchEvent(new Event("scroll"));
  };
  const langkah = () => {
    if (alamat !== location.pathname + location.search + location.hash) { hentikan(); return; }
    const target = tujuan();
    const memuat = document.querySelector('main [aria-label^="Memuat"], #statistik .animate-pulse');
    const maksimal = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const habis = performance.now() - mulai >= 2000;
    if (target !== null && (!memuat || habis) && (maksimal >= target - 1 || habis)) {
      window.scrollTo({ top: Math.min(maksimal, Math.max(0, target)), behavior: "instant" });
      if (sebelumnya === null || Math.abs(target - sebelumnya) >= 1 || maksimal !== tinggiSebelumnya) {
        stabilSejak = performance.now();
      }
      sebelumnya = target;
      tinggiSebelumnya = maksimal;
      if (performance.now() - stabilSejak >= 100 || habis) { hentikan(); return; }
    }
    if (habis) hentikan();
    else frame = requestAnimationFrame(langkah);
  };
  hentikanAktif = hentikan;
  for (const event of ["wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(event, hentikan, { passive: true });
  frame = requestAnimationFrame(langkah);
  return hentikan;
}
