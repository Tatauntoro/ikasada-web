#!/usr/bin/env tsx
/**
 * Verifikasi halaman shell terautentikasi alumni (FE Task 11).
 *
 * Menguji lewat HTTP sungguhan: pengunjung anonymous tidak menerima data privat
 * sama sekali (bukan disembunyikan CSS), session kedaluwarsa membawa pesan
 * "Sesi berakhir" ke halaman login, akun `PENDING` melihat data pendaftarannya
 * sendiri, akun `ACTIVE` melihat ikhtisar alumni tertaut beserta status
 * keterbukaan, dan tombol keluar mengosongkan cookie.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run alumni:shell:verify
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

const EMAIL_UJI = "shell-uji@contoh.invalid";
const PASSWORD_UJI = "kata-sandi-uji-12";
const HALAMAN_STATUS = "/alumni/status";

type DataAkun = {
  id?: string;
  email?: string;
  status?: string;
  redirectTo?: string;
};

type BodyJson = {
  success?: boolean;
  data?: DataAkun;
  error?: { code?: string; message?: string; fields?: Record<string, string> };
};

type Hasil = {
  status: number;
  body: BodyJson;
  lokasi: string | null;
  cookie: string | null;
  setCookie: string | null;
  html: string;
};

const hasil: { nama: string; lulus: boolean; detail: string }[] = [];
const cek = (nama: string, lulus: boolean, detail: string) =>
  hasil.push({ nama, lulus, detail });

function ambilCookie(res: Response): {
  pasangan: string | null;
  baris: string | null;
} {
  for (const baris of res.headers.getSetCookie()) {
    if (!baris.startsWith("ikasada_alumni_session=")) continue;
    const [pasangan] = baris.split(";");
    return { pasangan: pasangan ?? null, baris };
  }
  return { pasangan: null, baris: null };
}

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

  let body: BodyJson = {};
  let html = "";
  const tipe = res.headers.get("content-type") ?? "";

  if (tipe.includes("application/json")) {
    body = (await res.json()) as BodyJson;
  } else {
    html = await res.text();
  }

  const setCookie = ambilCookie(res);

  return {
    status: res.status,
    body,
    lokasi: res.headers.get("location"),
    cookie: setCookie.pasangan,
    setCookie: setCookie.baris,
    html,
  };
}

const halamanTerlihat = (html: string, teks: string) => html.includes(teks);

async function bersihkan() {
  const akun = await prisma.alumniAccount.findUnique({
    where: { email: EMAIL_UJI },
    select: { id: true },
  });

  if (akun) {
    await prisma.auditLog.deleteMany({ where: { alumniAccountId: akun.id } });
    await prisma.alumniAccount.delete({ where: { id: akun.id } });
  }

  // Akun uji memakai rate-limit tersendiri; DB development tidak memakainya.
  await prisma.authRateLimit.deleteMany({});
}

async function main() {
  await bersihkan();

  // 1. Anonymous: dialihkan ke login, dan tidak ada data privat di HTML-nya.
  const anonim = await panggil("GET", HALAMAN_STATUS, { redirect: "manual" });
  cek(
    "anonymous dialihkan ke /alumni/login dengan next",
    anonim.status >= 300 &&
      anonim.status < 400 &&
      (anonim.lokasi ?? "").includes("/alumni/login") &&
      (anonim.lokasi ?? "").includes("next=%2Falumni%2Fstatus"),
    `${anonim.status} ${anonim.lokasi}`
  );
  cek(
    "anonymous tidak menerima penanda data privat",
    anonim.html === "" ||
      (!halamanTerlihat(anonim.html, "Data pendaftaran") &&
        !halamanTerlihat(anonim.html, "Status keterbukaan") &&
        !halamanTerlihat(anonim.html, "Keluar")),
    "HTML anonymous bersih dari penanda privat"
  );

  // 2. Cookie ada tapi tokennya tidak sah = session berakhir.
  const kedaluwarsa = await panggil("GET", HALAMAN_STATUS, {
    cookie: "ikasada_alumni_session=token-tidak-sah",
    redirect: "manual",
  });
  cek(
    "token tidak sah diarahkan dengan sesi=berakhir",
    kedaluwarsa.status >= 300 &&
      kedaluwarsa.status < 400 &&
      (kedaluwarsa.lokasi ?? "").includes("sesi=berakhir"),
    `${kedaluwarsa.status} ${kedaluwarsa.lokasi}`
  );

  const halamanLogin = await panggil(
    "GET",
    "/alumni/login?next=%2Falumni%2Fstatus&sesi=berakhir"
  );
  cek(
    "halaman login menampilkan pesan sesi berakhir",
    halamanLogin.status === 200 &&
      halamanTerlihat(halamanLogin.html, "Sesi berakhir. Silakan login kembali."),
    `status ${halamanLogin.status}`
  );

  // 3. Akun PENDING: boleh melihat data pendaftarannya sendiri.
  const daftar = await panggil("POST", "/api/auth/alumni/register", {
    body: {
      namaLengkap: "Pendaftar Uji Shell",
      email: EMAIL_UJI,
      angkatan: 2014,
      programStudi: "JAWA",
      password: PASSWORD_UJI,
      consentData: true,
    },
  });
  cek(
    "akun uji terdaftar sebagai PENDING",
    daftar.status === 201 && daftar.body.data?.status === "PENDING",
    `status ${daftar.status}`
  );

  const loginPending = await panggil("POST", "/api/auth/alumni/login", {
    body: { email: EMAIL_UJI, password: PASSWORD_UJI },
  });
  cek(
    "login PENDING mengarahkan ke /alumni/status",
    loginPending.status === 200 &&
      loginPending.body.data?.redirectTo === "/alumni/status" &&
      Boolean(loginPending.cookie),
    `status ${loginPending.status} redirectTo ${loginPending.body.data?.redirectTo}`
  );

  const cookiePending = loginPending.cookie ?? "";
  const statusPending = await panggil("GET", HALAMAN_STATUS, {
    cookie: cookiePending,
  });
  cek(
    "halaman status memuat data pendaftaran akun PENDING",
    statusPending.status === 200 &&
      halamanTerlihat(statusPending.html, "Pendaftar Uji Shell") &&
      halamanTerlihat(statusPending.html, EMAIL_UJI) &&
      halamanTerlihat(statusPending.html, "2014") &&
      halamanTerlihat(statusPending.html, "Sastra Jawa") &&
      halamanTerlihat(statusPending.html, "Menunggu verifikasi pengurus"),
    `status ${statusPending.status}`
  );
  cek(
    "akun PENDING tidak menerima blok data privat",
    !halamanTerlihat(statusPending.html, "Terbuka kolaborasi") &&
      !halamanTerlihat(statusPending.html, "Belum mengatur status keterbukaan") &&
      !halamanTerlihat(statusPending.html, "Aktif sejak"),
    "tidak ada badge keterbukaan maupun ikhtisar alumni"
  );

  // 4. Akun ACTIVE: ikhtisar alumni tertaut + status keterbukaan.
  const alumni = await prisma.alumni.findFirst({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      account: null,
      namaLengkap: { not: "" },
    },
    select: { id: true, namaLengkap: true },
  });

  if (!alumni) {
    cek("ada alumni PUBLISHED yang belum punya akun", false, "tidak ditemukan");
  } else {
    await prisma.alumniAccount.update({
      where: { email: EMAIL_UJI },
      data: {
        status: StatusAlumniAccount.ACTIVE,
        alumniId: alumni.id,
        approvedAt: new Date(),
        openToCollaboration: true,
      },
    });

    const loginAktif = await panggil("POST", "/api/auth/alumni/login", {
      body: { email: EMAIL_UJI, password: PASSWORD_UJI, next: HALAMAN_STATUS },
    });
    cek(
      "login ACTIVE mengikuti next internal",
      loginAktif.status === 200 &&
        loginAktif.body.data?.redirectTo === HALAMAN_STATUS,
      `status ${loginAktif.status} redirectTo ${loginAktif.body.data?.redirectTo}`
    );

    const cookieAktif = loginAktif.cookie ?? cookiePending;
    const statusAktif = await panggil("GET", HALAMAN_STATUS, {
      cookie: cookieAktif,
    });
    cek(
      "halaman status memuat ikhtisar alumni tertaut",
      statusAktif.status === 200 &&
        halamanTerlihat(statusAktif.html, "Akun Anda sudah aktif.") &&
        halamanTerlihat(statusAktif.html, alumni.namaLengkap) &&
        halamanTerlihat(statusAktif.html, "Aktif sejak"),
      `status ${statusAktif.status}`
    );
    cek(
      "status keterbukaan hanya muncul untuk akun ACTIVE",
      halamanTerlihat(statusAktif.html, "Status keterbukaan") &&
        halamanTerlihat(statusAktif.html, "Terbuka kolaborasi") &&
        !halamanTerlihat(statusAktif.html, "Terbuka kesempatan"),
      "kolaborasi tampil, kesempatan tidak"
    );

    // 5. Keluar: cookie dikosongkan dengan opsi yang sama.
    const keluar = await panggil("POST", "/api/auth/alumni/logout", {
      cookie: cookieAktif,
    });
    cek(
      "logout mengosongkan cookie session alumni",
      keluar.status === 200 &&
        keluar.cookie === "ikasada_alumni_session=" &&
        (keluar.setCookie ?? "").toLowerCase().includes("max-age=0"),
      `status ${keluar.status} cookie ${keluar.setCookie}`
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
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await bersihkan();
    const jumlah = {
      alumni: await prisma.alumni.count({ where: { deletedAt: null } }),
      akun: await prisma.alumniAccount.count(),
      rateLimit: await prisma.authRateLimit.count(),
      audit: await prisma.auditLog.count(),
    };
    console.log("DB development:", JSON.stringify(jumlah));
    await prisma.$disconnect();
  });
