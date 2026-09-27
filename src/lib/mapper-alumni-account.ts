import type { Prisma } from "@/generated/prisma/client";
import { StatusAlumniAccount } from "@/generated/prisma/enums";

/**
 * Bentuk response akun alumni yang aman dikirim ke pemilik session.
 *
 * Akun `PENDING` hanya menerima data yang ia isi sendiri saat register:
 * belum boleh melihat status keterbukaan maupun data jejaring
 * (master planning §6, BE-Planning §4.1). Status lain (yang tidak boleh login)
 * pun tidak pernah sampai ke sini.
 */
export const alumniAccountSelect = {
  id: true,
  email: true,
  status: true,
  namaLengkapSaatDaftar: true,
  angkatanSaatDaftar: true,
  programStudiSaatDaftar: true,
  consentDataAt: true,
  createdAt: true,
  approvedAt: true,
  lastLoginAt: true,
  openToCollaboration: true,
  openToOpportunity: true,
  showEmailToConnections: true,
  showWhatsappToConnections: true,
  showSocialLinksToConnections: true,
  alumni: {
    select: {
      id: true,
      namaLengkap: true,
      profesi: true,
      angkatan: true,
      programStudi: true,
      fotoUrl: true,
    },
  },
} satisfies Prisma.AlumniAccountSelect;

export type AkunAlumniUntukResponse = Prisma.AlumniAccountGetPayload<{
  select: typeof alumniAccountSelect;
}>;

export type AlumniAccountResponse = {
  id: string;
  email: string;
  status: StatusAlumniAccount;
  namaLengkapSaatDaftar: string;
  angkatanSaatDaftar: number;
  programStudiSaatDaftar: AkunAlumniUntukResponse["programStudiSaatDaftar"];
  createdAt: Date;
  /** Ikhtisar record `Alumni` yang sudah dicocokkan; `null` selama `PENDING`. */
  alumni: AkunAlumniUntukResponse["alumni"];
  openToCollaboration?: boolean;
  openToOpportunity?: boolean;
  showEmailToConnections?: boolean;
  showWhatsappToConnections?: boolean;
  showSocialLinksToConnections?: boolean;
  approvedAt?: Date | null;
  lastLoginAt?: Date | null;
};

export function toAlumniAccountResponse(
  akun: AkunAlumniUntukResponse
): AlumniAccountResponse {
  const dasar: AlumniAccountResponse = {
    id: akun.id,
    email: akun.email,
    status: akun.status,
    namaLengkapSaatDaftar: akun.namaLengkapSaatDaftar,
    angkatanSaatDaftar: akun.angkatanSaatDaftar,
    programStudiSaatDaftar: akun.programStudiSaatDaftar,
    createdAt: akun.createdAt,
    alumni: akun.alumni,
  };

  if (akun.status !== StatusAlumniAccount.ACTIVE) {
    return dasar;
  }

  return {
    ...dasar,
    openToCollaboration: akun.openToCollaboration,
    openToOpportunity: akun.openToOpportunity,
    showEmailToConnections: akun.showEmailToConnections,
    showWhatsappToConnections: akun.showWhatsappToConnections,
    showSocialLinksToConnections: akun.showSocialLinksToConnections,
    approvedAt: akun.approvedAt,
    lastLoginAt: akun.lastLoginAt,
  };
}
