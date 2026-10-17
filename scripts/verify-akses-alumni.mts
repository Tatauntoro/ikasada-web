#!/usr/bin/env tsx
/**
 * Verifikasi sakelar akses akun alumni (`AKSES_ALUMNI_TERBUKA`).
 *
 * Menguji lewat HTTP sungguhan, bukan hanya konstanta:
 * 1. Endpoint `login`, `register`, dan `lupa-password` ditolak `403 FORBIDDEN`
 *    saat akses ditutup (dan tetap bisa dipanggil saat akses dibuka).
 * 2. Halaman `/alumni/login`, `/alumni/register`, `/alumni/lupa-password`
 *    dialihkan ke beranda saat akses ditutup (dan merender normal saat dibuka).
 * 3. Beranda tidak lagi memuat tautan `Masuk`/`Daftar` saat akses ditutup.
 *
 * Pakai:
 *   npm run dev            # di terminal lain
 *   npm run akses:verify
 *
 * Base URL bisa diubah lewat `VERIFY_BASE_URL`. Skrip ini tidak menyentuh
 * database: ia hanya memanggil endpoint dan membaca HTML beranda.
 */

import { AKSES_ALUMNI_TERBUKA } from "../src/lib/fitur";

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";

const hasil: { nama: string; lulus: boolean; detail: string }[] = [];
const cek = (nama: string, lulus: boolean, detail: string) =>
  hasil.push({ nama, lulus, detail });

type BodyJson = {
  success?: boolean;
  error?: { code?: string };
};

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as BodyJson | null;
  return { status: res.status, json };
}

/** Ambil halaman tanpa mengikuti redirect, supaya lokasinya bisa diperiksa. */
async function getMentah(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
  return {
    status: res.status,
    lokasi: res.headers.get("location"),
    isi: res.status >= 400 ? "" : await res.text(),
  };
}

/** Path dari sebuah nilai `Location`, untuk dibandingkan tanpa query/host. */
function pathLokasi(lokasi: string | null): string | null {
  if (!lokasi) return null;
  try {
    return new URL(lokasi, BASE_URL).pathname;
  } catch {
    return null;
  }
}

const terblokir = !AKSES_ALUMNI_TERBUKA;

/* ---------- 1. Endpoint API ---------- */
for (const jalur of [
  "/api/auth/alumni/login",
  "/api/auth/alumni/register",
  "/api/auth/alumni/lupa-password",
]) {
  const { status, json } = await post(jalur, {});
  if (terblokir) {
    cek(
      `POST ${jalur} ditolak 403 saat akses ditutup`,
      status === 403 && json?.error?.code === "FORBIDDEN",
      `status=${status} code=${json?.error?.code ?? "-"}`
    );
  } else {
    cek(
      `POST ${jalur} tidak lagi diblokir saat akses dibuka`,
      status !== 403,
      `status=${status} code=${json?.error?.code ?? "-"}`
    );
  }
}

/* ---------- 2. Halaman login/register/lupa-password ---------- */
for (const jalur of [
  "/alumni/login",
  "/alumni/register",
  "/alumni/lupa-password",
]) {
  const { status, lokasi } = await getMentah(jalur);
  if (terblokir) {
    const dialihkan = status >= 300 && status < 400;
    cek(
      `GET ${jalur} dialihkan ke beranda saat akses ditutup`,
      dialihkan && pathLokasi(lokasi) === "/",
      `status=${status} location=${lokasi ?? "-"}`
    );
  } else {
    cek(
      `GET ${jalur} merender normal saat akses dibuka`,
      status === 200,
      `status=${status}`
    );
  }
}

/* ---------- 3. Beranda tidak memuat tautan Masuk/Daftar ---------- */
const beranda = await getMentah("/");
const adaLogin = beranda.isi.includes('href="/alumni/login"');
const adaRegister = beranda.isi.includes('href="/alumni/register"');
if (terblokir) {
  cek(
    "beranda tidak memuat tautan /alumni/login",
    beranda.status === 200 && !adaLogin,
    `status=${beranda.status} adaTautan=${adaLogin}`
  );
  cek(
    "beranda tidak memuat tautan /alumni/register",
    beranda.status === 200 && !adaRegister,
    `status=${beranda.status} adaTautan=${adaRegister}`
  );
} else {
  cek(
    "beranda memuat tautan /alumni/login saat akses dibuka",
    beranda.status === 200 && adaLogin,
    `status=${beranda.status} adaTautan=${adaLogin}`
  );
}

/* ---------- laporan ---------- */
console.log("\n===== VERIFIKASI AKSES ALUMNI =====\n");
console.log(
  `AKSES_ALUMNI_TERBUKA = ${AKSES_ALUMNI_TERBUKA} (${
    terblokir ? "ditutup" : "terbuka"
  })\n`
);
let gagal = 0;
for (const h of hasil) {
  if (!h.lulus) gagal++;
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n       ${h.detail}\n`);
}
console.log(gagal === 0 ? "SEMUA LULUS" : `${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
