#!/usr/bin/env tsx
/**
 * Verifikasi penyimpanan gambar: penanda backend di URL + jalur baca legacy.
 *
 * Yang diuji lewat HTTP sungguhan (butuh `npm run dev` jalan):
 *  - `POST /api/admin/upload` mengembalikan URL dengan penanda `?b=r2|lokal`
 *    yang cocok dengan backend aktif server;
 *  - URL ber-penanda bisa dibaca (200, `content-type: image/*`);
 *  - URL **tanpa** penanda (data lama) tetap terbaca lewat jalur legacy;
 *  - permintaan `?b=r2` saat kredensial R2 kosong ditolak 404 (bukan 500).
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run storage:verify
 */

import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { backendAktif, type TipeUploadGambar } from "@/lib/upload-gambar";
import { hapusDariR2, isR2Configured } from "@/lib/r2";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD tidak ditemukan. Jalankan dari root project (ada .env)."
  );
  process.exit(1);
}

// PNG 1x1 transparan — cukup untuk menguji jalur upload/baca.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads-gambar");

let lulus = 0;
let gagal = 0;
let dibersihkan = false;
let tipeTerpakai: TipeUploadGambar = "kegiatan";
let namaBerkas = "";

function cek(nama: string, kondisi: boolean, detail = ""): void {
  if (kondisi) {
    lulus += 1;
    console.log(`  OK   ${nama}`);
  } else {
    gagal += 1;
    console.log(`  GAGAL ${nama}${detail ? ` — ${detail}` : ""}`);
  }
}

async function loginAdmin(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login admin gagal (HTTP ${res.status}).`);
  }
  const cookies = res.headers.getSetCookie();
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

async function bersihkan(backend: "r2" | "lokal", nama: string): Promise<void> {
  if (dibersihkan) return;
  dibersihkan = true;
  if (!nama) return;
  if (backend === "r2" && isR2Configured()) {
    await hapusDariR2(`uploads-gambar/${tipeTerpakai}/${nama}`);
    return;
  }
  await fs.rm(path.join(UPLOAD_DIR, tipeTerpakai, nama), { force: true });
}

async function main(): Promise<void> {
  const backend = backendAktif();
  console.log(`Backend aktif server: ${backend}`);

  const cookie = await loginAdmin();

  const form = new FormData();
  form.append("tipe", "kegiatan");
  form.append("file", new Blob([PNG_1X1], { type: "image/png" }), "tes-storage.png");

  const upload = await fetch(`${BASE_URL}/api/admin/upload`, {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  const uploadBody = (await upload.json()) as {
    success?: boolean;
    data?: { url?: string };
    error?: { message?: string };
  };

  cek("upload gambar sukses (200)", upload.status === 200, `HTTP ${upload.status}`);
  const url = uploadBody.data?.url ?? "";
  cek("URL mengembalikan data.url", Boolean(url), JSON.stringify(uploadBody.error));

  cek(
    `URL membawa penanda backend (?b=${backend})`,
    url.includes(`?b=${backend}`),
    url
  );

  const cocok = /\/api\/uploads\/kegiatan\/([^?]+)\?b=(r2|lokal)/.exec(url);
  if (cocok) {
    tipeTerpakai = "kegiatan";
    namaBerkas = cocok[1];
  }

  if (url) {
    const berPenanda = await fetch(`${BASE_URL}${url}`);
    cek(
      "URL ber-penanda terbaca (200)",
      berPenanda.status === 200,
      `HTTP ${berPenanda.status}`
    );
    cek(
      "content-type gambar benar",
      (berPenanda.headers.get("content-type") ?? "").startsWith("image/")
    );

    const legacy = await fetch(`${BASE_URL}${url.split("?")[0]}`);
    cek(
      "URL tanpa penanda tetap terbaca (jalur legacy)",
      legacy.status === 200,
      `HTTP ${legacy.status}`
    );
  }

  // `?b=r2` tanpa kredensial harus 404 (bukan 500) dan tercatat di log.
  // Dipakai nama acak supaya fallback ke backend lokal tidak menemukan apa pun
  // — kalau nama yang sudah ada, fallback lokal akan melayaninya (200), dan itu
  // memang perilaku yang diinginkan.
  if (!isR2Configured()) {
    const namaAcak = `${randomUUID()}.png`;
    const paksaR2 = await fetch(`${BASE_URL}/api/uploads/kegiatan/${namaAcak}?b=r2`);
    cek(
      "?b=r2 tanpa kredensial -> 404 (bukan 500)",
      paksaR2.status === 404,
      `HTTP ${paksaR2.status}`
    );
  } else {
    console.log("  --   (uji '?b=r2 tanpa kredensial' dilewati: R2 terkonfigurasi)");
  }
}

main()
  .catch((e) => {
    gagal += 1;
    console.error("Error:", e instanceof Error ? e.message : e);
  })
  .finally(async () => {
    await bersihkan(backendAktif(), namaBerkas);
    console.log(`\n${gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`} (${lulus} lulus)`);
    process.exit(gagal === 0 ? 0 : 1);
  });
