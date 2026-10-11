#!/usr/bin/env tsx
/**
 * Migrasi berkas penyimpanan lokal (`storage/`) ke Cloudflare R2.
 *
 * Dipakai sekali untuk berkas lama yang tercatat `LOKAL` di database:
 * aplikasi sekarang **hanya** membaca dari R2, jadi berkas yang hanya ada di
 * disk lokal harus diunggah ke R2 dengan key yang sama (path relatifnya).
 *
 * Sifatnya **menambah** objek saja — tidak menghapus apa pun, dan melewati
 * berkas yang sudah ada di R2.
 *
 * Pakai (dari root project):
 *   npx tsx scripts/migrasi-storage-ke-r2.mts
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { adaDiR2, isR2Configured, unggahKeR2 } from "@/lib/r2";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

if (!isR2Configured()) {
  console.error("R2 belum dikonfigurasi (R2_* kosong di .env).");
  process.exit(1);
}

const AKAR = "storage";
if (!existsSync(AKAR)) {
  console.error(`Folder ${AKAR}/ tidak ditemukan. Jalankan dari root project.`);
  process.exit(1);
}

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function* berkasDi(dir: string): Generator<string> {
  for (const entri of readdirSync(dir)) {
    const jalur = join(dir, entri);
    if (statSync(jalur).isDirectory()) yield* berkasDi(jalur);
    else yield jalur;
  }
}

async function main(): Promise<void> {
  let sukses = 0;
  let dilewati = 0;
  let gagal = 0;

  for (const jalur of berkasDi(AKAR)) {
    const key = relative(AKAR, jalur).split(sep).join("/");
    const ext = key.split(".").pop() ?? "";
    const mime = MIME[ext.toLowerCase()] ?? "application/octet-stream";

    try {
      if (await adaDiR2(key)) {
        console.log(`  lewati ${key} (sudah ada di R2)`);
        dilewati += 1;
        continue;
      }
      await unggahKeR2(key, readFileSync(jalur), mime);
      console.log(`  unggah ${key} (${mime})`);
      sukses += 1;
    } catch (e) {
      console.error(`  GAGAL  ${key}: ${(e as Error).message}`);
      gagal += 1;
    }
  }

  console.log(
    `\nSelesai: ${sukses} diunggah, ${dilewati} dilewati, ${gagal} gagal.`
  );
  if (gagal > 0) process.exit(1);
}

void main();
