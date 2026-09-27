import { AksiAudit, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { INCLUDE_KONEKSI } from "@/lib/connection";

/**
 * Notifikasi admin (inbox) — sumber tunggal feed.
 *
 * Tidak ada tabel notifikasi baru: `AuditLog` sudah mencatat pendaftaran akun
 * (`ALUMNI_REGISTER`) dan seluruh siklus koneksi (`CONNECTION_*`) lengkap dengan
 * pelakunya. Modul ini memetakan baris-baris itu menjadi item siap tampil, jadi
 * tidak ada jalur tulis ganda yang bisa melenceng dari audit trail.
 *
 * "Belum dibaca" dihitung dari dua hal sekaligus:
 * - `AdminUser.notifikasiDibacaAt` — penanda "semua yang lebih lama dari ini
 *   sudah dibaca" (dipakai tombol *Tandai semua sudah dibaca*);
 * - baris `NotifikasiDibaca` — penanda per item, supaya satu notifikasi bisa
 *   ditandai sendiri tanpa menyeret yang lain. Penanda ini juga per admin, jadi
 *   inbox admin A tidak terpengaruh bacaan admin B.
 *
 * Sebuah notifikasi dianggap **sudah dibaca** bila `createdAt` <= penanda waktu
 * itu, atau punya baris di `NotifikasiDibaca`.
 */

/**
 * Aksi audit yang layak jadi notifikasi admin.
 *
 * Aksi yang dilakukan admin sendiri (`ALUMNI_APPROVE`, `ALUMNI_REJECT`, dst.)
 * sengaja tidak dimasukkan: admin tahu ia baru melakukannya. Untuk memangkas
 * noise (mis. tidak perlu tahu setiap ACCEPT/DECLINE), cukup sunting array ini.
 */
export const AKSI_NOTIFIKASI = [
  "ALUMNI_REGISTER",
  "ALUMNI_RESET_PASSWORD_REQUEST",
  "CONNECTION_CREATE",
  "CONNECTION_ACCEPT",
  "CONNECTION_DECLINE",
  "CONNECTION_CANCEL",
  "CONNECTION_REVOKE",
] as const satisfies readonly AksiAudit[];

export type AksiNotifikasi = (typeof AKSI_NOTIFIKASI)[number];

export type TipeNotifikasi = "PENDAFTARAN" | "KONEKSI" | "AKUN";

export type ItemNotifikasi = {
  /** id baris `AuditLog`. */
  id: string;
  tipe: TipeNotifikasi;
  aksi: AksiAudit;
  judul: string;
  pesan: string;
  /** Halaman yang relevan untuk ditindaklanjuti; `null` kalau tidak ada. */
  href: string | null;
  createdAt: string;
  baru: boolean;
};

const JUDUL: Record<AksiNotifikasi, string> = {
  ALUMNI_REGISTER: "Pendaftaran akun baru",
  ALUMNI_RESET_PASSWORD_REQUEST: "Permintaan reset kata sandi",
  CONNECTION_CREATE: "Permintaan koneksi baru",
  CONNECTION_ACCEPT: "Permintaan koneksi diterima",
  CONNECTION_DECLINE: "Permintaan koneksi ditolak",
  CONNECTION_CANCEL: "Permintaan koneksi dibatalkan",
  CONNECTION_REVOKE: "Koneksi diputus",
};

const AUDIT_SELECT = {
  id: true,
  aksi: true,
  entitasId: true,
  createdAt: true,
  alumniAccount: {
    select: {
      namaLengkapSaatDaftar: true,
      angkatanSaatDaftar: true,
      email: true,
      alumni: { select: { namaLengkap: true } },
    },
  },
} satisfies Prisma.AuditLogSelect;

type BarisAudit = Prisma.AuditLogGetPayload<{ select: typeof AUDIT_SELECT }>;

function namaAkunAudit(baris: BarisAudit): string {
  const akun = baris.alumniAccount;
  if (!akun) return "Alumni";
  return akun.alumni?.namaLengkap ?? akun.namaLengkapSaatDaftar;
}

/**
 * Susun teks tiap jenis notifikasi. Untuk koneksi, nama pengirim/penerima
 * diambil dari record `Connection` (sumber kebenaran siapa berperan apa),
 * bukan dari pelaku audit.
 */
function keItem(
  baris: BarisAudit,
  koneksi: KoneksiRingkas | null,
  batas: Date | null,
  dibacaIndividu: Set<string>
): ItemNotifikasi {
  const baru = !dibacaIndividu.has(baris.id) && (batas === null || baris.createdAt > batas);

  if (baris.aksi === "ALUMNI_REGISTER") {
    const nama = namaAkunAudit(baris);
    const angkatan = baris.alumniAccount?.angkatanSaatDaftar;
    return {
      id: baris.id,
      tipe: "PENDAFTARAN",
      aksi: baris.aksi,
      judul: JUDUL.ALUMNI_REGISTER,
      pesan: angkatan
        ? `${nama} (angkatan ${angkatan}) menunggu verifikasi pengurus.`
        : `${nama} menunggu verifikasi pengurus.`,
      href: "/admin/alumni-accounts",
      createdAt: baris.createdAt.toISOString(),
      baru,
    };
  }

  if (baris.aksi === "ALUMNI_RESET_PASSWORD_REQUEST") {
    const nama = namaAkunAudit(baris);
    const email = baris.alumniAccount?.email;
    return {
      id: baris.id,
      tipe: "AKUN",
      aksi: baris.aksi,
      judul: JUDUL.ALUMNI_RESET_PASSWORD_REQUEST,
      pesan: email
        ? `${nama} (${email}) meminta reset kata sandi. Buka verifikasi akun, reset, lalu sampaikan kata sandi baru lewat kanal resmi.`
        : `${nama} meminta reset kata sandi.`,
      href: "/admin/alumni-accounts",
      createdAt: baris.createdAt.toISOString(),
      baru,
    };
  }

  const judul = JUDUL[baris.aksi as AksiNotifikasi] ?? "Aktivitas koneksi";

  if (!koneksi) {
    return {
      id: baris.id,
      tipe: "KONEKSI",
      aksi: baris.aksi,
      judul,
      pesan: `${namaAkunAudit(baris)} — data koneksi tidak lagi tersedia.`,
      href: null,
      createdAt: baris.createdAt.toISOString(),
      baru,
    };
  }

  const pengirim = koneksi.requesterName;
  const penerima = koneksi.recipientName;

  let pesan: string;
  switch (baris.aksi) {
    case "CONNECTION_CREATE":
      pesan = `${pengirim} mengirim permintaan koneksi kepada ${penerima}.`;
      break;
    case "CONNECTION_ACCEPT":
      pesan = `${penerima} menerima permintaan koneksi dari ${pengirim}.`;
      break;
    case "CONNECTION_DECLINE":
      pesan = `${penerima} menolak permintaan koneksi dari ${pengirim}.`;
      break;
    case "CONNECTION_CANCEL":
      pesan = `${pengirim} membatalkan permintaan koneksi kepada ${penerima}.`;
      break;
    case "CONNECTION_REVOKE":
      pesan = `Koneksi antara ${pengirim} dan ${penerima} diputus.`;
      break;
    default:
      pesan = `${pengirim} — ${judul.toLowerCase()}.`;
  }

  return {
    id: baris.id,
    tipe: "KONEKSI",
    aksi: baris.aksi,
    judul,
    pesan,
    href: null,
    createdAt: baris.createdAt.toISOString(),
    baru,
  };
}

type KoneksiRingkas = {
  requesterName: string;
  recipientName: string;
};

/** Aksi yang termasuk satu tipe; `undefined` berarti semua tipe. */
function aksiUntukTipe(tipe?: TipeNotifikasi): AksiAudit[] {
  if (tipe === "PENDAFTARAN") return ["ALUMNI_REGISTER"];
  if (tipe === "AKUN") return ["ALUMNI_RESET_PASSWORD_REQUEST"];
  if (tipe === "KONEKSI") {
    return AKSI_NOTIFIKASI.filter((aksi) => aksi.startsWith("CONNECTION_"));
  }
  return [...AKSI_NOTIFIKASI];
}

function whereNotifikasi(tipe?: TipeNotifikasi): Prisma.AuditLogWhereInput {
  return { aksi: { in: aksiUntukTipe(tipe) } };
}

async function batasDibaca(adminId: string): Promise<Date | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { notifikasiDibacaAt: true },
  });
  return admin?.notifikasiDibacaAt ?? null;
}

/** Badge selalu menghitung **semua** tipe, bukan hasil filter halaman. */
export async function hitungBelumDibaca(adminId: string): Promise<number> {
  const batas = await batasDibaca(adminId);
  return prisma.auditLog.count({
    where: {
      ...whereNotifikasi(),
      createdAt: { gt: batas ?? new Date(0) },
      // Yang sudah ditandai dibaca satu per satu tidak ikut dihitung.
      dibacaOleh: { none: { adminId } },
    },
  });
}

/**
 * Tandai satu notifikasi sudah dibaca oleh admin ini.
 *
 * Mengembalikan jumlah yang benar-benar berubah (0 bila notifikasi itu sudah
 * terbaca lewat penanda waktu, atau memang sudah ditandai) supaya pemanggil bisa
 * membedakan "berhasil" dari "tidak ada yang perlu diubah".
 */
export async function tandaiSatuNotifikasiDibaca(
  adminId: string,
  auditLogId: string
): Promise<{ ada: boolean; berubah: number }> {
  const baris = await prisma.auditLog.findFirst({
    where: { id: auditLogId, ...whereNotifikasi() },
    select: { id: true, createdAt: true },
  });

  if (!baris) {
    return { ada: false, berubah: 0 };
  }

  const batas = await batasDibaca(adminId);

  // Sudah tercakup penanda waktu: tidak perlu baris baru.
  if (batas !== null && baris.createdAt <= batas) {
    return { ada: true, berubah: 0 };
  }

  const hasil = await prisma.notifikasiDibaca.createMany({
    data: [{ adminId, auditLogId }],
    skipDuplicates: true,
  });

  return { ada: true, berubah: hasil.count };
}

/**
 * Tandai semua notifikasi sudah dibaca (per admin).
 *
 * Cukup menggeser satu penanda waktu, bukan menulis satu baris per notifikasi.
 * Penanda per item yang jadi usang (lebih lama dari penanda waktu) dibersihkan
 * sekalian supaya tabelnya tidak tumbuh tanpa batas.
 */
export async function tandaiSemuaNotifikasiDibaca(
  adminId: string
): Promise<Date> {
  const sekarang = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id: adminId },
      data: { notifikasiDibacaAt: sekarang },
    });

    await tx.notifikasiDibaca.deleteMany({
      where: { adminId, auditLog: { createdAt: { lte: sekarang } } },
    });
  });

  return sekarang;
}

export async function ambilNotifikasiAdmin(
  adminId: string,
  opsi: { skip: number; take: number; tipe?: TipeNotifikasi }
): Promise<{ items: ItemNotifikasi[]; total: number; belumDibaca: number }> {
  const batas = await batasDibaca(adminId);
  const where = whereNotifikasi(opsi.tipe);

  const [rows, total, belumDibaca] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: opsi.skip,
      take: opsi.take,
      select: AUDIT_SELECT,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({
      where: {
        ...whereNotifikasi(),
        createdAt: { gt: batas ?? new Date(0) },
        dibacaOleh: { none: { adminId } },
      },
    }),
  ]);

  /*
   * `AuditLog.entitasId` bukan foreign key, jadi koneksi diambil lewat kueri
   * kedua berbasis `id IN (...)` — bukan `include`. Hanya halaman ini yang
   * diambil supaya jumlah query tetap konstan.
   */
  const idKoneksi = rows
    .filter((row) => row.aksi.startsWith("CONNECTION_"))
    .map((row) => row.entitasId);

  const koneksi =
    idKoneksi.length > 0
      ? await prisma.connection.findMany({
          where: { id: { in: idKoneksi } },
          include: INCLUDE_KONEKSI,
        })
      : [];

  const petaKoneksi = new Map<string, KoneksiRingkas>(
    koneksi.map((k) => [
      k.id,
      {
        requesterName: k.requester.alumni?.namaLengkap ?? "Alumni",
        recipientName: k.recipient.alumni?.namaLengkap ?? "Alumni",
      },
    ])
  );

  /*
   * Penanda baca per item hanya diambil untuk baris di halaman ini (bukan
   * seluruh tabel), jadi jumlah query tetap konstan seperti pengambilan
   * koneksi di bawah.
   */
  const idBaris = rows.map((row) => row.id);
  const barisDibaca =
    idBaris.length > 0
      ? await prisma.notifikasiDibaca.findMany({
          where: { adminId, auditLogId: { in: idBaris } },
          select: { auditLogId: true },
        })
      : [];

  const dibacaIndividu = new Set(barisDibaca.map((b) => b.auditLogId));

  const items = rows.map((row) =>
    keItem(row, petaKoneksi.get(row.entitasId) ?? null, batas, dibacaIndividu)
  );

  return { items, total, belumDibaca };
}
