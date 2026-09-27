import { StatusAlumniAccount } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  AlumniUnauthorizedError,
  getAlumniSession,
  requireAlumniSession,
  type AlumniSessionPayload,
} from "@/lib/auth-alumni";

/**
 * Penjaga endpoint privat alumni (BE-Planning §2.2, §7).
 *
 * Token alumni membawa klaim `status` dari saat diterbitkan, jadi klaim itu bisa
 * basi: akun yang di-suspend pengurus masih memegang token `ACTIVE` sampai
 * kedaluwarsa (8 jam). Karena itu status **selalu** dibaca ulang dari database
 * di sini — satu-satunya tempat yang menentukan boleh atau tidaknya mengakses
 * endpoint privat.
 *
 * Dipisah dari `@/lib/auth-alumni` supaya modul itu tetap murni soal tanda tangan
 * dan cookie (tanpa database), dan supaya tidak ada pemanggil yang lupa memakai
 * versi yang memeriksa database.
 */

/** `null` kalau tidak ada session, atau akunnya bukan `ACTIVE`. */
export async function alumniAktif(): Promise<AlumniSessionPayload | null> {
  const sesi = await getAlumniSession();
  if (!sesi) return null;

  const akun = await prisma.alumniAccount.findUnique({
    where: { id: sesi.sub },
    select: { status: true, alumniId: true },
  });

  if (!akun || akun.status !== StatusAlumniAccount.ACTIVE) return null;

  return {
    ...sesi,
    status: StatusAlumniAccount.ACTIVE,
    // `alumniId` diambil dari database, bukan dari klaim token yang bisa basi.
    alumniId: akun.alumniId,
  };
}

/** Pesan per status supaya pemilik akun tahu apa yang terjadi. */
function pesanTidakAktif(status: StatusAlumniAccount): string {
  if (status === StatusAlumniAccount.SUSPENDED) {
    return "Akun ini sedang ditangguhkan. Hubungi pengurus.";
  }
  if (status === StatusAlumniAccount.REJECTED) {
    return "Pendaftaran akun ini tidak disetujui pengurus.";
  }
  return "Akun Anda belum aktif. Selesaikan verifikasi pengurus terlebih dahulu.";
}

export async function requireAlumniAktif(): Promise<AlumniSessionPayload> {
  const sesi = await requireAlumniSession();

  const akun = await prisma.alumniAccount.findUnique({
    where: { id: sesi.sub },
    select: { status: true, alumniId: true },
  });

  if (!akun) {
    throw new AlumniUnauthorizedError("Sesi tidak valid. Silakan login kembali.");
  }

  if (akun.status !== StatusAlumniAccount.ACTIVE) {
    throw new AlumniUnauthorizedError(pesanTidakAktif(akun.status));
  }

  return {
    ...sesi,
    status: StatusAlumniAccount.ACTIVE,
    alumniId: akun.alumniId,
  };
}
