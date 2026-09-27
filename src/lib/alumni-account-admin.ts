import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Field akun alumni yang boleh dilihat pengurus (BE-Planning §4.5).
 *
 * `passwordHash` tidak pernah ikut — bahkan untuk admin. Field waktu
 * (`approvedAt`, `rejectedAt`, `suspendedAt`, `lastLoginAt`) dipakai admin untuk
 * memastikan riwayat verifikasi.
 */
export const alumniAccountAdminSelect = {
  id: true,
  email: true,
  status: true,
  namaLengkapSaatDaftar: true,
  angkatanSaatDaftar: true,
  programStudiSaatDaftar: true,
  consentDataAt: true,
  createdAt: true,
  approvedAt: true,
  rejectedAt: true,
  suspendedAt: true,
  lastLoginAt: true,
  alumni: {
    select: {
      id: true,
      namaLengkap: true,
      angkatan: true,
      programStudi: true,
      status: true,
      // Dipakai dialog approve untuk membandingkan email akun vs email direktori.
      email: true,
    },
  },
} satisfies Prisma.AlumniAccountSelect;

export type AkunAlumniAdmin = Prisma.AlumniAccountGetPayload<{
  select: typeof alumniAccountAdminSelect;
}>;

/** Dipakai keempat endpoint aksi admin: akun tidak ada berarti `404`. */
export async function ambilAkunAlumni(
  id: string
): Promise<AkunAlumniAdmin | null> {
  return prisma.alumniAccount.findUnique({
    where: { id },
    select: alumniAccountAdminSelect,
  });
}
