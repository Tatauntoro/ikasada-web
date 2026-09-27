import { NextRequest } from "next/server";
import { StatusConnection } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, ok } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requireAlumniAktif } from "@/lib/sesi-alumni";
import { hitungJejaring } from "@/lib/permintaan-masuk";

/**
 * Tandai satu kelompok notifikasi jejaring sebagai sudah dibaca.
 *
 * Halaman jejaring memanggilnya begitu sebuah tab benar-benar tampil. Dipisah
 * dari `GET` daftar dengan sengaja: `GET` tidak boleh mengubah data, dan
 * pemanggil lain (skrip, alat debug) tidak boleh tanpa sadar menghapus penanda
 * belum dibaca milik user.
 *
 * `?jenis=` sejalan dengan **tab**, bukan jenis baris, supaya satu tab
 * membersihkan tepat apa yang ia tampilkan dan angka di tab lain tidak ikut
 * hilang:
 * - `masuk`     — permintaan masuk (`readAt` milik penerima);
 * - `terkirim`  — jawaban ditolak atas permintaan kita (`readRespondedAt`);
 * - `terhubung` — koneksi baru yang belum dilihat (`readRespondedAt` untuk
 *                 `ACCEPTED`) **dan** koneksi yang diputus pihak lain
 *                 (`readRevokedAt`), karena keduanya tampil di tab ini.
 *
 * Idempoten (panggilan kedua mengembalikan hitungan nol) dan **tidak menulis
 * audit**: membaca bukan peristiwa bisnis, dan mencatatnya hanya akan membanjiri
 * `audit_log` yang dipakai untuk jejak perubahan data. Hanya baris yang memang
 * menunggu dibaca yang tersentuh, jadi keputusan yang sudah diambil
 * (accept/decline/cancel/revoke) tidak ikut berubah.
 *
 * Response mengembalikan hitungan terbaru supaya badge bisa disinkronkan tanpa
 * permintaan tambahan.
 */
const JENIS = ["masuk", "terkirim", "terhubung"] as const;
type Jenis = (typeof JENIS)[number];

async function handler(req: NextRequest): Promise<Response> {
  const saya = await requireAlumniAktif();

  const jenisParam = req.nextUrl.searchParams.get("jenis") ?? "masuk";
  if (!(JENIS as readonly string[]).includes(jenisParam)) {
    return badRequest("Jenis notifikasi tidak dikenal", {
      jenis: `Gunakan salah satu dari: ${JENIS.join(", ")}`,
    });
  }
  const jenis = jenisParam as Jenis;

  let jumlah = 0;

  if (jenis === "masuk") {
    const hasil = await prisma.connection.updateMany({
      where: {
        recipientAccountId: saya.sub,
        status: StatusConnection.PENDING,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    jumlah = hasil.count;
  }

  if (jenis === "terkirim") {
    const hasil = await prisma.connection.updateMany({
      where: {
        requesterAccountId: saya.sub,
        status: StatusConnection.DECLINED,
        readRespondedAt: null,
      },
      data: { readRespondedAt: new Date() },
    });
    jumlah = hasil.count;
  }

  if (jenis === "terhubung") {
    const dijawab = await prisma.connection.updateMany({
      where: {
        requesterAccountId: saya.sub,
        status: StatusConnection.ACCEPTED,
        readRespondedAt: null,
      },
      data: { readRespondedAt: new Date() },
    });

    const diputus = await prisma.connection.updateMany({
      where: {
        status: StatusConnection.REVOKED,
        revokedByAccountId: { not: saya.sub },
        readRevokedAt: null,
        OR: [
          { requesterAccountId: saya.sub },
          { recipientAccountId: saya.sub },
        ],
      },
      data: { readRevokedAt: new Date() },
    });

    jumlah = dijawab.count + diputus.count;
  }

  return ok({ read: jumlah, ...(await hitungJejaring(saya.sub)) });
}

export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
