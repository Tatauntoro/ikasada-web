#!/usr/bin/env tsx
/**
 * Verifikasi halaman Profil tingkat HTTP (FE Task 15).
 *
 * Yang diuji: pengalihan pengunjung yang tidak berhak sebelum isi dirender,
 * perbedaan session berakhir vs belum login, akun `PENDING` yang diarahkan ke
 * status verifikasinya, dan endpoint data yang dipakai halaman ini — yang harus
 * tetap menolak akun non-`ACTIVE` meskipun halamannya bisa dibuka.
 *
 * Isi switch sendiri (nilai tersimpan, umpan balik, galat, cermin di direktori)
 * diuji di browser sungguhan, bukan di sini.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run alumni:profil-halaman:verify
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

const EMAIL_UJI = "profil-verifikasi@contoh.invalid";
const PASSWORD_UJI = "kata-sandi-uji-12";
const HALAMAN = "/alumni/profil";

type Hasil = {
  status: number;
  lokasi: string | null;
  cookie: string | null;
  html: string;
  body: unknown;
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
  const teks = await res.text();
  const json = tipe.includes("application/json");

  return {
    status: res.status,
    lokasi: res.headers.get("location"),
    cookie,
    html: json ? "" : teks,
    body: json ? (JSON.parse(teks) as unknown) : null,
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

  const anonim = await panggil("GET", HALAMAN, { redirect: "manual" });
  cek(
    "anonymous dialihkan ke login dengan next",
    anonim.status >= 300 &&
      anonim.status < 400 &&
      (anonim.lokasi ?? "").includes("/alumni/login") &&
      (anonim.lokasi ?? "").includes("next=%2Falumni%2Fprofil") &&
      !(anonim.lokasi ?? "").includes("sesi=berakhir"),
    `${anonim.status} ${anonim.lokasi}`
  );
  cek(
    "anonymous tidak menerima isi halaman profil",
    anonim.html === "" ||
      (!anonim.html.includes("Profil dan preferensi") &&
        !anonim.html.includes("Visibilitas kontak")),
    "HTML anonymous bersih"
  );

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

  const daftar = await panggil("POST", "/api/auth/alumni/register", {
    body: {
      namaLengkap: "Pendaftar Uji Profil",
      email: EMAIL_UJI,
      angkatan: 2011,
      programStudi: "JAWA",
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

  const dataPending = await panggil("GET", "/api/alumni/me/profile", {
    cookie: cookiePending,
    redirect: "manual",
  });
  cek(
    "endpoint profil menolak akun PENDING",
    dataPending.status === 401,
    `status ${dataPending.status}`
  );

  /*
   * Menu di shell hanya boleh menautkan halaman yang memang bisa dibuka akun
   * itu: pendaftar belum boleh masuk ke profil maupun jejaring.
   */
  const statusPending = await panggil("GET", "/alumni/status", {
    cookie: cookiePending,
  });
  cek(
    "menu akun PENDING tidak menautkan halaman privat",
    statusPending.status === 200 &&
      !statusPending.html.includes('href="/alumni/profil"') &&
      !statusPending.html.includes('href="/alumni/jejaring"'),
    `status ${statusPending.status}`
  );

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
      "akun ACTIVE menerima halaman profil",
      halamanAktif.status === 200 &&
        halamanAktif.html.includes("Profil dan preferensi Anda") &&
        halamanAktif.html.includes("Ruang alumni"),
      `status ${halamanAktif.status}`
    );

    const dataAktif = await panggil("GET", "/api/alumni/me/profile", {
      cookie: cookieAktif,
    });
    const isiProfil = (dataAktif.body as { data?: Record<string, unknown> })
      ?.data;
    const KUNCI_PREFERENSI = [
      "openToCollaboration",
      "openToOpportunity",
      "showEmailToConnections",
      "showWhatsappToConnections",
      "showSocialLinksToConnections",
    ];
    cek(
      "profil ACTIVE membawa lima preferensi",
      dataAktif.status === 200 &&
        KUNCI_PREFERENSI.every((kunci) => isiProfil?.[kunci] !== undefined),
      `status ${dataAktif.status} kunci=${KUNCI_PREFERENSI.filter((k) => isiProfil?.[k] !== undefined).length}/5`
    );

    const tolakAsing = await panggil("PATCH", "/api/alumni/me/profile", {
      cookie: cookieAktif,
      body: { alumniId: "apa-saja" },
    });
    cek(
      "PATCH menolak field asing dengan 400",
      tolakAsing.status === 400,
      `status ${tolakAsing.status}`
    );

    const simpanParsial = await panggil("PATCH", "/api/alumni/me/profile", {
      cookie: cookieAktif,
      body: { openToCollaboration: true },
    });
    const tersimpan = (
      simpanParsial.body as { data?: Record<string, unknown> }
    )?.data;
    cek(
      "PATCH parsial hanya mengubah field yang dikirim",
      simpanParsial.status === 200 &&
        tersimpan?.openToCollaboration === true &&
        tersimpan?.openToOpportunity === false,
      `status ${simpanParsial.status}`
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
