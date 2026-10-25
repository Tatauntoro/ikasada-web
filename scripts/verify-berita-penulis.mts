#!/usr/bin/env tsx
/** Uji HTTP + DB penulis berita. Hanya fixture sendiri yang ditulis/dibersihkan. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/generated/prisma/client";
import { beritaCreateSchema } from "@/lib/validations/berita";
import { normalizeBeritaInput } from "@/lib/normalize-input";
import { bikinSnapshot, fieldBerubah } from "@/lib/verifikasi-diff";
import { kontenBerubah, gateSimpan } from "@/lib/verifikasi-konten";
import type { AdminSesi } from "@/lib/sesi-admin";
import { SESSION_COOKIE_NAME, signToken } from "@/lib/auth";

if (existsSync(".env")) process.loadEnvFile(".env");
const db = new PrismaClient();
const base = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Jalankan fixture hanya pada server lokal");
const judul = `Verifikasi penulis ${randomUUID()}`;
let fixtureId: string | undefined;
let cookie = "";
let lulus = 0;
function cek(nama: string, kondisi: unknown) {
  assert.ok(kondisi, nama);
  lulus++;
  console.log(`OK ${nama}`);
}
async function api(path: string, method = "GET", body?: object, auth = true) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(auth ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  return { status: res.status, json };
}
try {
  const jumlahAwal = await db.berita.count();
  const jenis = await db.jenisBerita.findFirstOrThrow({ where: { deletedAt: null } });
  const input = { judul, jenisBeritaId: jenis.id, tanggal: new Date().toISOString(),
    deskripsiSingkat: "Fixture pengujian penulis berita.", status: "DRAFT" };
  for (const penulis of ["", "   ", "A", "x".repeat(121), null, 42]) {
    cek(`validasi menolak penulis ${JSON.stringify(penulis).slice(0, 24)}`,
      !beritaCreateSchema.safeParse({ ...input, penulis }).success);
  }
  const bersih = normalizeBeritaInput(beritaCreateSchema.parse({ ...input, penulis: "  Tim Uji  " }));
  cek("nama dinormalisasi", bersih.penulis === "Tim Uji");
  const lama = { ...input, penulis: "Redaksi IKASADA" };
  const snapshot = bikinSnapshot("berita", lama);
  const snapshotLama = { ...snapshot };
  delete snapshotLama.penulis;
  cek("snapshot lama tidak dianggap berubah", fieldBerubah(snapshotLama, "berita", lama).length === 0);
  cek("perubahan penulis terlihat saat tinjau", fieldBerubah(snapshot, "berita", { ...lama, penulis: "Tim Uji" }).includes("penulis"));
  const berubah = kontenBerubah(lama, { penulis: "Tim Uji" });
  const staf: AdminSesi = { sub: "uji", nama: "Uji", email: "uji@example.invalid", role: "ADMIN",
    permissions: {}, divisi: { id: "uji", nama: "Uji", lintasDivisi: false } };
  cek("ubah penulis membutuhkan verifikasi ulang", berubah &&
    !gateSimpan(staf, { statusBaru: "PUBLISHED", verifikasiLama: "DISETUJUI", kontenBerubah: berubah }).ok);
  const draftGate = gateSimpan(staf, { statusBaru: "DRAFT", verifikasiLama: "DISETUJUI", kontenBerubah: berubah });
  cek("draft perubahan penulis mereset verifikasi", draftGate.ok && draftGate.reset);
  // Sesi uji lewat signer aplikasi; tidak bergantung pada password seed kosong.
  // requireAdminAktif tetap membaca role/izin dari akun aktual di setiap request.
  const admin = await db.adminUser.findFirstOrThrow({ where: { isAktif: true, role: "SUPERADMIN" },
    select: { id: true, nama: true, email: true } });
  cookie = `${SESSION_COOKIE_NAME}=${await signToken({ sub: admin.id, nama: admin.nama, email: admin.email })}`;
  cek("API menolak penyimpanan tanpa login", (await api("/api/admin/berita", "POST", input, false)).status === 401);
  const dibuat = await api("/api/admin/berita", "POST", input);
  fixtureId = dibuat.json.data?.id;
  cek("create lama tanpa penulis mendapat default", dibuat.status === 201 && fixtureId && dibuat.json.data.penulis === "Redaksi IKASADA");
  const custom = await api("/api/admin/berita", "POST", { ...input, penulis: "  Penulis Baru  " });
  cek("create menyimpan nama khusus", custom.status === 201 && custom.json.data.penulis === "Penulis Baru");
  await db.$transaction([
    db.auditLog.deleteMany({ where: { entitas: "Berita", entitasId: custom.json.data.id } }),
    db.berita.delete({ where: { id: custom.json.data.id } }),
  ]);
  const path = `/api/admin/berita/${fixtureId}`;
  for (const penulis of ["", " ", "x".repeat(121), null, 42]) {
    const invalid = await api(path, "PUT", { ...input, penulis });
    cek("HTTP menolak nama tidak valid", invalid.status === 400 && invalid.json.error?.fields?.penulis);
  }
  const simpan = await api(path, "PUT", { ...input, penulis: "  Tim Pengujian IKASADA  " });
  cek("update menyimpan nama yang sudah di-trim", simpan.status === 200 && simpan.json.data.penulis === "Tim Pengujian IKASADA");
  const ulang = await api(path);
  cek("GET admin memuat nama tersimpan", ulang.json.data.penulis === "Tim Pengujian IKASADA");
  const kompatibel = await api(path, "PUT", input);
  cek("update klien lama tidak menghapus penulis", kompatibel.json.data.penulis === "Tim Pengujian IKASADA");
  const row = await db.berita.findUniqueOrThrow({ where: { id: fixtureId } });
  cek("DB menyimpan penulis", row.penulis === "Tim Pengujian IKASADA");
  const audit = await db.auditLog.findFirst({ where: { entitasId: fixtureId, aksi: "UPDATE" }, orderBy: { createdAt: "asc" } });
  const perubahan = audit?.detailPerubahan as { penulis?: { dari: string; ke: string } } | null;
  cek("audit mencatat perubahan nama penulis", perubahan?.penulis?.ke === "Tim Pengujian IKASADA");
  cek("draft tidak bocor ke publik", (await api(`/api/public/berita/${row.slug}`)).status === 404);
  const terbit = await api(path, "PUT", { ...input, penulis: row.penulis, status: "PUBLISHED" });
  cek("publikasi lewat API tetap berfungsi", terbit.status === 200);
  const publik = await api(`/api/public/berita/${row.slug}`);
  cek("API publik membaca nama dari DB", publik.status === 200 && publik.json.data.penulis === row.penulis);
  cek("API publik tidak memuat akun internal", !("createdById" in publik.json.data) && !("createdBy" in publik.json.data));
  const daftar = await api("/api/public/berita?limit=100");
  cek("daftar publik menyertakan penulis", daftar.json.data.some((b: { id: string; penulis: string }) => b.id === fixtureId && b.penulis === row.penulis));
  const html = await (await fetch(`${base}/berita/${row.slug}`)).text();
  cek("halaman publik menampilkan penulis dinamis", html.includes(row.penulis));
  await db.$transaction([
    db.auditLog.deleteMany({ where: { entitas: "Berita", entitasId: fixtureId } }),
    db.berita.delete({ where: { id: fixtureId } }),
  ]);
  fixtureId = undefined;
  cek("fixture dibersihkan, jumlah berita tetap", await db.berita.count() === jumlahAwal);
  console.log(`${lulus} pemeriksaan lulus.`);
} finally {
  // Cari juga lewat judul unik bila request create terputus setelah commit.
  const rows = await db.berita.findMany({ where: { judul }, select: { id: true } });
  for (const row of rows) {
    await db.$transaction([
      db.auditLog.deleteMany({ where: { entitas: "Berita", entitasId: row.id } }),
      db.berita.delete({ where: { id: row.id } }),
    ]);
  }
  await db.$disconnect();
}
