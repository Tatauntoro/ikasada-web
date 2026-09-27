import { prisma } from "@/lib/db";

/**
 * Angka notifikasi jejaring satu alumni — dasar badge di navbar dan shell ruang
 * alumni, sekaligus `meta` pada `GET /api/alumni/connections`.
 *
 * Ada dua arah yang perlu diberi tahu, dan keduanya tidak bisa disimpulkan dari
 * satu kolom:
 * - `unread`         — permintaan **masuk** yang belum dibuka penerima
 *                      (`readAt`: milik penerima, Task 21).
 * - `unreadDiterima` — jawaban **diterima** yang belum dilihat pengirim
 *                      (`readRespondedAt`: milik pengirim).
 * - `unreadDitolak`  — jawaban **ditolak** yang belum dilihat pengirim.
 *
 * Dipisah per jenis karena tiap tab di halaman jejaring menampilkan satu
 * kelompok: membuka tab "Terhubung" hanya boleh menghapus angka diterima, dan
 * tab "Permintaan Terkirim" hanya menghapus angka ditolak.
 *
 * Kueri memakai index yang sudah ada (`[recipientAccountId, status, createdAt]`
 * dan `[requesterAccountId, status, createdAt]`), jadi cukup murah untuk
 * dipanggil berkala oleh kanal SSE.
 */
export type HitunganJejaring = {
  unread: number;
  unreadDiterima: number;
  unreadDitolak: number;
  unreadDiputus: number;
};

export async function hitungJejaring(
  accountId: string
): Promise<HitunganJejaring> {
  const [unread, unreadDiterima, unreadDitolak, unreadDiputus] =
    await prisma.$transaction([
      prisma.connection.count({
        where: {
          recipientAccountId: accountId,
          status: "PENDING",
          readAt: null,
        },
      }),
      prisma.connection.count({
        where: {
          requesterAccountId: accountId,
          status: "ACCEPTED",
          readRespondedAt: null,
        },
      }),
      prisma.connection.count({
        where: {
          requesterAccountId: accountId,
          status: "DECLINED",
          readRespondedAt: null,
        },
      }),
      /*
       * Pemutusan koneksi: hanya pihak yang **tidak** memutus yang perlu tahu,
       * jadi baris yang ia putus sendiri tidak dihitung (ia sudah tahu).
       */
      prisma.connection.count({
        where: {
          status: "REVOKED",
          revokedByAccountId: { not: accountId },
          readRevokedAt: null,
          OR: [
            { requesterAccountId: accountId },
            { recipientAccountId: accountId },
          ],
        },
      }),
    ]);

  return { unread, unreadDiterima, unreadDitolak, unreadDiputus };
}
