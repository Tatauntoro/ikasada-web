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
import { requireAdminAktif } from "@/lib/sesi-admin";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { ubahSandiSchema } from "@/lib/validations/ubah-sandi";
import { ambilIpKlien, catatPercobaan, cekRateLimit } from "@/lib/rate-limit";
import { bukaBlokirLoginAdmin } from "@/lib/rate-limit-admin";

/**
 * Ganti kata sandi admin sendiri (self-service).
 *
 * Berbeda dari reset oleh superadmin, endpoint ini **mewajibkan kata sandi
 * lama** untuk mencegah pengambilalihan akun lewat sesi yang bocor. Rate limit
 * memakai `AuthRateLimit` (scope terpisah dari login) supaya kata sandi lama
 * tidak bisa ditebak berulang.
 */
const BCRYPT_ROUNDS = 10;
const JENDELA_MS = 15 * 60 * 1000;
const MAKS_PER_AKUN = 5;
const MAKS_PER_IP = 20;

async function handler(req: NextRequest): Promise<Response> {
  const sesi = await requireAdminAktif();

  const body = await readJsonBody(req);
  const parsed = ubahSandiSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const { sandiLama, sandiBaru } = parsed.data;

  const opsiAkun = {
    scope: "admin_ganti_sandi_akun",
    key: sesi.sub,
    maxAttempts: MAKS_PER_AKUN,
    windowMs: JENDELA_MS,
  };
  const opsiIp = {
    scope: "admin_ganti_sandi_ip",
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

  const admin = await prisma.adminUser.findUnique({
    where: { id: sesi.sub },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!admin) {
    return unauthorized("Sesi tidak valid. Silakan login kembali.");
  }

  const cocok = await compare(sandiLama, admin.passwordHash);
  if (!cocok) {
    await Promise.all([catatPercobaan(opsiAkun), catatPercobaan(opsiIp)]);
    return badRequest("Kata sandi lama salah", {
      sandiLama: "Kata sandi lama salah",
    });
  }

  const passwordHash = await hash(sandiBaru, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    await catatAudit(tx, {
      adminId: sesi.sub,
      aksi: "ADMIN_UPDATE",
      entitas: "AdminUser",
      entitasId: admin.id,
      detailPerubahan: diffPerubahan(
        { passwordHash: "[lama]" },
        { passwordHash: "[baru]" }
      ),
    });
  });

  // Kata sandi sudah diganti: buka blokir login akun ini supaya pemiliknya
  // tidak tertahan oleh percobaan gagal sebelumnya.
  await bukaBlokirLoginAdmin(admin.email);

  return ok({ message: "Kata sandi berhasil diubah." });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
