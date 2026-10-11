import { compare, hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  badRequest,
  ok,
  tooManyRequests,
  unauthorized,
  validationError,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requireAlumniSession } from "@/lib/auth-alumni";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { ubahSandiSchema } from "@/lib/validations/ubah-sandi";
import { ambilIpKlien, catatPercobaan, cekRateLimit } from "@/lib/rate-limit";

/**
 * Ganti kata sandi alumni sendiri (self-service).
 *
 * `requireAlumniSession()` (bukan `requireAlumniAktif`) dipakai supaya akun
 * `PENDING` pun bisa mengganti kata sandi pendaftarannya — fitur ini soal
 * keamanan akun, bukan fitur jejaring. Wajib kata sandi lama, dengan rate limit
 * terpisah dari login.
 */
const BCRYPT_ROUNDS = 10;
const JENDELA_MS = 15 * 60 * 1000;
const MAKS_PER_AKUN = 5;
const MAKS_PER_IP = 20;

async function handler(req: NextRequest): Promise<Response> {
  const sesi = await requireAlumniSession();

  const body = await readJsonBody(req);
  const parsed = ubahSandiSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const { sandiLama, sandiBaru } = parsed.data;

  const opsiAkun = {
    scope: "alumni_ganti_sandi_akun",
    key: sesi.sub,
    maxAttempts: MAKS_PER_AKUN,
    windowMs: JENDELA_MS,
  };
  const opsiIp = {
    scope: "alumni_ganti_sandi_ip",
    key: ambilIpKlien(req),
    maxAttempts: MAKS_PER_IP,
    windowMs: JENDELA_MS,
  };

  const [cekAkun, cekIp] = await Promise.all([
    cekRateLimit(opsiAkun),
    cekRateLimit(opsiIp),
  ]);
  if (cekAkun.blocked || cekIp.blocked) {
    return tooManyRequests(
      "Terlalu banyak percobaan. Silakan coba lagi setelah 15 menit."
    );
  }

  const akun = await prisma.alumniAccount.findUnique({
    where: { id: sesi.sub },
    select: { id: true, passwordHash: true },
  });
  if (!akun) {
    return unauthorized("Sesi tidak valid. Silakan login kembali.");
  }

  const cocok = await compare(sandiLama, akun.passwordHash);
  if (!cocok) {
    await Promise.all([catatPercobaan(opsiAkun), catatPercobaan(opsiIp)]);
    return badRequest("Kata sandi lama salah", {
      sandiLama: "Kata sandi lama salah",
    });
  }

  const passwordHash = await hash(sandiBaru, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.alumniAccount.update({
      where: { id: akun.id },
      data: { passwordHash },
    });

    await catatAudit(tx, {
      alumniAccountId: akun.id,
      // `AksiAudit` belum punya nilai khusus ubah sandi; dipakai `UPDATE`
      // generik dengan diff yang sama (pola yang dipakai profil alumni).
      aksi: "UPDATE",
      entitas: "AlumniAccount",
      entitasId: akun.id,
      detailPerubahan: diffPerubahan(
        { passwordHash: "[lama]" },
        { passwordHash: "[baru]" }
      ),
    });
  });

  return ok({ message: "Kata sandi berhasil diubah." });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
