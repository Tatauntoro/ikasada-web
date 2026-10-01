#!/usr/bin/env tsx
/**
 * Verifikasi penyimpanan gambar: semua upload ke R2 dan terbaca dari R2.
 *
 * Yang diuji lewat HTTP sungguhan (butuh `npm run dev` jalan + R2_* di .env):
 *  - `POST /api/admin/upload` sukses dan URL-nya terbaca (200, `image/*`);
 *  - URL lama ber-`?b=r2` tetap terbaca, termasuk lewat `/_next/image`;
 *  - berkas yang tidak ada -> 404.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run storage:verify
 */

import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { type TipeUploadGambar } from "@/lib/upload-gambar";
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

let lulus = 0;
let gagal = 0;
let dibersihkan = false;
const tipeTerpakai: TipeUploadGambar = "kegiatan";
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

async function bersihkan(nama: string): Promise<void> {
  if (dibersihkan || !nama) return;
  dibersihkan = true;
  await hapusDariR2(`uploads-gambar/${tipeTerpakai}/${nama}`);
}

async function main(): Promise<void> {
  if (!isR2Configured()) {
    throw new Error("R2_* belum terisi di .env; semua upload wajib ke R2.");
  }

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
    data?: { url?: string };
    error?: { message?: string };
  };

  cek("upload gambar sukses (200)", upload.status === 200, `HTTP ${upload.status}`);
  const url = uploadBody.data?.url ?? "";
  cek("URL mengembalikan data.url", Boolean(url), JSON.stringify(uploadBody.error));

  const cocok = /\/api\/uploads\/kegiatan\/([^?]+)/.exec(url);
  if (cocok) namaBerkas = cocok[1];

  if (url) {
    const res = await fetch(`${BASE_URL}${url}`);
    cek("gambar terbaca dari R2 (200)", res.status === 200, `HTTP ${res.status}`);
    cek(
      "content-type gambar benar",
      (res.headers.get("content-type") ?? "").startsWith("image/")
    );

    const lama = await fetch(`${BASE_URL}${url}?b=r2`);
    cek("URL lama ber-?b=r2 tetap terbaca", lama.status === 200, `HTTP ${lama.status}`);

    const optimasi = await fetch(
      `${BASE_URL}/_next/image?url=${encodeURIComponent(`${url}?b=r2`)}&w=1080&q=75`
    );
    cek("/_next/image untuk URL ber-query (200)", optimasi.status === 200, `HTTP ${optimasi.status}`);
  }

  const tidakAda = await fetch(`${BASE_URL}/api/uploads/kegiatan/${randomUUID()}.png`);
  cek("berkas tak ada -> 404", tidakAda.status === 404, `HTTP ${tidakAda.status}`);
}

main()
  .catch((e) => {
    gagal += 1;
    console.error("Error:", e instanceof Error ? e.message : e);
  })
  .finally(async () => {
    await bersihkan(namaBerkas);
    console.log(`\n${gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`} (${lulus} lulus)`);
    process.exit(gagal === 0 ? 0 : 1);
  });
