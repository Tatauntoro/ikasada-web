import { NextRequest } from "next/server";
import { Prisma, StatusConnection } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { okPaginated } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { requirePermission } from "@/lib/sesi-admin";
import { AKSI, MODUL } from "@/lib/permission";
import { parsePagination } from "@/lib/pagination";

/**
 * Daftar koneksi alumni untuk pengurus (read-only, semua status).
 *
 * Menampilkan **pengirim → penerima** beserta statusnya. Filter: status,
 * pencarian nama alumni (pengirim/penerima), paginasi. Jumlah per status ikut
 * dikirim di `meta.perStatus` untuk badge tab di UI.
 */

const PIHAK_SELECT = {
  select: {
    id: true,
    namaLengkapSaatDaftar: true,
    alumni: {
      select: {
        id: true,
        namaLengkap: true,
        angkatan: true,
        programStudi: true,
        fotoUrl: true,
      },
    },
  },
} satisfies Prisma.AlumniAccountDefaultArgs;

type Pihak = {
  id: string;
  namaLengkapSaatDaftar: string;
  alumni: {
    id: string;
    namaLengkap: string;
    angkatan: number;
    programStudi: string;
    fotoUrl: string | null;
  } | null;
};

function kePihak(p: Pihak) {
  return {
    accountId: p.id,
    alumniId: p.alumni?.id ?? null,
    nama: p.alumni?.namaLengkap ?? p.namaLengkapSaatDaftar,
    angkatan: p.alumni?.angkatan ?? null,
    fotoUrl: p.alumni?.fotoUrl ?? null,
  };
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermission(MODUL.JEJARING, AKSI.LIHAT);

  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);

  const where: Prisma.ConnectionWhereInput = {};

  const statusParam = searchParams.get("status");
  if (
    statusParam &&
    Object.values(StatusConnection).includes(statusParam as StatusConnection)
  ) {
    where.status = statusParam as StatusConnection;
  }

  const q = searchParams.get("search")?.trim();
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    where.OR = [
      { requester: { is: { namaLengkapSaatDaftar: like } } },
      { requester: { is: { alumni: { is: { namaLengkap: like } } } } },
      { recipient: { is: { namaLengkapSaatDaftar: like } } },
      { recipient: { is: { alumni: { is: { namaLengkap: like } } } } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.connection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: { requester: PIHAK_SELECT, recipient: PIHAK_SELECT },
    }),
    prisma.connection.count({ where }),
  ]);

  const perStatusRaw = await prisma.connection.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const perStatus: Record<string, number> = {};
  for (const baris of perStatusRaw) {
    perStatus[baris.status] = baris._count._all;
  }

  const items = data.map((k) => ({
    id: k.id,
    status: k.status,
    message: k.message,
    createdAt: k.createdAt.toISOString(),
    respondedAt: k.respondedAt ? k.respondedAt.toISOString() : null,
    pengirim: kePihak(k.requester),
    penerima: kePihak(k.recipient),
  }));

  return okPaginated(
    items,
    { page: pagination.page, limit: pagination.limit, total },
    { perStatus }
  );
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
