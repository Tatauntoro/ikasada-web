#!/usr/bin/env tsx
/**
 * Verifikasi halaman Jejaring tingkat HTTP (FE Task 14).
 *
 * Yang diuji di sini adalah hal-hal yang tidak bisa dibuktikan lewat tampilan:
 * pengalihan pengunjung yang tidak berhak **sebelum** isi halaman dirender,
 * perbedaan session berakhir vs belum pernah login, akun `PENDING` yang
 * diarahkan ke status verifikasinya, dan tab aktif yang dibaca dari query string
 * di server (supaya tautan `?tab=` bekerja tanpa JavaScript).
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run alumni:jejaring:verify
 *
 * Data uji memakai domain `.invalid` dan dihapus di blok `finally`.
 */

import { existsSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { StatusAlumniAccount } from "../src/generated/prisma/enums";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const prisma = new PrismaClient();

const EMAIL_UJI = "jejaring-verifikasi@contoh.invalid";
const PASSWORD_UJI = "kata-sandi-uji-12";
const HALAMAN = "/alumni/jejaring";

type Hasil = {
  status: number;
  lokasi: string | null;
  cookie: string | null;
  html: string;
};

const hasil: { nama: string; lulus: boolean; detail: string }[] = [];
const cek = (nama: string, lulus: boolean, detail: string) =>
  hasil.push({ nama, lulus, detail });

async function panggil(
  method: string,
  path: string,
  opsi: { body?: unknown; cookie?: string; redirect?: "manual" } = {}
): Promise<Hasil> {
  const headers: Record<string, string> = {};
  if (opsi.body !== undefined) headers["Content-Type"] = "application/json";
  if (opsi.cookie) headers["Cookie"] = opsi.cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opsi.body === undefined ? undefined : JSON.stringify(opsi.body),
    redirect: opsi.redirect ?? "follow",
  });

  let cookie: string | null = null;
  for (const baris of res.headers.getSetCookie()) {
    if (!baris.startsWith("ikasada_alumni_session=")) continue;
    const [pasangan] = baris.split(";");
    if (pasangan && pasangan !== "ikasada_alumni_session=") cookie = pasangan;
  }

  const tipe = res.headers.get("content-type") ?? "";
  return {
    status: res.status,
    lokasi: res.headers.get("location"),
    cookie,
    html: tipe.includes("application/json") ? "" : await res.text(),
  };
}

async function bersihkan() {
  const akun = await prisma.alumniAccount.findUnique({
    where: { email: EMAIL_UJI },
    select: { id: true },
  });

  if (akun) {
    await prisma.auditLog.deleteMany({ where: { alumniAccountId: akun.id } });
    await prisma.alumniAccount.delete({ where: { id: akun.id } });
  }

  await prisma.authRateLimit.deleteMany({});
}

async function main() {
  await bersihkan();

  // 1. Anonymous: dialihkan ke login dengan `next`, dan tidak ada isi privat.
  const anonim = await panggil("GET", HALAMAN, { redirect: "manual" });
  cek(
    "anonymous dialihkan ke login dengan next",
    anonim.status >= 300 &&
      anonim.status < 400 &&
      (anonim.lokasi ?? "").includes("/alumni/login") &&
      (anonim.lokasi ?? "").includes("next=%2Falumni%2Fjejaring") &&
      !(anonim.lokasi ?? "").includes("sesi=berakhir"),
    `${anonim.status} ${anonim.lokasi}`
  );
  cek(
    "anonymous tidak menerima isi halaman jejaring",
    anonim.html === "" ||
      (!anonim.html.includes("Permintaan dan koneksi") &&
        !anonim.html.includes("Permintaan Masuk")),
    "HTML anonymous bersih"
  );

  // 2. Cookie tidak sah = session berakhir.
  const kedaluwarsa = await panggil("GET", HALAMAN, {
    cookie: "ikasada_alumni_session=token-tidak-sah",
    redirect: "manual",
  });
  cek(
    "cookie tidak sah diarahkan dengan sesi=berakhir",
    kedaluwarsa.status >= 300 &&
      kedaluwarsa.status < 400 &&
      (kedaluwarsa.lokasi ?? "").includes("sesi=berakhir"),
    `${kedaluwarsa.status} ${kedaluwarsa.lokasi}`
  );

  // 3. Akun PENDING diarahkan ke halaman status verifikasinya.
  const daftar = await panggil("POST", "/api/auth/alumni/register", {
    body: {
      namaLengkap: "Pendaftar Uji Jejaring",
      email: EMAIL_UJI,
      angkatan: 2013,
      programStudi: "SUNDA",
      password: PASSWORD_UJI,
      consentData: true,
    },
  });
  cek("akun uji terdaftar", daftar.status === 201, `status ${daftar.status}`);

  const loginPending = await panggil("POST", "/api/auth/alumni/login", {
    body: { email: EMAIL_UJI, password: PASSWORD_UJI },
  });
  const cookiePending = loginPending.cookie ?? "";

  const halamanPending = await panggil("GET", HALAMAN, {
    cookie: cookiePending,
    redirect: "manual",
  });
  cek(
    "session PENDING diarahkan ke /alumni/status",
    halamanPending.status >= 300 &&
      halamanPending.status < 400 &&
      (halamanPending.lokasi ?? "").endsWith("/alumni/status"),
    `${halamanPending.status} ${halamanPending.lokasi}`
  );

  // 4. Akun ACTIVE membuka halamannya, tab dibaca dari query string di server.
  const alumni = await prisma.alumni.findFirst({
    where: { status: "PUBLISHED", deletedAt: null, account: null },
    select: { id: true },
  });

  if (!alumni) {
    cek("ada alumni PUBLISHED tanpa akun", false, "tidak ditemukan");
  } else {
    await prisma.alumniAccount.update({
      where: { email: EMAIL_UJI },
      data: {
        status: StatusAlumniAccount.ACTIVE,
        alumniId: alumni.id,
        approvedAt: new Date(),
      },
    });

    const loginAktif = await panggil("POST", "/api/auth/alumni/login", {
      body: { email: EMAIL_UJI, password: PASSWORD_UJI },
    });
    const cookieAktif = loginAktif.cookie ?? cookiePending;

    const halamanAktif = await panggil("GET", HALAMAN, {
      cookie: cookieAktif,
      redirect: "manual",
    });
    cek(
      "akun ACTIVE menerima halaman jejaring",
      halamanAktif.status === 200 &&
        halamanAktif.html.includes("Permintaan dan koneksi Anda") &&
        halamanAktif.html.includes("Ruang alumni"),
      `status ${halamanAktif.status}`
    );

    const tabTerkunci = await panggil(
      "GET",
      `${HALAMAN}?tab=accepted`,
      { cookie: cookieAktif, redirect: "manual" }
    );
    cek(
      "tab dari query string dipakai saat render server",
      tabTerkunci.status === 200 &&
        tabTerkunci.html.includes('aria-pressed="true"') &&
        tabTerkunci.html.includes("Terhubung"),
      `status ${tabTerkunci.status}`
    );

    const tabNgawur = await panggil("GET", `${HALAMAN}?tab=ngawur`, {
      cookie: cookieAktif,
      redirect: "manual",
    });
    cek(
      "tab tidak dikenal jatuh ke permintaan masuk",
      tabNgawur.status === 200 && tabNgawur.html.includes("Permintaan Masuk"),
      `status ${tabNgawur.status}`
    );

    const apiTanpaSession = await panggil(
      "GET",
      "/api/alumni/connections?tab=incoming",
      { redirect: "manual" }
    );
    cek(
      "endpoint koneksi tetap menolak tanpa session",
      apiTanpaSession.status === 401,
      `status ${apiTanpaSession.status}`
    );
  }

  const gagal = hasil.filter((h) => !h.lulus);
  for (const h of hasil) {
    console.log(`${h.lulus ? "OK  " : "GAGAL"} ${h.nama} — ${h.detail}`);
  }
  console.log(
    `\n${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await bersihkan();
    console.log("DB development:", {
      alumni: await prisma.alumni.count({ where: { deletedAt: null } }),
      akun: await prisma.alumniAccount.count(),
      koneksi: await prisma.connection.count(),
      rateLimit: await prisma.authRateLimit.count(),
      audit: await prisma.auditLog.count(),
    });
    await prisma.$disconnect();
  });
