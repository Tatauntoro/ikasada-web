import { NextRequest } from "next/server";
import {
  Prisma,
  StatusAlumniAccount,
  StatusConnection,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  badRequest,
  conflict,
  created,
  okPaginated,
  tooManyRequests,
  validationError,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requireAlumniAktif } from "@/lib/sesi-alumni";
import { hitungJejaring } from "@/lib/permintaan-masuk";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { publikasiNotifikasi } from "@/lib/notifikasi-events";
import { catatPercobaan, cekRateLimit } from "@/lib/rate-limit";
import { logPeristiwa, requestIdDari } from "@/lib/log";
import { parsePagination } from "@/lib/pagination";
import {
  INCLUDE_KONEKSI,
  pairKey,
  statusKoneksiUntuk,
  toItemKoneksi,
} from "@/lib/connection";
import { connectionCreateSchema } from "@/lib/validations/connection";

/**
 * Koneksi antar alumni (BE-Planning §2.3, §4.4).
 *
 * - `GET`  — daftar permintaan masuk, keluar, atau koneksi yang sudah diterima.
 * - `POST` — kirim permintaan baru.
 *
 * Pelaku selalu diambil dari session (`requireAlumniAktif()` — session valid dan
 * akun `ACTIVE` menurut database), tidak pernah dari body atau query. Endpoint
 * `accept`/`decline`/`cancel` ada di sub-folder.
 */
const TAB = ["incoming", "outgoing", "accepted"] as const;

const WINDOW_MS = 60 * 60 * 1000; // 1 jam
const MAX_CREATE_PER_JAM = 20;

/**
 * Pesan konflik per status. Arah balik (`PENDING_RECEIVED`) perlu pesan sendiri
 * supaya pemanggil tidak disuruh "mengirim ulang" permintaan yang justru sedang
 * ia terima.
 */
const PESAN_KONFLIK: Record<string, string> = {
  PENDING_SENT: "Permintaan koneksi sudah pernah dikirim.",
  PENDING_RECEIVED: "Alumni ini sudah mengirim permintaan koneksi kepada Anda.",
  ACCEPTED: "Anda sudah terhubung dengan alumni ini.",
  SELF: "Anda tidak dapat menghubungkan diri sendiri.",
  NONE: "Permintaan koneksi tidak dapat dibuat.",
};

async function handleList(req: NextRequest): Promise<Response> {
  const saya = await requireAlumniAktif();

  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);
  const tabParam = searchParams.get("tab") ?? "";
  const tab = (TAB as readonly string[]).includes(tabParam)
    ? (tabParam as (typeof TAB)[number])
    : "incoming";

  const where: Prisma.ConnectionWhereInput =
    tab === "incoming"
      ? { recipientAccountId: saya.sub, status: StatusConnection.PENDING }
      : tab === "outgoing"
        ? /*
           * Termasuk yang sudah ditolak: pengirim berhak tahu jawabannya
           * (notifikasi "ditolak" menunjuk ke sini), dan barisnya tetap
           * informatif. `CANCELED` tidak ikut karena pembatalan dilakukan
           * pengirim sendiri, jadi ia sudah tahu.
           */
          {
            requesterAccountId: saya.sub,
            status: { in: [StatusConnection.PENDING, StatusConnection.DECLINED] },
          }
        : /*
           * Tab "Terhubung" memuat koneksi aktif **dan** yang sudah diputus oleh
           * pihak lain: pemutusan adalah kabar yang perlu dilihat, bukan sesuatu
           * yang boleh menghilang diam-diam. Baris yang kita putus sendiri tidak
           * ikut — kita tahu, dan tidak ada yang perlu dibaca lagi.
           */
          {
            status: {
              in: [StatusConnection.ACCEPTED, StatusConnection.REVOKED],
            },
            OR: [
              { requesterAccountId: saya.sub },
              { recipientAccountId: saya.sub },
            ],
            NOT: {
              status: StatusConnection.REVOKED,
              revokedByAccountId: saya.sub,
            },
          };

  const [data, total] = await prisma.$transaction([
    prisma.connection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: INCLUDE_KONEKSI,
    }),
    prisma.connection.count({ where }),
  ]);

  /*
   * Tiga angka notifikasi (dihitung untuk seluruh antrean, bukan hanya halaman
   * ini) dikirim sebagai `meta` supaya badge di UI tidak butuh permintaan
   * tambahan: `unread` = permintaan masuk belum dibaca, `unreadDiterima` dan
   * `unreadDitolak` = jawaban yang belum dilihat pengirim.
   */
  const hitungan = await hitungJejaring(saya.sub);

  return okPaginated(
    data.map((koneksi) => toItemKoneksi(koneksi, saya.sub)),
    {
      page: pagination.page,
      limit: pagination.limit,
      total,
    },
    hitungan
  );
}

async function handleCreate(req: NextRequest): Promise<Response> {
  const saya = await requireAlumniAktif();

  const body = await readJsonBody(req);
  const parsed = connectionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const opsiLimit = {
    scope: "connection_create",
    key: saya.sub,
    maxAttempts: MAX_CREATE_PER_JAM,
    windowMs: WINDOW_MS,
  };

  if ((await cekRateLimit(opsiLimit)).blocked) {
    logPeristiwa("rate_limit", {
      requestId: requestIdDari(req),
      endpoint: "/api/alumni/connections",
      scope: "connection_create",
    });

    return tooManyRequests(
      "Terlalu banyak permintaan koneksi. Silakan coba lagi nanti."
    );
  }

  // Dihitung sejak request lolos validasi, termasuk yang berakhir konflik.
  await catatPercobaan(opsiLimit);

  const penerima = await prisma.alumniAccount.findUnique({
    where: { alumniId: parsed.data.recipientAlumniId },
    select: {
      id: true,
      status: true,
      alumni: { select: { status: true, deletedAt: true } },
    },
  });

  /*
   * Penerima harus akun `ACTIVE` yang masih tertaut ke `Alumni` `PUBLISHED`
   * dan belum dihapus. Ini juga penegakan "alumni HIDDEN/terhapus tidak
   * menerima koneksi baru" di sisi endpoint.
   */
  if (
    !penerima ||
    penerima.status !== StatusAlumniAccount.ACTIVE ||
    !penerima.alumni ||
    penerima.alumni.status !== "PUBLISHED" ||
    penerima.alumni.deletedAt
  ) {
    return badRequest("Alumni tujuan tidak dapat dihubungi", {
      recipientAlumniId: "Alumni tujuan tidak ditemukan atau belum aktif",
    });
  }

  if (penerima.id === saya.sub) {
    return badRequest("Anda tidak dapat menghubungkan diri sendiri", {
      recipientAlumniId: "Tidak dapat menghubungi diri sendiri",
    });
  }

  const pesan = parsed.data.message ? parsed.data.message : null;
  const kunci = pairKey(saya.sub, penerima.id);

  const konflik = (statusSekarang: string): Response => {
    /*
     * Konflik `409` dicatat (BE-Planning §9): inilah jalur yang paling sering
     * menandakan dua user berebut pasangan yang sama, dan sebelumnya tidak
     * meninggalkan jejak apa pun.
     */
    logPeristiwa("konflik", {
      requestId: requestIdDari(req),
      endpoint: "/api/alumni/connections",
      connectionStatus: statusSekarang,
    });

    return conflict(PESAN_KONFLIK[statusSekarang] ?? PESAN_KONFLIK.NONE, {
      /*
       * `fields` dipakai sebagai kanal tambahan karena amplop error tidak punya
       * `meta`. Isinya status koneksi saat ini supaya FE bisa langsung
       * menyesuaikan tombolnya tanpa request tambahan — bukan error per field.
       */
      connectionStatus: statusSekarang,
    });
  };

  try {
    const hasil = await prisma.$transaction(async (tx) => {
      const sudahAda = await tx.connection.findUnique({
        where: { pairKey: kunci },
        select: { id: true, status: true, requesterAccountId: true },
      });

      if (sudahAda) {
        const statusSekarang = statusKoneksiUntuk(sudahAda, saya.sub);

        if (
          sudahAda.status === StatusConnection.PENDING ||
          sudahAda.status === StatusConnection.ACCEPTED
        ) {
          return { konflik: statusSekarang };
        }

        /*
         * `DECLINED`/`CANCELED` bukan permintaan aktif, jadi pasangan ini boleh
         * mencoba lagi. Karena `pairKey` unik, baris lama dihidupkan ulang dan
         * arahnya dibalik ke pengirim sekarang — bukan dibuat baris baru.
         */
        const dihidupkan = await tx.connection.update({
          where: { id: sudahAda.id },
          data: {
            requesterAccountId: saya.sub,
            recipientAccountId: penerima.id,
            status: StatusConnection.PENDING,
            message: pesan,
            respondedAt: null,
            /*
             * Penanda dari siklus sebelumnya dibersihkan: tanpa ini, penerima
             * baru tidak akan pernah melihat notifikasi permintaan ini (penanda
             * "sudah dibaca"-nya masih terisi dari ronde sebelumnya), dan
             * pemutusan lama bisa terbawa ke koneksi yang baru.
             */
            readAt: null,
            readRespondedAt: null,
            readRevokedAt: null,
            revokedByAccountId: null,
          },
          include: INCLUDE_KONEKSI,
        });

        await catatAudit(tx, {
          alumniAccountId: saya.sub,
          aksi: "CONNECTION_CREATE",
          entitas: "Connection",
          entitasId: dihidupkan.id,
          detailPerubahan: diffPerubahan(
            { status: sudahAda.status },
            { status: dihidupkan.status }
          ),
        });

        return { konflik: null, item: toItemKoneksi(dihidupkan, saya.sub) };
      }

      const dibuat = await tx.connection.create({
        data: {
          requesterAccountId: saya.sub,
          recipientAccountId: penerima.id,
          pairKey: kunci,
          status: StatusConnection.PENDING,
          message: pesan,
        },
        include: INCLUDE_KONEKSI,
      });

      await catatAudit(tx, {
        alumniAccountId: saya.sub,
        aksi: "CONNECTION_CREATE",
        entitas: "Connection",
        entitasId: dibuat.id,
      });

      return { konflik: null, item: toItemKoneksi(dibuat, saya.sub) };
    });

    if (hasil.konflik) {
      return konflik(hasil.konflik);
    }

    /*
     * Ping realtime untuk inbox admin — di luar transaksi, setelah commit.
     * Persistennya tetap baris AuditLog `CONNECTION_CREATE`.
     */
    publikasiNotifikasi({
      aksi: "CONNECTION_CREATE",
      entitasId: hasil.item.id,
    });

    return created(hasil.item);
  } catch (error) {
    /*
     * Pengaman balapan: dua request bersamaan sama-sama lolos pengecekan di
     * atas, lalu salah satunya ditolak unique `pairKey`. Yang kalah tetap
     * menerima state terkini, bukan 500.
     */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const sudahAda = await prisma.connection.findUnique({
        where: { pairKey: kunci },
        select: { status: true, requesterAccountId: true },
      });

      return konflik(
        sudahAda ? statusKoneksiUntuk(sudahAda, saya.sub) : "NONE"
      );
    }

    throw error;
  }
}

async function handler(req: NextRequest): Promise<Response> {
  if (req.method === "GET") {
    return handleList(req);
  }

  if (req.method === "POST") {
    return handleCreate(req);
  }

  return badRequest("Method tidak didukung");
}

export const GET = apiHandlerWithoutParams(handler);
export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
