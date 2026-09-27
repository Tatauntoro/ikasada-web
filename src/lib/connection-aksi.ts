import { StatusConnection } from "@/generated/prisma/client";
import { AksiAudit } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { conflict, notFound, ok } from "@/lib/response";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { publikasiNotifikasi } from "@/lib/notifikasi-events";
import {
  INCLUDE_KONEKSI,
  statusKoneksiUntuk,
  toItemKoneksi,
} from "@/lib/connection";

/**
 * Transisi status koneksi (BE-Planning §2.3, §4.4, §6).
 *
 * Satu tempat untuk aturan "siapa boleh melakukan apa": accept dan decline hanya
 * oleh **recipient**, cancel hanya oleh **requester**, sedangkan memutuskan
 * koneksi (`REVOKE`, Task 20) boleh oleh **kedua pihak**. Tiap aksi menentukan
 * status awal yang sah — `PENDING` untuk tiga aksi pertama, `ACCEPTED` untuk
 * `REVOKE` — dan `ACCEPTED` tidak pernah kembali menjadi `PENDING`.
 */

export type AksiKoneksi = "ACCEPT" | "DECLINE" | "CANCEL" | "REVOKE";

type AturanAksi = {
  peran: "requester" | "recipient" | "keduanya";
  aksiAudit: AksiAudit;
  statusAwal: StatusConnection;
  statusBaru: StatusConnection;
};

export const ATURAN_AKSI: Record<AksiKoneksi, AturanAksi> = {
  ACCEPT: {
    peran: "recipient",
    aksiAudit: AksiAudit.CONNECTION_ACCEPT,
    statusAwal: StatusConnection.PENDING,
    statusBaru: StatusConnection.ACCEPTED,
  },
  DECLINE: {
    peran: "recipient",
    aksiAudit: AksiAudit.CONNECTION_DECLINE,
    statusAwal: StatusConnection.PENDING,
    statusBaru: StatusConnection.DECLINED,
  },
  CANCEL: {
    peran: "requester",
    aksiAudit: AksiAudit.CONNECTION_CANCEL,
    statusAwal: StatusConnection.PENDING,
    statusBaru: StatusConnection.CANCELED,
  },
  REVOKE: {
    peran: "keduanya",
    aksiAudit: AksiAudit.CONNECTION_REVOKE,
    statusAwal: StatusConnection.ACCEPTED,
    statusBaru: StatusConnection.REVOKED,
  },
};

export async function jalankanAksiKoneksi(
  aksi: AksiKoneksi,
  connectionId: string,
  sayaAccountId: string
): Promise<Response> {
  const aturan = ATURAN_AKSI[aksi];

  const koneksi = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      status: true,
      requesterAccountId: true,
      recipientAccountId: true,
    },
  });

  /*
   * `404` dipakai untuk "tidak ada" **dan** "bukan milik Anda". Bedanya tidak
   * dibocorkan supaya endpoint ini tidak bisa dipakai menebak id koneksi orang
   * lain (IDOR): pemanggil hanya tahu koneksi yang memang menjadi haknya.
   */
  if (!koneksi) {
    return notFound("Koneksi tidak ditemukan");
  }

  const peranSaya =
    koneksi.requesterAccountId === sayaAccountId
      ? "requester"
      : koneksi.recipientAccountId === sayaAccountId
        ? "recipient"
        : null;

  const peranCocok =
    aturan.peran === "keduanya" ? peranSaya !== null : peranSaya === aturan.peran;

  if (!peranCocok) {
    return notFound("Koneksi tidak ditemukan");
  }

  const hasil = await prisma.$transaction(async (tx) => {
    /*
     * `updateMany` dengan syarat status membuat transisinya atomik: kalau pihak
     * lain sudah mengubah barisnya lebih dulu, `count` nol dan kita tidak
     * menimpa keputusan yang sudah terjadi.
     */
    const jumlah = await tx.connection.updateMany({
      where: { id: koneksi.id, status: aturan.statusAwal },
      data: {
        status: aturan.statusBaru,
        respondedAt: new Date(),
        /*
         * Hanya pemutusan yang mencatat pelakunya: itulah yang menentukan siapa
         * yang perlu diberi tahu (pihak lain) dan siapa yang tidak (pelakunya
         * sendiri). Aksi lain tidak menyentuh kolom ini.
         */
        ...(aksi === "REVOKE" ? { revokedByAccountId: sayaAccountId } : {}),
      },
    });

    if (jumlah.count === 0) {
      const terbaru = await tx.connection.findUnique({
        where: { id: koneksi.id },
        select: { status: true, requesterAccountId: true },
      });

      return {
        race: terbaru ? statusKoneksiUntuk(terbaru, sayaAccountId) : "NONE",
      };
    }

    const diperbarui = await tx.connection.findUniqueOrThrow({
      where: { id: koneksi.id },
      include: INCLUDE_KONEKSI,
    });

    await catatAudit(tx, {
      alumniAccountId: sayaAccountId,
      aksi: aturan.aksiAudit,
      entitas: "Connection",
      entitasId: koneksi.id,
      detailPerubahan: diffPerubahan(
        { status: koneksi.status },
        { status: diperbarui.status }
      ),
    });

    return { race: null, item: toItemKoneksi(diperbarui, sayaAccountId) };
  });

  if (hasil.race) {
    return conflict("Status koneksi ini sudah berubah. Muat ulang daftar.", {
      // Status terkini, supaya FE tidak perlu menebak (lihat catatan Task 8).
      connectionStatus: hasil.race,
    });
  }

  /*
   * Ping realtime untuk inbox admin — di luar transaksi, setelah commit.
   * Persistennya tetap baris AuditLog dari `catatAudit` di atas.
   */
  publikasiNotifikasi({ aksi: aturan.aksiAudit, entitasId: koneksi.id });

  return ok(hasil.item);
}
