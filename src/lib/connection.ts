import { Prisma, StatusConnection } from "@/generated/prisma/client";

/**
 * Bagian bersama fitur koneksi (BE-Planning §2.3, §4.4).
 *
 * Di sini saja definisi `StatusKoneksi`, `pairKey`, bentuk item untuk FE, dan
 * aturan siapa yang berhak melakukan apa — dipakai endpoint koneksi sekaligus
 * direktori (Task 7) supaya kedua tempat tidak pernah berbeda tafsir.
 */

export type StatusKoneksi =
  | "NONE"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | "ACCEPTED"
  | "SELF";

/**
 * Pasangan id yang diurutkan deterministik. Sama di kedua arah, jadi unique
 * constraint pada `pairKey` menutup duplikat arah sama maupun arah balik.
 */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/**
 * Status dari sudut pandang satu akun. `DECLINED`, `CANCELED`, dan `REVOKED`
 * (Task 20) sama-sama dianggap belum terhubung, jadi kartunya menawarkan
 * "Hubungkan" lagi — barisnya dihidupkan ulang oleh create, bukan dibuat baru,
 * karena `pairKey` unik.
 */
export function statusKoneksiUntuk(
  koneksi: { requesterAccountId: string; status: StatusConnection },
  sayaAccountId: string
): StatusKoneksi {
  if (koneksi.status === StatusConnection.ACCEPTED) return "ACCEPTED";

  if (koneksi.status === StatusConnection.PENDING) {
    return koneksi.requesterAccountId === sayaAccountId
      ? "PENDING_SENT"
      : "PENDING_RECEIVED";
  }

  return "NONE";
}

/**
 * Field lawan bicara untuk halaman Jejaring. Kontak ikut di-select karena
 * dibutuhkan untuk koneksi `ACCEPTED`, tetapi hanya diteruskan ke response kalau
 * consent orang yang bersangkutan menyala (lihat `toItemKoneksi`).
 */
export const AKUN_KONEKSI_SELECT = {
  id: true,
  alumniId: true,
  showEmailToConnections: true,
  showWhatsappToConnections: true,
  showSocialLinksToConnections: true,
  alumni: {
    select: {
      id: true,
      namaLengkap: true,
      gelar: true,
      fotoUrl: true,
      profesi: true,
      angkatan: true,
      programStudi: true,
      instansi: true,
      email: true,
      noWhatsapp: true,
      linkInstagram: true,
      linkSosmedLain: true,
    },
  },
} satisfies Prisma.AlumniAccountSelect;

export type ConnectionDenganAkun = Prisma.ConnectionGetPayload<{
  include: {
    requester: { select: typeof AKUN_KONEKSI_SELECT };
    recipient: { select: typeof AKUN_KONEKSI_SELECT };
  };
}>;

/** Include bersama supaya setiap response koneksi punya bentuk yang sama. */
export const INCLUDE_KONEKSI = {
  requester: { select: AKUN_KONEKSI_SELECT },
  recipient: { select: AKUN_KONEKSI_SELECT },
} satisfies Prisma.ConnectionInclude;

export type LawanBicara = {
  alumniId: string | null;
  namaLengkap: string | null;
  gelar: string | null;
  fotoUrl: string | null;
  profesi: string | null;
  angkatan: number | null;
  programStudi: string | null;
  instansi: string | null;
  /** Hanya ada bila koneksi `ACCEPTED` dan orangnya mengizinkan field ini. */
  email?: string;
  noWhatsapp?: string;
  linkInstagram?: string;
  linkSosmedLain?: unknown;
};

export type ItemKoneksi = {
  id: string;
  status: StatusConnection;
  message: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  counterpart: LawanBicara;
};

/**
 * Bentuk satu baris koneksi untuk FE.
 *
 * Aturan kontak (master planning §7): hanya `ACCEPTED` yang membuka kontak, dan
 * hanya field yang pemiliknya izinkan (`show*ToConnections`). Field yang tidak
 * diizinkan **tidak ada** di response — bukan `null` — supaya tidak ada sinyal
 * apa pun yang bisa dibaca client.
 */
export function toItemKoneksi(
  koneksi: ConnectionDenganAkun,
  sayaAccountId: string
): ItemKoneksi {
  const lawan =
    koneksi.requesterAccountId === sayaAccountId
      ? koneksi.recipient
      : koneksi.requester;

  const alumni = lawan.alumni;

  const counterpart: LawanBicara = {
    alumniId: alumni?.id ?? null,
    namaLengkap: alumni?.namaLengkap ?? null,
    gelar: alumni?.gelar ?? null,
    fotoUrl: alumni?.fotoUrl ?? null,
    profesi: alumni?.profesi ?? null,
    angkatan: alumni?.angkatan ?? null,
    programStudi: alumni?.programStudi ?? null,
    instansi: alumni?.instansi ?? null,
  };

  if (koneksi.status === StatusConnection.ACCEPTED) {
    if (lawan.showEmailToConnections && alumni?.email) {
      counterpart.email = alumni.email;
    }
    if (lawan.showWhatsappToConnections && alumni?.noWhatsapp) {
      counterpart.noWhatsapp = alumni.noWhatsapp;
    }
    if (lawan.showSocialLinksToConnections) {
      if (alumni?.linkInstagram) counterpart.linkInstagram = alumni.linkInstagram;
      if (alumni?.linkSosmedLain) counterpart.linkSosmedLain = alumni.linkSosmedLain;
    }
  }

  return {
    id: koneksi.id,
    status: koneksi.status,
    message: koneksi.message,
    createdAt: koneksi.createdAt,
    respondedAt: koneksi.respondedAt,
    counterpart,
  };
}
