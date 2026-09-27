import { Prisma, StatusAlumniAccount } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { alumniAktif } from "@/lib/sesi-alumni";
import { toPublicAlumni } from "@/lib/mapper-public";
import type {
  PublicAlumniDirektoriAktif,
  PublicAlumniDirektoriAnonim,
} from "@/lib/types";
import { statusKoneksiUntuk, type StatusKoneksi } from "@/lib/connection";

/**
 * Direktori alumni yang sadar session (BE-Planning §4.3).
 *
 * Anonymous hanya menerima field publik — tanpa nilai keterbukaan dan tanpa
 * kontak. Alumni `ACTIVE` mendapat tambahan nilai keterbukaan dan status
 * koneksinya terhadap tiap kartu.
 *
 * Bentuk response-nya didefinisikan di `@/lib/types` supaya FE memakai tipe yang
 * sama dengan yang dibentuk di sini, bukan menyalinnya.
 */

export type AlumniDirektoriSumber = Prisma.AlumniGetPayload<{
  include: {
    sektorIndustri: true;
    account: {
      select: {
        status: true;
        openToCollaboration: true;
        openToOpportunity: true;
      };
    };
  };
}>;

export type AlumniDirektoriAnonim = PublicAlumniDirektoriAnonim;
export type AlumniDirektoriAktif = PublicAlumniDirektoriAktif;

export function keDirektoriAnonim(
  alumni: AlumniDirektoriSumber
): AlumniDirektoriAnonim {
  /*
   * `openStatusLocked` bukan hiasan: nilainya penanda bahwa server **tidak
   * mengirim** status keterbukaan, supaya FE tidak perlu menebak dari absennya
   * field. Data aslinya tidak pernah sampai ke browser anonymous.
   */
  return { ...toPublicAlumni(alumni), openStatusLocked: true };
}

export function keDirektoriAktif(
  alumni: AlumniDirektoriSumber,
  connectionStatus: StatusKoneksi
): AlumniDirektoriAktif {
  const akun = alumni.account;
  const akunAktif = akun?.status === StatusAlumniAccount.ACTIVE;

  return {
    ...toPublicAlumni(alumni),
    // Keterbukaan hanya ditampilkan untuk akun yang benar-benar aktif;
    // akun pending/suspend tidak boleh "mengiklankan" statusnya.
    openToCollaboration: akunAktif ? akun.openToCollaboration : false,
    openToOpportunity: akunAktif ? akun.openToOpportunity : false,
    connectionStatus,
    /*
     * Penanda ini yang membedakan "belum mengatur keterbukaan" (punya akun,
     * tetap bisa dihubungi) dari "belum punya akun jejaring" (permintaan pasti
     * ditolak server).
     */
    bisaDihubungi: akunAktif,
  };
}

/** Pengunjung yang boleh melihat nilai keterbukaan: session valid + akun `ACTIVE`. */
export type PengunjungAktif = {
  accountId: string;
  alumniId: string;
};

/**
 * Pengunjung yang boleh melihat nilai keterbukaan.
 *
 * Memakai penjaga yang sama dengan endpoint privat (`alumniAktif`), jadi
 * statusnya selalu dari database: suspend yang terjadi setelah login langsung
 * menutup akses, dan akun yang baru di-approve langsung bisa melihat
 * keterbukaan tanpa login ulang.
 */
export async function ambilPengunjungAktif(): Promise<PengunjungAktif | null> {
  const sesi = await alumniAktif();
  if (!sesi || !sesi.alumniId) return null;

  return { accountId: sesi.sub, alumniId: sesi.alumniId };
}

/**
 * Hitung status koneksi untuk satu halaman direktori dengan **dua** query
 * (bukan satu per kartu):
 *
 * 1. `alumniId` halaman ini → `AlumniAccount.id`.
 * 2. satu `findMany` koneksi untuk semua pasangan tersebut.
 *
 * Hasilnya dipetakan kembali per `alumniId`.
 */
export async function ambilStatusKoneksi(
  sayaAccountId: string,
  alumniIds: string[]
): Promise<Map<string, StatusKoneksi>> {
  const hasil = new Map<string, StatusKoneksi>();
  if (alumniIds.length === 0) return hasil;

  const akunHalaman = await prisma.alumniAccount.findMany({
    where: { alumniId: { in: alumniIds } },
    select: { id: true, alumniId: true },
  });

  const petaAlumniKeAkun = new Map<string, string>();
  for (const akun of akunHalaman) {
    if (akun.alumniId) {
      petaAlumniKeAkun.set(akun.alumniId, akun.id);
    }
  }

  if (petaAlumniKeAkun.size === 0) return hasil;

  const idAkunHalaman = [...petaAlumniKeAkun.values()];

  const koneksi = await prisma.connection.findMany({
    where: {
      OR: [
        {
          requesterAccountId: sayaAccountId,
          recipientAccountId: { in: idAkunHalaman },
        },
        {
          recipientAccountId: sayaAccountId,
          requesterAccountId: { in: idAkunHalaman },
        },
      ],
    },
    select: {
      requesterAccountId: true,
      recipientAccountId: true,
      status: true,
    },
  });

  const petaStatus = new Map<string, StatusKoneksi>();
  for (const baris of koneksi) {
    const lawan =
      baris.requesterAccountId === sayaAccountId
        ? baris.recipientAccountId
        : baris.requesterAccountId;
    petaStatus.set(lawan, statusKoneksiUntuk(baris, sayaAccountId));
  }

  for (const [alumniId, accountId] of petaAlumniKeAkun) {
    hasil.set(
      alumniId,
      accountId === sayaAccountId
        ? "SELF"
        : petaStatus.get(accountId) ?? "NONE"
    );
  }

  return hasil;
}
