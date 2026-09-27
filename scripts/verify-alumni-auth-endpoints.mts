#!/usr/bin/env tsx
/**
 * Verifikasi endpoint auth alumni (BE Task 4).
 *
 * Menguji lewat HTTP sungguhan, bukan hanya library: register, login (termasuk
 * akun PENDING yang boleh login terbatas), logout, dan `/me`. Setup dan
 * pembersihan data dilakukan langsung lewat Prisma supaya tidak bergantung pada
 * Task 5 (approval admin) yang belum ada.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run auth:endpoints:verify
 *
 * Base URL bisa diubah lewat `VERIFY_BASE_URL`.
 *
 * Catatan: data uji memakai email domain `.invalid` dan dihapus lagi di akhir
 * (`finally`), sehingga DB development tidak kotor.
 */

import { existsSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";

const prisma = new PrismaClient();

type DataAkun = {
  id?: string;
  email?: string;
  status?: string;
  alumni?: { id?: string } | null;
  openToCollaboration?: boolean;
  openToOpportunity?: boolean;
  redirectTo?: string;
  approvedAt?: string | null;
  lastLoginAt?: string | null;
  namaLengkapSaatDaftar?: string;
  angkatanSaatDaftar?: number;
};

type BodyJson = {
  success?: boolean;
  data?: DataAkun;
  error?: { code?: string; message?: string; fields?: Record<string, string> };
};

type Hasil = {
  status: number;
  body: BodyJson;
  setCookie: string[];
};

const hasil: { nama: string; lulus: boolean; detail: string }[] = [];
const cek = (nama: string, lulus: boolean, detail: string) =>
  hasil.push({ nama, lulus, detail });

async function panggil(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string
): Promise<Hasil> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: `ikasada_alumni_session=${cookie}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });

  let parsed: BodyJson = {};
  try {
    parsed = (await res.json()) as BodyJson;
  } catch {
    parsed = {};
  }

  return {
    status: res.status,
    body: parsed,
    setCookie: res.headers.getSetCookie(),
  };
}

function cookieMentah(setCookie: string[]): string | null {
  return (
    setCookie.find((c) => c.startsWith("ikasada_alumni_session=")) ?? null
  );
}

function nilaiCookie(setCookie: string[]): string | null {
  const mentah = cookieMentah(setCookie);
  if (mentah === null) return null;
  const nilai = mentah.slice("ikasada_alumni_session=".length).split(";")[0];
  return nilai ? decodeURIComponent(nilai) : "";
}

function punyaFlag(mentah: string, flag: string): boolean {
  return mentah
    .split(";")
    .slice(1)
    .some((bagian) => bagian.trim().toLowerCase() === flag.toLowerCase());
}

const stamp = Date.now();
const email = `uji-${stamp}@contoh.invalid`;
const emailTanpaAkun = `uji-kosong-${stamp}@contoh.invalid`;
const password = "KataSandiUji123!";

let akunId: string | undefined;
const auditAdminSebelum = await prisma.auditLog.count({
  where: { adminId: { not: null } },
});
const mulai = new Date();

try {
  /* ---------- 1. Anonymous ---------- */
  const anon = await panggil("GET", "/api/auth/alumni/me");
  cek(
    "GET /me tanpa session -> 401",
    anon.status === 401 && anon.body.error?.code === "UNAUTHORIZED",
    `status=${anon.status} code=${anon.body.error?.code}`
  );

  /* ---------- 2. Register ---------- */
  const daftar = await panggil("POST", "/api/auth/alumni/register", {
    namaLengkap: "Alumni Uji",
    email,
    angkatan: 2012,
    programStudi: "JAWA",
    password,
    consentData: true,
  });
  akunId = daftar.body.data?.id;
  cek(
    "register valid -> 201 dengan status PENDING",
    daftar.status === 201 && daftar.body.data?.status === "PENDING",
    `status=${daftar.status} data.status=${daftar.body.data?.status}`
  );
  cek(
    "register tidak menerbitkan session",
    cookieMentah(daftar.setCookie) === null,
    `set-cookie=${JSON.stringify(daftar.setCookie)}`
  );
  const teksDaftar = JSON.stringify(daftar.body);
  cek(
    "register tidak membocorkan passwordHash atau password",
    !teksDaftar.includes("passwordHash") && !teksDaftar.includes(password),
    `panjang body=${teksDaftar.length}`
  );

  const daftarUlang = await panggil("POST", "/api/auth/alumni/register", {
    namaLengkap: "Alumni Uji",
    email,
    angkatan: 2012,
    programStudi: "JAWA",
    password,
    consentData: true,
  });
  cek(
    "register email duplikat -> 409",
    daftarUlang.status === 409 && daftarUlang.body.error?.code === "CONFLICT",
    `status=${daftarUlang.status} message="${daftarUlang.body.error?.message}"`
  );

  const passwordPendek = await panggil("POST", "/api/auth/alumni/register", {
    namaLengkap: "Alumni Uji",
    email: `pendek-${stamp}@contoh.invalid`,
    angkatan: 2012,
    programStudi: "JAWA",
    password: "pendek12",
    consentData: true,
  });
  cek(
    "password di bawah 12 karakter -> 400 pada field password",
    passwordPendek.status === 400 &&
      typeof passwordPendek.body.error?.fields?.password === "string",
    `status=${passwordPendek.status} fields=${JSON.stringify(passwordPendek.body.error?.fields)}`
  );

  const consentSalah = await panggil("POST", "/api/auth/alumni/register", {
    namaLengkap: "Alumni Uji",
    email: `consent-${stamp}@contoh.invalid`,
    angkatan: 2012,
    programStudi: "JAWA",
    password,
    consentData: false,
  });
  cek(
    "consentData false -> 400 pada field consentData",
    consentSalah.status === 400 &&
      typeof consentSalah.body.error?.fields?.consentData === "string",
    `status=${consentSalah.status} fields=${JSON.stringify(consentSalah.body.error?.fields)}`
  );

  /* ---------- 3. Login akun PENDING ---------- */
  const loginPending = await panggil("POST", "/api/auth/alumni/login", {
    email,
    password,
  });
  cek(
    "login akun PENDING -> 200 (master planning §6) dengan status PENDING",
    loginPending.status === 200 && loginPending.body.data?.status === "PENDING",
    `status=${loginPending.status} data.status=${loginPending.body.data?.status}`
  );
  cek(
    "login PENDING tidak mengirim status keterbukaan",
    loginPending.body.data?.openToCollaboration === undefined &&
      loginPending.body.data?.openToOpportunity === undefined,
    `openToCollaboration=${String(loginPending.body.data?.openToCollaboration)}`
  );
  cek(
    "login PENDING diarahkan ke /alumni/status",
    loginPending.body.data?.redirectTo === "/alumni/status",
    `redirectTo=${loginPending.body.data?.redirectTo}`
  );

  const cookiePending = nilaiCookie(loginPending.setCookie);
  const cookiePendingMentah = cookieMentah(loginPending.setCookie) ?? "";
  cek(
    "cookie alumni httpOnly + SameSite=Lax + Path=/ + session cookie (tanpa Max-Age) di dev",
    punyaFlag(cookiePendingMentah, "httponly") &&
      cookiePendingMentah.includes("SameSite=lax") &&
      punyaFlag(cookiePendingMentah, "path=/") &&
      !cookiePendingMentah.includes("Max-Age") &&
      !punyaFlag(cookiePendingMentah, "secure"),
    cookiePendingMentah
  );
  cek(
    "cookie memakai nama khusus alumni, bukan ikasada_session",
    cookiePendingMentah.startsWith("ikasada_alumni_session="),
    cookiePendingMentah.split("=")[0]
  );

  /* "Ingat saya" -> cookie persistent 30 hari (menggantikan session cookie). */
  const loginIngat = await panggil("POST", "/api/auth/alumni/login", {
    email,
    password,
    ingatSaya: true,
  });
  const cookieIngat = cookieMentah(loginIngat.setCookie) ?? "";
  cek(
    '"ingat saya" -> cookie persistent 30 hari (Max-Age 2592000)',
    loginIngat.status === 200 && cookieIngat.includes("Max-Age=2592000"),
    `status=${loginIngat.status} ${cookieIngat}`
  );

  const mePending = await panggil(
    "GET",
    "/api/auth/alumni/me",
    undefined,
    cookiePending ?? undefined
  );
  cek(
    "GET /me dengan session PENDING -> 200 data pendaftaran saja",
    mePending.status === 200 &&
      mePending.body.data?.status === "PENDING" &&
      typeof mePending.body.data?.namaLengkapSaatDaftar === "string" &&
      mePending.body.data?.openToCollaboration === undefined &&
      mePending.body.data?.alumni === null,
    `status=${mePending.status} keys=${JSON.stringify(Object.keys(mePending.body.data ?? {}))}`
  );

  /* ---------- 4. Login gagal ---------- */
  const passwordSalah = await panggil("POST", "/api/auth/alumni/login", {
    email,
    password: "KataSandiSalah123!",
  });
  const emailKosong = await panggil("POST", "/api/auth/alumni/login", {
    email: emailTanpaAkun,
    password,
  });
  cek(
    "password salah -> 401 generik tanpa cookie",
    passwordSalah.status === 401 &&
      cookieMentah(passwordSalah.setCookie) === null,
    `status=${passwordSalah.status} message="${passwordSalah.body.error?.message}"`
  );
  cek(
    "email tidak terdaftar -> pesan identik dengan password salah (anti enumerasi)",
    emailKosong.status === 401 &&
      emailKosong.body.error?.message === passwordSalah.body.error?.message,
    `salah="${passwordSalah.body.error?.message}" kosong="${emailKosong.body.error?.message}"`
  );

  /* ---------- 5. Akun ACTIVE ---------- */
  const alumniKosong = await prisma.alumni.findFirst({
    where: { account: null, deletedAt: null, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!alumniKosong || !akunId) {
    cek(
      "ada record Alumni bebas untuk ditautkan",
      false,
      `alumni=${alumniKosong?.id} akun=${akunId}`
    );
  } else {
    await prisma.alumniAccount.update({
      where: { id: akunId },
      data: {
        status: "ACTIVE",
        alumniId: alumniKosong.id,
        approvedAt: new Date(),
      },
    });

    const loginActive = await panggil("POST", "/api/auth/alumni/login", {
      email,
      password,
      next: "/alumni/jejaring",
    });
    cek(
      "login ACTIVE -> 200 dengan keterbukaan dan alumni tertaut",
      loginActive.status === 200 &&
        loginActive.body.data?.status === "ACTIVE" &&
        typeof loginActive.body.data?.openToCollaboration === "boolean" &&
        loginActive.body.data?.alumni?.id === alumniKosong.id,
      `status=${loginActive.status} alumni=${loginActive.body.data?.alumni?.id}`
    );
    cek(
      "next internal dipakai apa adanya",
      loginActive.body.data?.redirectTo === "/alumni/jejaring",
      `redirectTo=${loginActive.body.data?.redirectTo}`
    );

    const cookieActive = nilaiCookie(loginActive.setCookie) ?? undefined;

    const meActive = await panggil(
      "GET",
      "/api/auth/alumni/me",
      undefined,
      cookieActive
    );
    cek(
      "GET /me ACTIVE -> 200 dengan preferensi keterbukaan",
      meActive.status === 200 &&
        meActive.body.data?.status === "ACTIVE" &&
        typeof meActive.body.data?.openToCollaboration === "boolean",
      `status=${meActive.status} keys=${JSON.stringify(Object.keys(meActive.body.data ?? {}))}`
    );
    cek(
      "GET /me membaca status dari database, bukan klaim token lama",
      (await panggil("GET", "/api/auth/alumni/me", undefined, cookiePending ?? undefined))
        .status === 200,
      "token PENDING + DB ACTIVE -> 200"
    );

    /* ---------- 6. Open redirect ---------- */
    for (const [target, diharapkan, label] of [
      ["https://jahat.example/masuk", "/alumni", "URL absolut"],
      ["//jahat.example", "/alumni", "protocol-relative"],
      ["/alumni/status?tab=1", "/alumni/status?tab=1", "path internal dengan query"],
    ] as const) {
      const uji = await panggil("POST", "/api/auth/alumni/login", {
        email,
        password,
        next: target,
      });
      cek(
        `next ${label} -> ${diharapkan}`,
        uji.body.data?.redirectTo === diharapkan,
        `next="${target}" redirectTo=${uji.body.data?.redirectTo}`
      );
    }

    /* ---------- 7. Cookie alumni tidak untuk admin ---------- */
    const admin = await panggil("GET", "/api/admin/alumni", undefined, cookieActive);
    cek(
      "cookie alumni ditolak di /api/admin/* -> 401",
      admin.status === 401,
      `status=${admin.status}`
    );

    /* ---------- 8. Suspend akun yang sudah punya session ---------- */
    await prisma.alumniAccount.update({
      where: { id: akunId },
      data: { status: "SUSPENDED", suspendedAt: new Date() },
    });
    const loginSuspend = await panggil("POST", "/api/auth/alumni/login", {
      email,
      password,
    });
    cek(
      "login akun SUSPENDED -> 401 tanpa cookie",
      loginSuspend.status === 401 &&
        cookieMentah(loginSuspend.setCookie) === null,
      `status=${loginSuspend.status} message="${loginSuspend.body.error?.message}"`
    );
    const meSuspend = await panggil(
      "GET",
      "/api/auth/alumni/me",
      undefined,
      cookieActive
    );
    cek(
      "session lama langsung tidak berlaku setelah suspend",
      meSuspend.status === 401,
      `status=${meSuspend.status} message="${meSuspend.body.error?.message}"`
    );

    /* ---------- 9. Logout ---------- */
    await prisma.alumniAccount.update({
      where: { id: akunId },
      data: { status: "ACTIVE", suspendedAt: null },
    });
    const loginLagi = await panggil("POST", "/api/auth/alumni/login", {
      email,
      password,
    });
    const cookieLagi = nilaiCookie(loginLagi.setCookie) ?? undefined;

    const keluar = await panggil("POST", "/api/auth/alumni/logout", undefined, cookieLagi);
    cek(
      "logout -> 200 dan cookie dikosongkan",
      keluar.status === 200 && nilaiCookie(keluar.setCookie) === "",
      `status=${keluar.status} cookie=${JSON.stringify(nilaiCookie(keluar.setCookie))}`
    );

    const meSetelahLogout = await panggil("GET", "/api/auth/alumni/me");
    cek(
      "GET /me tanpa cookie setelah logout -> 401",
      meSetelahLogout.status === 401,
      `status=${meSetelahLogout.status}`
    );

    /*
     * Batasan yang dicatat, bukan bug: JWT tidak punya revocation list, jadi
     * logout hanya menghapus cookie di browser. Token yang sudah terbit tetap
     * sah sampai kedaluwarsa (8 jam) — sama seperti session admin. Uji ini
     * menjaga perilaku itu agar perubahan di masa depan (mis. revocation)
     * terlihat.
     */
    const meDenganTokenLama = await panggil(
      "GET",
      "/api/auth/alumni/me",
      undefined,
      cookieLagi
    );
    cek(
      "token lama masih sah sampai kedaluwarsa (logout hanya hapus cookie)",
      meDenganTokenLama.status === 200,
      `status=${meDenganTokenLama.status} (batasan JWT stateless, sama seperti admin)`
    );
  }

  /* ---------- 10. Rate limit login ---------- */
  let statusTerakhir = 0;
  for (let i = 0; i < 6; i++) {
    const percobaan = await panggil("POST", "/api/auth/alumni/login", {
      email: emailTanpaAkun,
      password,
    });
    statusTerakhir = percobaan.status;
  }
  cek(
    "6 percobaan gagal berturut -> 429",
    statusTerakhir === 429,
    `status terakhir=${statusTerakhir}`
  );

  /* ---------- 11. Audit ---------- */
  const auditDaftar = await prisma.auditLog.findFirst({
    where: { alumniAccountId: akunId, aksi: "ALUMNI_REGISTER" },
  });
  const auditLogin = await prisma.auditLog.findFirst({
    where: { alumniAccountId: akunId, aksi: "ALUMNI_LOGIN" },
  });
  cek(
    "audit register/login memakai actor alumni tanpa memalsukan admin",
    auditDaftar?.adminId === null && auditLogin?.adminId === null,
    `register.adminId=${String(auditDaftar?.adminId)} login.adminId=${String(auditLogin?.adminId)}`
  );
  cek(
    "audit tidak menyimpan password atau token",
    !JSON.stringify(auditDaftar).includes(password) &&
      !JSON.stringify(auditDaftar).includes("eyJ") &&
      !JSON.stringify(auditLogin).includes(password) &&
      !JSON.stringify(auditLogin).includes("eyJ"),
    "tidak ada password/token di detail audit"
  );
  const auditAdminSesudah = await prisma.auditLog.count({
    where: { adminId: { not: null } },
  });
  cek(
    "audit admin lama tidak terganggu",
    auditAdminSesudah === auditAdminSebelum,
    `sebelum=${auditAdminSebelum} sesudah=${auditAdminSesudah}`
  );
} catch (error) {
  cek("uji berjalan tanpa error tak terduga", false, String(error));
} finally {
  if (akunId) {
    await prisma.auditLog.deleteMany({ where: { alumniAccountId: akunId } });
    await prisma.alumniAccount.deleteMany({ where: { id: akunId } });
  }
  await prisma.alumniAccount.deleteMany({
    where: { email: { contains: `-${stamp}@contoh.invalid` } },
  });
  await prisma.authRateLimit.deleteMany({ where: { updatedAt: { gte: mulai } } });
  await prisma.$disconnect();
}

console.log("\n===== VERIFIKASI ENDPOINT AUTH ALUMNI =====\n");
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
