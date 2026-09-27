import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, tooManyRequests, validationError } from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { catatAudit } from "@/lib/audit";
import { publikasiNotifikasi } from "@/lib/notifikasi-events";
import {
  ambilIpKlien,
  catatPercobaan,
  cekRateLimit,
  sidikJari,
} from "@/lib/rate-limit";
import { logPeristiwa, requestIdDari } from "@/lib/log";
import { alumniLupaPasswordSchema } from "@/lib/validations/alumni-account";

/**
 * Permintaan reset kata sandi mandiri dari halaman publik.
 *
 * Fase ini belum punya email provider, jadi permintaan **tidak** mengirim email:
 * ia hanya dicatat sebagai baris `AuditLog` (`ALUMNI_RESET_PASSWORD_REQUEST`)
 * yang otomatis muncul di inbox admin. Pengurus yang mereset lewat halaman
 * verifikasi akun, lalu menyampaikan kata sandi baru di kanal resmi.
 *
 * Prinsip sama dengan login (§3.3):
 * - Respons **selalu** generik supaya tidak bisa dipakai menebak email terdaftar.
 * - Rate limit per email dan per IP; identifier mentah tidak pernah disimpan.
 * - Actor audit = `AlumniAccount` pemilik email, bukan admin (tidak memalsukan).
 */
const WINDOW_MS = 60 * 60 * 1000; // 1 jam
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;
/** Jeda minimum antar permintaan untuk akun yang sama agar inbox tidak banjir. */
const JEDA_DUPLIKAT_MS = 15 * 60 * 1000;

const PESAN_GENERIK =
  "Jika email terdaftar, permintaan reset kata sandi sudah diteruskan ke pengurus. Pengurus akan menghubungi Anda lewat kanal resmi.";

async function handler(req: NextRequest): Promise<Response> {
  const body = await readJsonBody(req);

  const parsed = alumniLupaPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { email } = parsed.data;

  const opsiEmail = {
    scope: "alumni_lupa_password_email",
    key: email,
    maxAttempts: MAX_PER_EMAIL,
    windowMs: WINDOW_MS,
  };
  const opsiIp = {
    scope: "alumni_lupa_password_ip",
    key: ambilIpKlien(req),
    maxAttempts: MAX_PER_IP,
    windowMs: WINDOW_MS,
  };

  const [cekEmail, cekIp] = await Promise.all([
    cekRateLimit(opsiEmail),
    cekRateLimit(opsiIp),
  ]);
  if (cekEmail.blocked || cekIp.blocked) {
    logPeristiwa("rate_limit", {
      requestId: requestIdDari(req),
      endpoint: "/api/auth/alumni/lupa-password",
      scope: cekEmail.blocked ? "email" : "ip",
      sidikJari: sidikJari("alumni_lupa_password_email", email),
      retryAfterDetik: Math.max(cekEmail.retryAfterDetik, cekIp.retryAfterDetik),
    });

    return tooManyRequests(
      "Terlalu banyak permintaan reset kata sandi. Silakan coba lagi nanti."
    );
  }

  await Promise.all([catatPercobaan(opsiEmail), catatPercobaan(opsiIp)]);

  const akun = await prisma.alumniAccount.findUnique({
    where: { email },
    select: { id: true },
  });

  /*
   * Email yang tidak terdaftar tetap dibalas sama (anti-enumerasi). Permintaan
   * dari akun yang sama dalam jeda singkat tidak ditulis ulang supaya inbox
   * admin tidak dipenuhi baris kembar.
   */
  if (akun) {
    const sudahAda = await prisma.auditLog.findFirst({
      where: {
        aksi: "ALUMNI_RESET_PASSWORD_REQUEST",
        entitasId: akun.id,
        createdAt: { gte: new Date(Date.now() - JEDA_DUPLIKAT_MS) },
      },
      select: { id: true },
    });

    if (!sudahAda) {
      await prisma.$transaction(async (tx) => {
        await catatAudit(tx, {
          alumniAccountId: akun.id,
          aksi: "ALUMNI_RESET_PASSWORD_REQUEST",
          entitas: "AlumniAccount",
          entitasId: akun.id,
        });
      });

      publikasiNotifikasi({
        aksi: "ALUMNI_RESET_PASSWORD_REQUEST",
        entitasId: akun.id,
      });
    }
  }

  return ok({ message: PESAN_GENERIK });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
