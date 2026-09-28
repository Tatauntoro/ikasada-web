#!/usr/bin/env tsx
/**
 * Backfill penanda backend pada URL gambar lama.
 *
 * URL gambar baru membawa penanda `?b=r2|lokal`. Baris lama tidak punya
 * penanda itu, jadi pembaca harus menebak (jalur legacy). Skrip ini menetapkan
 * penanda secara eksplisit dengan memeriksa di mana berkasnya benar-benar ada:
 *   - ada di R2 (`HeadObject`)      -> `?b=r2`
 *   - ada di `storage/uploads-gambar` lokal -> `?b=lokal`
 *   - tidak ada di keduanya         -> dilaporkan (perlu upload ulang)
 *
 * Default **dry-run** (cuma melaporkan). Tambahkan `--apply` untuk menulis.
 *
 * Pakai:
 *   npx tsx scripts/backfill-gambar-backend.mts           # lihat rencana
 *   npx tsx scripts/backfill-gambar-backend.mts --apply   # eksekusi
 */

import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { adaDiR2, isR2Configured } from "@/lib/r2";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const APPLY = process.argv.includes("--apply");
const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads-gambar");
const REGEX_UPLOAD = /^\/api\/uploads\/(kegiatan|alumni|kerjasama|arsip)\/([^?]+)$/;

const prisma = new PrismaClient();

type Baris = { id: string; nilai: string | null };

let diperiksa = 0;
let ditandai = 0;
let hilang = 0;
let dilewati = 0;

async function backendUntuk(
  tipe: string,
  filename: string
): Promise<"r2" | "lokal" | null> {
  if (isR2Configured() && (await adaDiR2(`uploads-gambar/${tipe}/${filename}`))) {
    return "r2";
  }
  try {
    await fs.access(path.join(UPLOAD_DIR, tipe, filename));
    return "lokal";
  } catch {
    return null;
  }
}

async function proses(
  label: string,
  baris: Baris[],
  simpan: (id: string, nilai: string) => Promise<unknown>
): Promise<void> {
  for (const b of baris) {
    const nilai = b.nilai;
    if (!nilai) continue;
    diperiksa += 1;

    const cocok = REGEX_UPLOAD.exec(nilai);
    if (!cocok) {
      // URL eksternal atau bentuk lama (`/uploads/...`) — di luar jangkauan.
      dilewati += 1;
      continue;
    }

    const backend = await backendUntuk(cocok[1], cocok[2]);
    if (!backend) {
      hilang += 1;
      console.log(`  HILANG  ${label} ${b.id} -> ${nilai}`);
      continue;
    }

    const baru = `${nilai}?b=${backend}`;
    ditandai += 1;
    console.log(`  ${APPLY ? "SET" : "RENCANA"}   ${label} ${b.id} -> ${baru}`);
    if (APPLY) {
      await simpan(b.id, baru);
    }
  }
}

async function main(): Promise<void> {
  console.log(
    `Mode: ${APPLY ? "APPLY (menulis)" : "DRY-RUN (tidak menulis)"} | R2: ${
      isR2Configured() ? "terkonfigurasi" : "tidak"
    }\n`
  );

  await proses(
    "kegiatan.gambarThumbnailUrl",
    await prisma.kegiatan.findMany({
      where: { gambarThumbnailUrl: { contains: "/api/uploads/" } },
      select: { id: true, gambarThumbnailUrl: true },
    }).then((r) => r.map((x) => ({ id: x.id, nilai: x.gambarThumbnailUrl }))),
    (id, v) => prisma.kegiatan.update({ where: { id }, data: { gambarThumbnailUrl: v } })
  );

  await proses(
    "alumni.fotoUrl",
    await prisma.alumni.findMany({
      where: { fotoUrl: { contains: "/api/uploads/" } },
      select: { id: true, fotoUrl: true },
    }).then((r) => r.map((x) => ({ id: x.id, nilai: x.fotoUrl }))),
    (id, v) => prisma.alumni.update({ where: { id }, data: { fotoUrl: v } })
  );

  await proses(
    "pengurus.fotoUrl",
    await prisma.pengurus.findMany({
      where: { fotoUrl: { contains: "/api/uploads/" } },
      select: { id: true, fotoUrl: true },
    }).then((r) => r.map((x) => ({ id: x.id, nilai: x.fotoUrl }))),
    (id, v) => prisma.pengurus.update({ where: { id }, data: { fotoUrl: v } })
  );

  await proses(
    "kerjasama.imageUrl",
    await prisma.kerjasama.findMany({
      where: { imageUrl: { contains: "/api/uploads/" } },
      select: { id: true, imageUrl: true },
    }).then((r) => r.map((x) => ({ id: x.id, nilai: x.imageUrl }))),
    (id, v) => prisma.kerjasama.update({ where: { id }, data: { imageUrl: v } })
  );

  await proses(
    "arsip.gambarSampulUrl",
    await prisma.arsip.findMany({
      where: { gambarSampulUrl: { contains: "/api/uploads/" } },
      select: { id: true, gambarSampulUrl: true },
    }).then((r) => r.map((x) => ({ id: x.id, nilai: x.gambarSampulUrl }))),
    (id, v) => prisma.arsip.update({ where: { id }, data: { gambarSampulUrl: v } })
  );

  console.log(
    `\nDiperiksa ${diperiksa} · ${APPLY ? "ditandai" : "akan ditandai"} ${ditandai} · ` +
      `hilang ${hilang} · di luar jangkauan ${dilewati}` +
      (APPLY ? "" : "\nJalankan ulang dengan --apply untuk menulis.")
  );
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
