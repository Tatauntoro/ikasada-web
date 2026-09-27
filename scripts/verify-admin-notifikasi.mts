#!/usr/bin/env tsx
/**
 * Verifikasi inbox notifikasi admin (realtime SSE + daftar + tandai dibaca).
 *
 * Yang diuji lewat HTTP sungguhan:
 *  - proteksi endpoint (tanpa session -> 401);
 *  - `GET /api/admin/notifikasi` memuat item dari `AuditLog` dan `meta.belumDibaca`;
 *  - `GET /api/admin/notifikasi/stream` benar-benar mengirim `text/event-stream`
 *    dengan frame `snapshot`;
 *  - pendaftaran akun (`ALUMNI_REGISTER`) dan permintaan koneksi
 *    (`CONNECTION_CREATE`) menambah `belumDibaca`;
 *  - aksi admin sendiri (`ALUMNI_APPROVE`) tidak dihitung;
 *  - `POST /api/admin/notifikasi/read` mereset `belumDibaca` tanpa menghapus item;
 *  - filter `?tipe=` memisahkan pendaftaran dan koneksi.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run notifikasi:verify
 */

import { existsSync } from "node:fs";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

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

const prisma = new PrismaClient();

type ItemNotifikasi = {
  id?: string;
  tipe?: string;
  aksi?: string;
  judul?: string;
  pesan?: string;
  href?: string | null;
  baru?: boolean;
};

type BodyJson = {
  success?: boolean;
  data?: unknown;
  meta?: { total?: number; totalPages?: number; belumDibaca?: number };
  error?: { code?: string; message?: string };
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

const daftarDari = (body: BodyJson): ItemNotifikasi[] =>
  Array.isArray(body.data) ? (body.data as ItemNotifikasi[]) : [];

const belumDibacaDari = (body: BodyJson): number | undefined =>
  body.meta?.belumDibaca;

/**
 * Baca dari stream SSE sampai `pola` muncul atau batas waktu habis.
 * Mengembalikan seluruh teks yang sudah diterima (untuk pesan kegagalan).
 */
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
    const hasil = await Promise.race([
      pembaca.read(),
      new Promise<null>((r) => setTimeout(() => r(null), sisa)),
    ]);

    if (hasil === null || hasil.done) break;

    buf += dekoder.decode(hasil.value, { stream: true });
    if (buf.includes(pola)) return buf;
  }

  return buf;
}

const stamp = Date.now();
const idAkun: string[] = [];
const idAlumni: string[] = [];

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
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { alumniAccountId: { in: idAkun } },
          { entitasId: { in: idAkun } },
        ],
      },
    });
    await prisma.alumniAccount.deleteMany({ where: { id: { in: idAkun } } });
  }
  if (idAlumni.length > 0) {
    await prisma.alumni.deleteMany({ where: { id: { in: idAlumni } } });
  }
}

try {
  /* ---------- 0. Otorisasi ---------- */
  cek(
    "GET daftar notifikasi tanpa session -> 401",
    (await panggil("GET", "/api/admin/notifikasi")).status === 401,
    "status=401"
  );
  cek(
    "POST tandai dibaca tanpa session -> 401",
    (await panggil("POST", "/api/admin/notifikasi/read")).status === 401,
    "status=401"
  );

  const login = await panggil("POST", "/api/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const cookie = cookieDari(login.setCookie, "ikasada_session") ?? "";
  cek("admin bisa login", login.status === 200 && Boolean(cookie), `status=${login.status}`);

  if (!cookie) {
    throw new Error("Tanpa cookie admin, sisa pengujian tidak bisa dijalankan.");
  }

  /* ---------- 1. Titik awal: tandai semua sudah dibaca ---------- */
  await panggil("POST", "/api/admin/notifikasi/read", { cookie });
  const awal = await panggil("GET", "/api/admin/notifikasi", { cookie });
  const belumDibacaAwal = belumDibacaDari(awal.body) ?? -1;
  cek(
    "setelah tandai dibaca, meta.belumDibaca = 0",
    awal.status === 200 && belumDibacaAwal === 0,
    `status=${awal.status} belumDibaca=${belumDibacaAwal}`
  );

  /* ---------- 2. SSE: content-type + frame snapshot ---------- */
  const kontrol = new AbortController();
  const jeda = setTimeout(() => kontrol.abort(), 5000);
  try {
    const stream = await fetch(`${BASE_URL}/api/admin/notifikasi/stream`, {
      headers: { Cookie: cookie },
      signal: kontrol.signal,
    });
    const tipe = stream.headers.get("content-type") ?? "";
    const pembaca = stream.body?.getReader();
    const potongan = pembaca ? await pembaca.read() : null;
    const teksAwal = potongan ? new TextDecoder().decode(potongan.value) : "";
    await pembaca?.cancel();

    cek(
      "stream mengirim text/event-stream",
      stream.status === 200 && tipe.includes("text/event-stream"),
      `status=${stream.status} content-type="${tipe}"`
    );
    cek(
      "frame snapshot pertama memuat belumDibaca",
      teksAwal.includes("event: snapshot") && teksAwal.includes("belumDibaca"),
      `awal="${teksAwal.slice(0, 80).replace(/\n/g, "\\n")}"`
    );
  } catch (error) {
    cek("stream SSE dapat dibuka", false, String(error));
  } finally {
    clearTimeout(jeda);
  }

  /* ---------- 3. Pendaftaran akun -> notifikasi PENDAFTARAN ---------- */
  const akunBaru = await prisma.alumniAccount.create({
    data: {
      email: `notif-pending-${stamp}@contoh.invalid`,
      passwordHash: await hash("KataSandiUji123!", 10),
      status: "PENDING",
      namaLengkapSaatDaftar: `Uji Notif ${stamp}`,
      angkatanSaatDaftar: 2015,
      programStudiSaatDaftar: "SUNDA",
      consentDataAt: new Date(),
    },
    select: { id: true },
  });
  idAkun.push(akunBaru.id);

  await prisma.auditLog.create({
    data: {
      alumniAccountId: akunBaru.id,
      aksi: "ALUMNI_REGISTER",
      entitas: "AlumniAccount",
      entitasId: akunBaru.id,
    },
  });

  const setelahDaftar = await panggil("GET", "/api/admin/notifikasi", { cookie });
  const itemDaftar = daftarDari(setelahDaftar.body).find(
    (item) => item.aksi === "ALUMNI_REGISTER"
  );
  cek(
    "pendaftaran baru menambah meta.belumDibaca",
    belumDibacaDari(setelahDaftar.body) === 1,
    `belumDibaca=${belumDibacaDari(setelahDaftar.body)}`
  );
  cek(
    "item pendaftaran punya tipe, nama, dan tautan tindak lanjut",
    itemDaftar?.tipe === "PENDAFTARAN" &&
      Boolean(itemDaftar?.pesan?.includes(`Uji Notif ${stamp}`)) &&
      itemDaftar?.href === "/admin/alumni-accounts" &&
      itemDaftar?.baru === true,
    `tipe=${itemDaftar?.tipe} pesan="${itemDaftar?.pesan}" href=${itemDaftar?.href} baru=${itemDaftar?.baru}`
  );

  /* ---------- 4. Aksi admin sendiri tidak dihitung ---------- */
  await prisma.auditLog.create({
    data: {
      adminId: (await prisma.adminUser.findUnique({
        where: { email: ADMIN_EMAIL },
        select: { id: true },
      }))!.id,
      aksi: "ALUMNI_APPROVE",
      entitas: "AlumniAccount",
      entitasId: akunBaru.id,
    },
  });
  const setelahApprove = await panggil("GET", "/api/admin/notifikasi", { cookie });
  cek(
    "aksi admin (ALUMNI_APPROVE) tidak menambah belumDibaca",
    belumDibacaDari(setelahApprove.body) === 1,
    `belumDibaca=${belumDibacaDari(setelahApprove.body)}`
  );

  /* ---------- 5. Permintaan koneksi -> notifikasi KONEKSI ---------- */
  const sektor = await prisma.sektorIndustri.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });
  const admin = await prisma.adminUser.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  if (!sektor || !admin) throw new Error("Butuh sektor industri dan admin di database");

  const passwordHash = await hash("KataSandiUji123!", 10);
  const buatAkunAktif = async (label: string) => {
    // Email disimpan huruf kecil: schema login/registrasi men-`toLowerCase()`.
    const email = `notif-${label.toLowerCase()}-${stamp}@contoh.invalid`;
    const alumni = await prisma.alumni.create({
      data: {
        namaLengkap: `Uji Notif ${label} ${stamp}`,
        angkatan: 2016,
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
        namaLengkapSaatDaftar: `Uji Notif ${label}`,
        angkatanSaatDaftar: 2016,
        programStudiSaatDaftar: "SUNDA",
        consentDataAt: new Date(),
        approvedAt: new Date(),
      },
      select: { id: true },
    });
    idAkun.push(akun.id);
    return { akunId: akun.id, alumniId: alumni.id, email };
  };

  const x = await buatAkunAktif("X");
  const y = await buatAkunAktif("Y");

  const koneksi = await prisma.connection.create({
    data: {
      requesterAccountId: x.akunId,
      recipientAccountId: y.akunId,
      pairKey: [x.akunId, y.akunId].sort().join(":"),
      status: "PENDING",
      message: "Salam uji notifikasi",
    },
    select: { id: true },
  });
  await prisma.auditLog.create({
    data: {
      alumniAccountId: x.akunId,
      aksi: "CONNECTION_CREATE",
      entitas: "Connection",
      entitasId: koneksi.id,
    },
  });

  const setelahKoneksi = await panggil("GET", "/api/admin/notifikasi", { cookie });
  const itemKoneksi = daftarDari(setelahKoneksi.body).find(
    (item) => item.aksi === "CONNECTION_CREATE"
  );
  cek(
    "permintaan koneksi menambah belumDibaca (total 2)",
    belumDibacaDari(setelahKoneksi.body) === 2,
    `belumDibaca=${belumDibacaDari(setelahKoneksi.body)}`
  );
  cek(
    "item koneksi memuat nama pengirim dan penerima",
    itemKoneksi?.tipe === "KONEKSI" &&
      Boolean(itemKoneksi?.pesan?.includes(`Uji Notif X ${stamp}`)) &&
      Boolean(itemKoneksi?.pesan?.includes(`Uji Notif Y ${stamp}`)),
    `pesan="${itemKoneksi?.pesan}"`
  );

  /* ---------- 6. Filter tipe ---------- */
  const hanyaDaftar = await panggil(
    "GET",
    "/api/admin/notifikasi?tipe=PENDAFTARAN",
    { cookie }
  );
  const hanyaKoneksi = await panggil(
    "GET",
    "/api/admin/notifikasi?tipe=KONEKSI",
    { cookie }
  );
  const daftar1 = daftarDari(hanyaDaftar.body);
  const koneksi1 = daftarDari(hanyaKoneksi.body);
  cek(
    "?tipe=PENDAFTARAN hanya memuat item pendaftaran",
    daftar1.length > 0 && daftar1.every((item) => item.tipe === "PENDAFTARAN"),
    `jumlah=${daftar1.length} tipe=${JSON.stringify(daftar1.map((i) => i.tipe))}`
  );
  cek(
    "?tipe=KONEKSI hanya memuat item koneksi",
    koneksi1.length > 0 && koneksi1.every((item) => item.tipe === "KONEKSI"),
    `jumlah=${koneksi1.length} tipe=${JSON.stringify(koneksi1.map((i) => i.tipe))}`
  );
  cek(
    "meta.belumDibaca tetap menghitung semua tipe saat difilter",
    belumDibacaDari(hanyaDaftar.body) === 2 &&
      belumDibacaDari(hanyaKoneksi.body) === 2,
    `daftar=${belumDibacaDari(hanyaDaftar.body)} koneksi=${belumDibacaDari(hanyaKoneksi.body)}`
  );

  /* ---------- 7. Tandai dibaca ---------- */
  const dibaca = await panggil("POST", "/api/admin/notifikasi/read", { cookie });
  cek(
    "POST read -> belumDibaca 0",
    (dibaca.body as { data?: { belumDibaca?: number } }).data?.belumDibaca === 0,
    `data=${JSON.stringify(dibaca.body.data)}`
  );

  const setelahDibaca = await panggil("GET", "/api/admin/notifikasi", { cookie });
  const itemLama = daftarDari(setelahDibaca.body);
  cek(
    "tandai dibaca mengosongkan badge tanpa menghapus item",
    belumDibacaDari(setelahDibaca.body) === 0 &&
      itemLama.length >= 2 &&
      itemLama.every((item) => item.baru === false),
    `belumDibaca=${belumDibacaDari(setelahDibaca.body)} jumlah=${itemLama.length}`
  );

  const dibacaLagi = await panggil("POST", "/api/admin/notifikasi/read", { cookie });
  cek(
    "tandai dibaca idempoten",
    (dibacaLagi.body as { data?: { belumDibaca?: number } }).data?.belumDibaca === 0,
    `data=${JSON.stringify(dibacaLagi.body.data)}`
  );

  /* ---------- 8. Push realtime (route -> bus -> SSE) ---------- */
  /*
   * Uji inti "realtime": stream dibuka dulu, lalu sebuah permintaan koneksi
   * sungguhan dikirim lewat endpoint. Bus in-process harus mendorong frame
   * `notifikasi` ke stream tanpa perlu polling dari klien.
   */
  const z = await buatAkunAktif("Z");

  const loginX = await panggil("POST", "/api/auth/alumni/login", {
    body: { email: x.email, password: "KataSandiUji123!" },
  });
  const cookieX = cookieDari(loginX.setCookie, "ikasada_alumni_session") ?? "";
  cek("sesi alumni uji bisa login", Boolean(cookieX), `status=${loginX.status}`);

  const kontrol2 = new AbortController();
  const jeda2 = setTimeout(() => kontrol2.abort(), 15_000);
  try {
    const stream2 = await fetch(`${BASE_URL}/api/admin/notifikasi/stream`, {
      headers: { Cookie: cookie },
      signal: kontrol2.signal,
    });
    const pembaca = stream2.body!.getReader();
    await tungguFrame(pembaca, "event: snapshot", 4000);

    const kirim = await panggil("POST", "/api/alumni/connections", {
      cookie: cookieX,
      body: { recipientAlumniId: z.alumniId, message: "Uji realtime" },
    });
    // Jendela 6 dtk < interval re-cek 20 dtk, jadi frame ini pasti dari bus.
    const frame = await tungguFrame(pembaca, "event: notifikasi", 6000);
    await pembaca.cancel();

    cek(
      "SSE mendorong notifikasi realtime tanpa polling klien",
      kirim.status === 201 &&
        frame.includes("event: notifikasi") &&
        frame.includes('"belumDibaca":1'),
      `create=${kirim.status} frame="${frame.slice(-140).replace(/\n/g, "\\n")}"`
    );
  } catch (error) {
    cek("SSE mendorong notifikasi realtime tanpa polling klien", false, String(error));
  } finally {
    clearTimeout(jeda2);
  }
} catch (error) {
  cek("uji berjalan tanpa error tak terduga", false, String(error));
} finally {
  await bersihkan();
  await prisma.$disconnect();
}

console.log("\n===== VERIFIKASI NOTIFIKASI ADMIN =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
