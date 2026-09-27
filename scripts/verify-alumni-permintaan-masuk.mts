#!/usr/bin/env tsx
/**
 * Verifikasi badge realtime "permintaan koneksi masuk" untuk alumni.
 *
 * Yang diuji lewat HTTP sungguhan:
 *  - `GET /api/alumni/connections/stream` menolak tanpa session (401);
 *  - stream mengirim `text/event-stream` dengan frame `snapshot { unread }`;
 *  - permintaan koneksi baru **mendorong** frame `notifikasi` ke stream
 *    penerima tanpa polling klien (dalam jendela < interval re-cek 20 dtk);
 *  - stream milik pengirim sendiri tidak ikut naik (ia bukan penerima);
 *  - `meta.unread` sejalan dengan stream, dan `POST /read` mengosongkannya
 *    tanpa menghilangkan antrean (`meta.total`);
 *  - akun non-ACTIVE ditolak (401).
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run permintaan:verify
 */

import { existsSync } from "node:fs";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;

if (!ADMIN_EMAIL) {
  console.error("SEED_ADMIN_EMAIL tidak ditemukan. Jalankan dari root project (ada .env).");
  process.exit(1);
}

const prisma = new PrismaClient();
const PASSWORD = "KataSandiUji123!";

type BodyJson = {
  success?: boolean;
  data?: unknown;
  meta?: { total?: number; unread?: number };
  error?: { code?: string; message?: string; fields?: Record<string, string> };
};

type Hasil = { status: number; body: BodyJson; setCookie: string[] };

const hasil: { nama: string; lulus: boolean; detail: string }[] = [];
const cek = (nama: string, lulus: boolean, detail: string) =>
  hasil.push({ nama, lulus, detail });

async function panggil(
  method: string,
  path: string,
  opsi: { body?: unknown; cookie?: string } = {}
): Promise<Hasil> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(opsi.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(opsi.cookie ? { Cookie: opsi.cookie } : {}),
    },
    body: opsi.body === undefined ? undefined : JSON.stringify(opsi.body),
    redirect: "manual",
  });

  let parsed: BodyJson = {};
  try {
    parsed = (await res.json()) as BodyJson;
  } catch {
    parsed = {};
  }

  return { status: res.status, body: parsed, setCookie: res.headers.getSetCookie() };
}

function cookieDari(setCookie: string[], nama: string): string | null {
  const mentah = setCookie.find((c) => c.startsWith(`${nama}=`));
  if (!mentah) return null;
  const nilai = mentah.slice(nama.length + 1).split(";")[0];
  return nilai ? `${nama}=${decodeURIComponent(nilai)}` : null;
}

const metaDari = (body: BodyJson) => body.meta ?? {};

/** Ambil status HTTP sebuah halaman (body dibuang). */
async function statusHalaman(path: string, cookie?: string): Promise<number> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  await res.text();
  return res.status;
}

/** Baca stream sampai `pola` muncul atau batas waktu habis. */
async function tungguFrame(
  pembaca: ReadableStreamDefaultReader<Uint8Array>,
  pola: string,
  timeoutMs: number
): Promise<string> {
  const dekoder = new TextDecoder();
  let buf = "";
  const batas = Date.now() + timeoutMs;

  while (Date.now() < batas) {
    const sisa = batas - Date.now();
    const potongan = await Promise.race([
      pembaca.read(),
      new Promise<null>((r) => setTimeout(() => r(null), sisa)),
    ]);

    if (potongan === null || potongan.done) break;

    buf += dekoder.decode(potongan.value, { stream: true });
    if (buf.includes(pola)) return buf;
  }

  return buf;
}

/** Kumpulkan apa pun yang datang dalam jendela waktu (untuk membuktikan "tidak ada"). */
async function kumpulkan(
  pembaca: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number
): Promise<string> {
  return tungguFrame(pembaca, "\u0000tidak-mungkin-ada", timeoutMs);
}

const stamp = Date.now();
const idAkun: string[] = [];
const idAlumni: string[] = [];
const mulai = new Date();

type AkunUji = { akunId: string; alumniId: string; email: string };

async function bersihkan() {
  if (idAkun.length > 0) {
    await prisma.connection.deleteMany({
      where: {
        OR: [
          { requesterAccountId: { in: idAkun } },
          { recipientAccountId: { in: idAkun } },
        ],
      },
    });
    await prisma.auditLog.deleteMany({ where: { alumniAccountId: { in: idAkun } } });
    await prisma.alumniAccount.deleteMany({ where: { id: { in: idAkun } } });
  }
  if (idAlumni.length > 0) {
    await prisma.alumni.deleteMany({ where: { id: { in: idAlumni } } });
  }
  await prisma.authRateLimit.deleteMany({ where: { updatedAt: { gte: mulai } } });
}

try {
  /* ---------- 0. Otorisasi ---------- */
  cek(
    "stream tanpa session -> 401",
    (await panggil("GET", "/api/alumni/connections/stream")).status === 401,
    "status=401"
  );

  /* ---------- 1. Data uji ---------- */
  const admin = await prisma.adminUser.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  const sektor = await prisma.sektorIndustri.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });
  if (!admin || !sektor) throw new Error("Butuh admin dan sektor industri di database");

  const passwordHash = await hash(PASSWORD, 10);

  const buatAkunAktif = async (label: string): Promise<AkunUji> => {
    const email = `minta-${label}-${stamp}@contoh.invalid`;
    const alumni = await prisma.alumni.create({
      data: {
        namaLengkap: `Uji Minta ${label} ${stamp}`,
        angkatan: 2014,
        programStudi: "SUNDA",
        profesi: "Uji",
        sektorIndustriId: sektor.id,
        createdById: admin.id,
      },
      select: { id: true },
    });
    idAlumni.push(alumni.id);

    const akun = await prisma.alumniAccount.create({
      data: {
        email,
        passwordHash,
        status: "ACTIVE",
        alumniId: alumni.id,
        namaLengkapSaatDaftar: `Uji Minta ${label}`,
        angkatanSaatDaftar: 2014,
        programStudiSaatDaftar: "SUNDA",
        consentDataAt: new Date(),
        approvedAt: new Date(),
      },
      select: { id: true },
    });
    idAkun.push(akun.id);
    return { akunId: akun.id, alumniId: alumni.id, email };
  };

  const a = await buatAkunAktif("a");
  const b = await buatAkunAktif("b");

  const login = async (email: string, next?: string) => {
    const res = await panggil("POST", "/api/auth/alumni/login", {
      body: { email, password: PASSWORD, ...(next ? { next } : {}) },
    });
    return {
      status: res.status,
      cookie: cookieDari(res.setCookie, "ikasada_alumni_session"),
      redirectTo: (res.body as { data?: { redirectTo?: string } }).data
        ?.redirectTo,
    };
  };

  const sesiA = await login(a.email);
  const sesiB = await login(b.email);
  cek(
    "dua alumni uji bisa login",
    sesiA.status === 200 && sesiB.status === 200 && Boolean(sesiA.cookie && sesiB.cookie),
    `a=${sesiA.status} b=${sesiB.status}`
  );
  if (!sesiA.cookie || !sesiB.cookie) {
    throw new Error("Tanpa cookie alumni, sisa pengujian tidak bisa dijalankan.");
  }

  // HIGH 2 — tanpa `?next=`, login ACTIVE mendarat di profil.
  cek(
    "login ACTIVE tanpa next diarahkan ke /alumni/profil",
    sesiA.redirectTo === "/alumni/profil",
    `redirectTo=${sesiA.redirectTo}`
  );
  const sesiNext = await login(a.email, "/alumni/jejaring");
  cek(
    "login dengan ?next= tetap menghormati tujuan eksplisit",
    sesiNext.redirectTo === "/alumni/jejaring",
    `redirectTo=${sesiNext.redirectTo}`
  );

  // Mulai dari nol supaya transisi 0 -> 1 terukur.
  await panggil("POST", "/api/alumni/connections/read", { cookie: sesiB.cookie });

  /* ---------- 1b. Halaman yang memasang badge tetap merender ---------- */
  const [statusProfil, statusJejaring, statusBeranda] = await Promise.all([
    statusHalaman("/alumni/profil", sesiB.cookie),
    statusHalaman("/alumni/jejaring", sesiB.cookie),
    statusHalaman("/", sesiB.cookie),
  ]);
  cek(
    "beranda + profil + jejaring merender 200 untuk alumni aktif",
    statusProfil === 200 && statusJejaring === 200 && statusBeranda === 200,
    `profil=${statusProfil} jejaring=${statusJejaring} beranda=${statusBeranda}`
  );

  /* ---------- 2. Snapshot SSE ---------- */
  const kontrol = new AbortController();
  const jeda = setTimeout(() => kontrol.abort(), 20_000);
  try {
    // Stream B (penerima) dan stream A (pengirim) dibuka bersamaan.
    const resB = await fetch(`${BASE_URL}/api/alumni/connections/stream`, {
      headers: { Cookie: sesiB.cookie },
      signal: kontrol.signal,
    });
    const resA = await fetch(`${BASE_URL}/api/alumni/connections/stream`, {
      headers: { Cookie: sesiA.cookie },
      signal: kontrol.signal,
    });

    const tipe = resB.headers.get("content-type") ?? "";
    cek(
      "stream alumni mengirim text/event-stream",
      resB.status === 200 && tipe.includes("text/event-stream"),
      `status=${resB.status} content-type="${tipe}"`
    );

    const bacaB = resB.body!.getReader();
    const bacaA = resA.body!.getReader();

    const snapshotB = await tungguFrame(bacaB, "event: snapshot", 4000);
    const snapshotA = await tungguFrame(bacaA, "event: snapshot", 4000);
    cek(
      "snapshot awal memuat unread 0 untuk kedua alumni",
      snapshotB.includes("event: snapshot") &&
        snapshotB.includes('"unread":0') &&
        snapshotA.includes("event: snapshot"),
      `b="${snapshotB.slice(0, 60).replace(/\n/g, "\\n")}" a="${snapshotA.slice(0, 60).replace(/\n/g, "\\n")}"`
    );

    /* ---------- 3. Push realtime ke penerima ---------- */
    const kirim = await panggil("POST", "/api/alumni/connections", {
      cookie: sesiA.cookie,
      body: { recipientAlumniId: b.alumniId, message: "Uji permintaan masuk" },
    });

    // Jendela 6 dtk < interval re-cek 20 dtk => frame ini pasti dari bus.
    const dorongKeB = await tungguFrame(bacaB, "event: notifikasi", 6000);
    cek(
      "penerima menerima push realtime unread 0 -> 1",
      kirim.status === 201 &&
        dorongKeB.includes("event: notifikasi") &&
        dorongKeB.includes('"unread":1'),
      `create=${kirim.status} frame="${dorongKeB.slice(-80).replace(/\n/g, "\\n")}"`
    );

    /* ---------- 4. Pengirim tidak ikut naik ---------- */
    const dorongKeA = await kumpulkan(bacaA, 3000);
    cek(
      "stream pengirim tidak menerima kenaikan (ia bukan penerima)",
      !dorongKeA.includes("event: notifikasi"),
      `frame="${dorongKeA.replace(/\n/g, "\\n").slice(-80)}"`
    );

    await bacaB.cancel();
    await bacaA.cancel();
  } finally {
    clearTimeout(jeda);
  }

  /* ---------- 5. Angka sejalan dengan meta.unread ---------- */
  const masukB = await panggil(
    "GET",
    "/api/alumni/connections?tab=incoming&limit=1",
    { cookie: sesiB.cookie }
  );
  const metaMasuk = metaDari(masukB.body);
  cek(
    "daftar permintaan masuk menghitung 1 belum dibaca dari 1 antrean",
    metaMasuk.unread === 1 && metaMasuk.total === 1,
    `unread=${metaMasuk.unread} total=${metaMasuk.total}`
  );

  const dibaca = await panggil("POST", "/api/alumni/connections/read", {
    cookie: sesiB.cookie,
  });
  const masukB2 = await panggil(
    "GET",
    "/api/alumni/connections?tab=incoming&limit=1",
    { cookie: sesiB.cookie }
  );
  const metaMasuk2 = metaDari(masukB2.body);
  cek(
    "tandai dibaca mengosongkan unread tanpa menghilangkan antrean",
    (dibaca.body as { data?: { read?: number } }).data?.read === 1 &&
      metaMasuk2.unread === 0 &&
      metaMasuk2.total === 1,
    `read=${(dibaca.body as { data?: { read?: number } }).data?.read} unread=${metaMasuk2.unread} total=${metaMasuk2.total}`
  );

  /* ---------- 6. Akun non-ACTIVE ditolak ---------- */
  await prisma.alumniAccount.update({
    where: { id: b.akunId },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });
  const streamSuspend = await panggil("GET", "/api/alumni/connections/stream", {
    cookie: sesiB.cookie,
  });
  cek(
    "akun SUSPENDED tidak boleh membuka stream (401)",
    streamSuspend.status === 401,
    `status=${streamSuspend.status} message="${streamSuspend.body.error?.message}"`
  );
  await prisma.alumniAccount.update({
    where: { id: b.akunId },
    data: { status: "ACTIVE", suspendedAt: null },
  });
} catch (error) {
  cek("uji berjalan tanpa error tak terduga", false, String(error));
} finally {
  await bersihkan();
  await prisma.$disconnect();
}

console.log("\n===== VERIFIKASI PERMINTAAN MASUK ALUMNI =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
