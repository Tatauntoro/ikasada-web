#!/usr/bin/env node
/**
 * Verifikasi motion & transisi halaman IKASADA di browser sungguhan.
 *
 * Menjalankan Chromium headless lewat `puppeteer-core`, lalu memeriksa
 * perilaku yang tidak bisa ditangkap typecheck maupun markup SSR: geometri
 * preloader, sisa transform pada wrapper transisi, perilaku tombol back
 * (posisi scroll dipulihkan, veil tidak main ulang), morph gambar kartu ke hero
 * detail, peta sebaran di #statistik (termasuk bukti bahwa koreografi "titik
 * mengumpul" sudah TIDAK ada lagi), plus jalur pengaman reduced-motion, viewport
 * ponsel, tablet, viewport pendek, saveData, dan connection yang tidak sesuai
 * kontrak.
 *
 * Pakai:
 *   npm run motion:verify
 *   node scripts/verify-motion.mjs --base http://localhost:3001
 *
 * Prasyarat: dev server sudah jalan, dan `puppeteer-core` bisa di-resolve
 * (dari project ini atau dari node_modules di home). Chromium diambil dari
 * cache puppeteer; kalau tidak ada, set env CHROME ke binary Chrome apa pun.
 *
 * Keluar dengan kode 1 kalau ada pemeriksaan yang gagal.
 */

import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/* ---------- argumen ---------- */
const argBase = process.argv.indexOf("--base");
const BASE = argBase > -1 ? process.argv[argBase + 1] : "http://localhost:3000";

/* ---------- resolve puppeteer-core ---------- */
function muatPuppeteer() {
  const akar = [process.cwd(), homedir()];
  for (const dir of akar) {
    try {
      const req = createRequire(join(dir, "noop.js"));
      const mod = req("puppeteer-core");
      return mod.default ?? mod;
    } catch {
      /* coba lokasi berikutnya */
    }
  }
  console.error(
    "puppeteer-core tidak ditemukan.\n" +
      "Install dulu, misalnya:  npm install --no-save puppeteer-core"
  );
  process.exit(1);
}

/* ---------- resolve binary Chromium ---------- */
function cariChrome() {
  if (process.env.CHROME) return process.env.CHROME;

  const akar = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(akar)) {
    for (const versi of readdirSync(akar)) {
      for (const arch of ["chrome-mac-arm64", "chrome-mac-x64", "chrome-linux64"]) {
        const jalur = join(
          akar,
          versi,
          arch,
          "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
        );
        if (existsSync(jalur)) return jalur;
      }
    }
  }

  const sistem = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
  if (sistem) return sistem;

  console.error(
    "Chromium tidak ditemukan. Set env CHROME ke binary Chrome/Chromium."
  );
  process.exit(1);
}

const puppeteer = muatPuppeteer();
const CHROME = cariChrome();

const hasil = [];
const catat = (nama, detail, lulus) => hasil.push({ nama, detail, lulus });
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900 },
});

const VH = 900;

/*
 * Jumlah penanda peta sebaran: satu titik asal + satu titik tujuan per busur.
 * Busurnya berangkat dari Indonesia ke enam benua (lihat benua.json), jadi
 * 6 x 2 = 12. Kalau komposisi busurnya berubah, angka ini yang menyesuaikan.
 */
const PIN_PETA = 12;

const page = await browser.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 250));
});
page.on("pageerror", (e) => errors.push(`PAGEERROR ${String(e).slice(0, 180)}`));

/*
 * Pemanasan, sengaja tidak diukur.
 *
 * Kunjungan pertama setelah kode berubah memicu kompilasi ulang dev server,
 * dan halaman bisa jauh lebih lambat dari biasanya. Kalau pengukuran preloader
 * ikut terkena, fase-fasenya bergeser dan pemeriksaan A gagal walau kodenya
 * benar — ini penyebab run flaky yang pernah terlihat. Preloader selalu jalan
 * di tiap muat (tidak ada gerbang sessionStorage), jadi kunjungan berikutnya
 * tetap mengukur urutan fase yang utuh.
 */
await page.goto(BASE, { waitUntil: "networkidle2" });

/* ---------- A. Preloader: fase + geometri ---------- */
await page.goto(BASE, { waitUntil: "domcontentloaded" });

const urutan = [];
let sebelum = null;
let geo = null;
const t0 = Date.now();

while (Date.now() - t0 < 20000) {
  const st = await page.evaluate(
    () =>
      document
        .querySelector("[data-preloader-state]")
        ?.getAttribute("data-preloader-state") ?? "hilang"
  );
  if (st !== sebelum) {
    urutan.push(st);
    sebelum = st;
    if (st === "network") {
      geo = await page.evaluate(() => {
        const pre = document.querySelector("[data-preloader-state]");
        const svg = document.querySelector(".preloader-node")?.ownerSVGElement;
        const aksara = pre?.querySelector("div > div");
        const tengah = (el) => {
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return Math.round(b.y + b.height / 2);
        };
        return {
          tinggi: Math.round(pre.getBoundingClientRect().height),
          svgTengah: tengah(svg),
          aksaraTengah: tengah(aksara),
          titik: document.querySelectorAll(".preloader-node").length,
          garis: document.querySelectorAll(".preloader-edge").length,
        };
      });
    }
  }
  if (st === "hilang") break;
  await tunggu(60);
}

catat(
  "A1 urutan fase preloader",
  urutan.join(" → "),
  urutan[0] === "loading" &&
    urutan[1] === "network" &&
    urutan[2] === "exiting" &&
    urutan[urutan.length - 1] === "hilang"
);

catat(
  "A2 preloader setinggi viewport (bukan tinggi dokumen)",
  `tinggi ${geo?.tinggi}px, viewport ${VH}px`,
  Boolean(geo) && Math.abs(geo.tinggi - VH) <= 2
);

catat(
  "A3 isi preloader ter-center di viewport",
  `jejaring y=${geo?.svgTengah}, aksara y=${geo?.aksaraTengah}, ${geo?.titik} titik / ${geo?.garis} garis`,
  Boolean(geo) &&
    Math.abs(geo.svgTengah - VH / 2) <= 30 &&
    Math.abs(geo.aksaraTengah - VH / 2) <= 30 &&
    geo.titik === 19 &&
    geo.garis === 25
);

/* ---------- B. Wrapper transisi tidak menyisakan transform ---------- */
await tunggu(2500);
const pe = await page.evaluate(() => {
  const el = document.querySelector(".page-enter");
  if (!el) return { ada: false };
  return {
    ada: true,
    transform: getComputedStyle(el).transform,
    fill: getComputedStyle(el).animationFillMode,
  };
});
catat(
  "B1 .page-enter bersih saat diam",
  `transform=${pe.transform}, fill-mode=${pe.fill}`,
  pe.ada && pe.transform === "none"
);

const navbar = await page.evaluate(async () => {
  window.scrollTo(0, 1200);
  await new Promise((r) => setTimeout(r, 900));
  const el = document.querySelector(".fixed");
  if (!el) return null;
  return {
    top: Math.round(el.getBoundingClientRect().top),
    pos: getComputedStyle(el).position,
  };
});
catat(
  "B2 elemen fixed tetap menempel saat scroll",
  navbar ? `position=${navbar.pos}, top=${navbar.top}px` : "tidak ada .fixed",
  Boolean(navbar) && navbar.pos === "fixed" && navbar.top < 60
);

await page.evaluate(() => window.scrollTo(0, 0));
await tunggu(800);

/* ---------- C. Navigasi: back memulihkan posisi tanpa memutar veil ---------- */
/*
 * Dulu blok ini menguji reveal parallax section "tiga cara". Section itu sudah
 * diganti beberapa kali, jadi bahannya tidak stabil untuk dijadikan gerbang
 * regresi. Yang dikunci di sini adalah perilaku navigasi — dan itu memang
 * pernah rusak: `scrollRestoration` dipaksa "manual" plus scroll paksa ke
 * `#hero` tiap perubahan pathname, sehingga tombol back selalu mendarat di
 * puncak halaman; veil preloader juga main ulang setiap kembali ke beranda.
 *
 * Halaman dibuat baru supaya tidak mengganggu urutan pemeriksaan berikutnya.
 */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(BASE, { waitUntil: "networkidle2" });
  await tunggu(6500); // biarkan veil preloader selesai
  await p.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });

  // Turun ke CTA "Lihat Semua Alumni" (menuju /alumni), catat posisinya.
  await p.evaluate(() => {
    const a = document.querySelector('a[href="/alumni"]');
    window.scrollTo(0, a.getBoundingClientRect().top + window.scrollY - 400);
  });
  await tunggu(700);
  const sebelum = await p.evaluate(() => Math.round(window.scrollY));

  await Promise.all([
    p.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
    p.evaluate(() => document.querySelector('a[href="/alumni"]')?.click()),
  ]);
  await tunggu(1000);

  await p.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
  let veilMunculLagi = false;
  for (let i = 0; i < 30; i++) {
    if (await p.evaluate(() => !!document.querySelector("[data-preloader-state]"))) {
      veilMunculLagi = true;
    }
    await tunggu(50);
  }
  await tunggu(1500);
  const sesudah = await p.evaluate(() => Math.round(window.scrollY));
  const kembaliKe = await p.evaluate(() => window.location.pathname);

  catat(
    "C1 tombol back: posisi dipulihkan, veil tidak main ulang",
    `path=${kembaliKe}, scrollY ${sebelum} → ${sesudah}, veil muncul lagi=${veilMunculLagi}`,
    kembaliKe === "/" &&
      Math.abs(sesudah - sebelum) < 150 &&
      !veilMunculLagi
  );
  await p.close();
}

/* ---------- D. Kartu direktori tersusun ---------- */
await page.evaluate(() =>
  document.querySelector("#alumni .grid")?.scrollIntoView({ block: "center" })
);
await tunggu(2500);

const kartu = await page.evaluate(() => {
  const items = Array.from(
    document.querySelectorAll("#alumni .grid > .reveal-item")
  );
  return {
    total: items.length,
    revealed: items.filter((e) => e.classList.contains("revealed")).length,
    transparan: items.filter((e) => Number(getComputedStyle(e).opacity) < 0.9)
      .length,
    delay: items.map((e) => e.style.getPropertyValue("--reveal-delay")),
    animasiTertinggal: items.filter((e) => e.getAnimations().length > 0).length,
  };
});
catat(
  "D1 kartu direktori tersusun bertingkat",
  `total ${kartu.total}, revealed ${kartu.revealed}, transparan ${kartu.transparan}, animasi tertinggal ${kartu.animasiTertinggal}, delay [${kartu.delay.join(", ")}]`,
  kartu.total > 0 &&
    kartu.revealed === kartu.total &&
    kartu.transparan === 0 &&
    kartu.animasiTertinggal === 0 &&
    kartu.delay[1] === "70ms"
);

const kotak = await page.evaluate(() => {
  const r = document
    .querySelector("#alumni .grid > .reveal-item")
    .getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
const ySebelum = await page.evaluate(
  () =>
    document.querySelector("#alumni .grid > .reveal-item").getBoundingClientRect()
      .y
);
await page.mouse.move(kotak.x, kotak.y);
await tunggu(1100);
const hover = await page.evaluate(() => {
  const el = document.querySelector("#alumni .grid > .reveal-item");
  return { y: el.getBoundingClientRect().y, translate: getComputedStyle(el).translate };
});
const naik = Math.round((ySebelum - hover.y) * 100) / 100;
catat(
  "D2 hover-lift kartu tetap hidup",
  `rect naik ${naik}px, translate=${hover.translate}`,
  naik >= 7 && naik <= 9
);

/* ---------- E. Transisi route & pengecualian admin ---------- */
await page.goto(`${BASE}/alumni`, { waitUntil: "networkidle2" });
const pindah = await page.evaluate(async () => {
  const link = Array.from(document.querySelectorAll("a")).find(
    (a) => a.getAttribute("href") === "/" && a.textContent?.trim() === "Beranda"
  );
  if (!link) return "link Beranda tidak ketemu";
  link.click();
  for (let i = 0; i < 60; i++) {
    const el = document.querySelector(".page-enter");
    if (el)
      return `page-enter ada, animation=${getComputedStyle(el).animationName}`;
    await new Promise((r) => requestAnimationFrame(r));
  }
  return "page-enter tidak muncul";
});
catat("E1 transisi route biasa", pindah, String(pindah).includes("page-enter"));

await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
const admin = await page.evaluate(
  () => document.querySelectorAll(".page-enter").length
);
catat("E2 /admin tanpa animasi masuk", `${admin} elemen`, admin === 0);

/* ---------- F. Morph gambar kartu → hero detail ---------- */
await page.goto(`${BASE}/event`, { waitUntil: "networkidle2" });
await tunggu(2500);

const siap = await page.evaluate(() => {
  const a = Array.from(
    document.querySelectorAll('article a[href^="/kegiatan/"]')
  ).find((x) => {
    const img = x.closest("article")?.querySelector("img");
    return img && !img.getAttribute("src")?.includes("placeholder");
  });
  if (!a) return null;
  return { href: a.getAttribute("href") };
});
catat("F1 kartu kegiatan siap diklik", JSON.stringify(siap), Boolean(siap));

if (siap) {
  await page.evaluate((href) => {
    Array.from(document.querySelectorAll('article a[href^="/kegiatan/"]'))
      .find((x) => x.getAttribute("href") === href)
      .click();
  }, siap.href);

  let potret = null;
  for (let i = 0; i < 60; i++) {
    const info = await page.evaluate(() => {
      const el = document.body.querySelector(":scope > img[aria-hidden='true']");
      if (!el) return null;
      const s = getComputedStyle(el);
      return { pos: s.position, radius: s.borderRadius };
    });
    if (info) {
      potret = info;
      break;
    }
    await tunggu(30);
  }

  await tunggu(1200);
  const sisa = await page.evaluate(
    () =>
      document.body.querySelectorAll(":scope > img[aria-hidden='true']").length
  );
  const hero = await page.evaluate(() => {
    const img = document.querySelector("img[alt]");
    return img ? getComputedStyle(img).opacity : "tidak ada";
  });
  catat(
    "F2 morph kartu → hero detail",
    `overlay ${JSON.stringify(potret)}; sisa ${sisa}; opacity hero ${hero}`,
    Boolean(potret) &&
      potret.pos === "fixed" &&
      sisa === 0 &&
      Number(hero) === 1
  );
}

/* ---------- G. Peta sebaran tampil utuh tanpa koreografi titik ---------- */
await page.goto(BASE, { waitUntil: "networkidle2" });
await tunggu(4500); // preloader selesai + peta hasil fetch statistik ter-render

const pinAwal = await page.evaluate(() => {
  const svg = document.querySelector("#statistik svg");
  return {
    adaSvg: Boolean(svg),
    jumlahPin: svg ? svg.querySelectorAll("[data-pin]").length : 0,
    diBawahLayar: svg
      ? svg.getBoundingClientRect().top > window.innerHeight
      : null,
  };
});
catat(
  `G1 peta punya ${PIN_PETA} pin dan masih di bawah layar`,
  `svg=${pinAwal.adaSvg}, pin=${pinAwal.jumlahPin}, di bawah layar=${pinAwal.diBawahLayar}`,
  pinAwal.adaSvg &&
    pinAwal.jumlahPin === PIN_PETA &&
    pinAwal.diBawahLayar === true
);

/*
 * Koreografi "titik mengumpul" sudah dihapus, jadi yang dikunci sekarang adalah
 * KETIDAKADAANNYA. Perekam dipasang dari dalam halaman supaya titik yang muncul
 * sekejap pun tetap tertangkap — memeriksa setelah semuanya selesai tidak akan
 * membuktikan apa-apa.
 */
await page.evaluate(() => {
  window.__morph = { maksTitik: 0 };
  window.__morphTimer = setInterval(() => {
    const n = document.querySelectorAll(".network-morph-dot").length;
    if (n > window.__morph.maksTitik) window.__morph.maksTitik = n;
  }, 30);
});

await page.evaluate(() => {
  const svg = document.querySelector("#statistik svg");
  const r = svg.getBoundingClientRect();
  window.scrollTo(0, window.scrollY + r.top - window.innerHeight * 0.5);
});
await tunggu(4000);

const morph = await page.evaluate(() => {
  clearInterval(window.__morphTimer);
  const svg = document.querySelector("#statistik svg");
  const pins = Array.from(document.querySelectorAll("#statistik [data-pin]"));
  const sr = svg?.getBoundingClientRect();
  return {
    maksTitik: window.__morph.maksTitik,
    sisaTitik: document.querySelectorAll(".network-morph-dot").length,
    // Berukuran, bukan "kebetulan masuk viewport": yang terakhir itu bergantung
    // tinggi layar dan posisi gulir, bukan properti halamannya.
    pinBerukuran: pins.filter((el) => el.getBoundingClientRect().width > 0).length,
    svgDiLayar: sr ? sr.bottom > 0 && sr.top < window.innerHeight : false,
  };
});

catat(
  "G2 tidak ada titik yang terbang ke peta",
  `puncak ${morph.maksTitik} titik, sisa ${morph.sisaTitik}`,
  morph.maksTitik === 0 && morph.sisaTitik === 0
);

catat(
  "G3 peta tampil utuh dengan seluruh pin-nya",
  `${morph.pinBerukuran} dari ${PIN_PETA} pin berukuran, svg di layar=${morph.svgDiLayar}`,
  morph.pinBerukuran === PIN_PETA && morph.svgDiLayar === true
);

/* ---------- H. Jalur pengaman: reduced-motion & viewport ponsel ---------- */

/**
 * Pasang perekam, gulir sampai peta masuk, lalu laporkan hasilnya.
 *
 * Yang diukur bukan lagi penerbangan titiknya, melainkan: peta muncul utuh
 * dengan seluruh pin terlihat, dan tidak ada satu pun titik koreografi yang
 * pernah dibuat. Perekam tetap dipasang supaya titik yang muncul sekejap pun
 * tertangkap.
 */
async function ukurPeta(p) {
  await p.evaluate(() => {
    window.__r = { maksTitik: 0 };
    window.__rt = setInterval(() => {
      const n = document.querySelectorAll(".network-morph-dot").length;
      if (n > window.__r.maksTitik) window.__r.maksTitik = n;
    }, 25);

    const svg = document.querySelector("#statistik svg");
    if (svg) {
      const r = svg.getBoundingClientRect();
      // Selipkan peta ke 10% atas layar, bukan ke tengahnya: di viewport pendek
      // (740x420) memusatkan svg setinggi ~345px mendorong tepi bawahnya keluar
      // layar, sehingga pengukuran "pin terlihat" jadi soal tinggi layar.
      window.scrollTo({
        top: window.scrollY + r.top - window.innerHeight * 0.1,
        behavior: "instant",
      });
    }
  });
  await tunggu(3800);
  return p.evaluate(() => {
    clearInterval(window.__rt);
    const svg = document.querySelector("#statistik svg");
    const pins = Array.from(document.querySelectorAll("#statistik [data-pin]"));
    const sr = svg?.getBoundingClientRect();
    return {
      maksTitik: window.__r.maksTitik,
      sisaTitik: document.querySelectorAll(".network-morph-dot").length,
      jumlahPin: pins.length,
      pinBerukuran: pins.filter((el) => el.getBoundingClientRect().width > 0).length,
      svgDiLayar: sr ? sr.bottom > 0 && sr.top < window.innerHeight : false,
    };
  });
}

/** Halaman baru + pengumpul error sendiri, supaya error di sana ikut terlihat. */
async function halamanBaru(viewport, media, sebelum) {
  const p = await browser.newPage();
  await p.setViewport(viewport);
  if (media) await p.emulateMediaFeatures(media);
  if (sebelum) await p.evaluateOnNewDocument(sebelum);
  p.on("console", (m) => {
    if (m.type() === "error") errors.push("[H] " + m.text().slice(0, 220));
  });
  p.on("pageerror", (e) => errors.push("[H] PAGEERROR " + String(e).slice(0, 160)));
  return p;
}

// H1 — prefers-reduced-motion: peta tetap tampil utuh, tanpa koreografi.
{
  const p = await halamanBaru(
    { width: 1440, height: 900 },
    [{ name: "prefers-reduced-motion", value: "reduce" }]
  );
  await p.goto(BASE, { waitUntil: "networkidle2" });
  await tunggu(4500);
  const r = await ukurPeta(p);
  catat(
    "H1 reduced-motion: peta utuh, tanpa titik",
    `titik=${r.maksTitik}, ${r.pinBerukuran}/${r.jumlahPin} pin berukuran, svg di layar=${r.svgDiLayar}`,
    r.maksTitik === 0 && r.pinBerukuran === PIN_PETA && r.svgDiLayar === true
  );
  await p.close();
}

/*
 * H2 — viewport ponsel. Ini yang menangkap regresi nyata: versi yang memakai
 * pendengar `scroll` mati total di 390px, sementara di desktop lolos.
 */
{
  const p = await halamanBaru({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });
  await p.goto(BASE, { waitUntil: "networkidle2" });
  await tunggu(4500);
  const r = await ukurPeta(p);
  catat(
    "H2 ponsel 390x844: peta utuh, tanpa titik",
    `titik=${r.maksTitik}, ${r.pinBerukuran}/${r.jumlahPin} pin berukuran, svg di layar=${r.svgDiLayar}`,
    r.maksTitik === 0 && r.pinBerukuran === PIN_PETA && r.svgDiLayar === true
  );
  await p.close();
}

/*
 * H3–H6 — kombinasi viewport & jalur render yang belum pernah diuji. H2
 * menemukan bug nyata (pendengar `scroll` mati di 390px) semata karena
 * menguji jalur yang belum pernah dilewati, jadi tiga jalur sisa diuji sama.
 */
const KASUS = [
  {
    nama: "H3 tablet 768x1024: peta utuh, tanpa titik",
    viewport: { width: 768, height: 1024 },
  },
  {
    nama: "H4 viewport pendek 740x420: peta utuh, tanpa titik",
    viewport: { width: 740, height: 420 },
  },
  {
    /*
     * H5 — jalur saveData. Globe alumni sudah dilepas dari beranda, jadi yang
     * dibuktikan di sini adalah aplikasinya tetap boot dan seluruh halaman tetap
     * ter-render saat koneksi melaporkan dirinya hemat data.
     */
    nama: "H5 saveData: aplikasi tetap boot, peta utuh",
    viewport: { width: 1440, height: 900 },
    sebelum: () => {
      /*
       * `navigator.connection` asli adalah EventTarget, dan
       * useHeroMotionPolicy memasang `addEventListener("change", ...)` padanya.
       * Objek literal biasa membuat subscribe() melempar TypeError, dan karena
       * itu terjadi di dalam useSyncExternalStore SELURUH aplikasi gagal
       * render — jadi tiruannya harus EventTarget sungguhan.
       */
      const conn = new EventTarget();
      Object.defineProperties(conn, {
        saveData: { value: true, enumerable: true, configurable: true },
        effectiveType: { value: "2g", enumerable: true, configurable: true },
      });
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        get: () => conn,
      });
    },
  },
  {
    /*
     * H6 — connection yang TIDAK sesuai kontrak. `navigator.connection` asli
     * adalah EventTarget; di sini sengaja dipakai objek literal tanpa
     * addEventListener. Sebelum useHeroMotionPolicy diberi penjaga
     * `typeof connection?.addEventListener === "function"`, kasus ini membuat
     * subscribe() melempar TypeError di dalam useSyncExternalStore sehingga
     * SELURUH halaman gagal render — bukan sekadar efeknya mati. Cek ini
     * mengunci penjaga itu supaya tidak diam-diam hilang lagi.
     */
    nama: "H6 connection non-EventTarget: aplikasi tetap boot",
    viewport: { width: 1440, height: 900 },
    sebelum: () => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        get: () => ({ saveData: true, effectiveType: "2g" }),
      });
    },
  },
];

for (const kasus of KASUS) {
  const p = await halamanBaru(kasus.viewport, null, kasus.sebelum);
  await p.goto(BASE, { waitUntil: "networkidle2" });
  await tunggu(4500);
  const r = await ukurPeta(p);
  catat(
    kasus.nama,
    `titik=${r.maksTitik}, ${r.pinBerukuran}/${r.jumlahPin} pin berukuran, svg di layar=${r.svgDiLayar}`,
    r.maksTitik === 0 && r.pinBerukuran === PIN_PETA && r.svgDiLayar === true
  );
  await p.close();
}

catat(
  "Z console error (termasuk hydration)",
  errors.length ? errors.slice(0, 3).join(" || ") : "tidak ada",
  errors.length === 0
);

await browser.close();

/* ---------- laporan ---------- */
console.log("\n===== VERIFIKASI MOTION IKASADA =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}`);
  console.log(`       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
