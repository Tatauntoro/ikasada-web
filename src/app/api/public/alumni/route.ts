import { NextRequest } from "next/server";
import { Prisma, ProgramStudi } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { okPaginated } from "@/lib/response";
import { apiHandlerWithoutParams } from "@/lib/api-handler";
import { parsePagination } from "@/lib/pagination";
import { parseSort } from "@/lib/sort";
import {
  ambilPengunjungAktif,
  ambilStatusKoneksi,
  keDirektoriAktif,
  keDirektoriAnonim,
} from "@/lib/directory-alumni";

/**
 * Direktori alumni (BE-Planning §4.3).
 *
 * Endpoint tetap satu dan tetap kompatibel untuk pemanggil anonymous: field
 * kartu yang lama tidak berubah. Yang membedakan hanya data privat:
 *
 * - Anonymous (atau session yang akunnya belum `ACTIVE`): tanpa nilai
 *   keterbukaan dan tanpa status koneksi, sebagai gantinya `openStatusLocked`.
 * - Akun `ACTIVE`: nilai keterbukaan dan `connectionStatus` per kartu, dihitung
 *   dengan dua query untuk seluruh halaman (tanpa N+1).
 *
 * Field kontak (`email`, `noWhatsapp`, `linkInstagram`, `linkSosmedLain`) tidak
 * pernah dikirim ke direktori — kontak hanya terbuka lewat consent setelah
 * koneksi diterima (§7).
 */
const SORTABLE_FIELDS = ["namaLengkap", "angkatan", "createdAt", "updatedAt"] as const;

async function handler(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);
  const { field, direction } = parseSort(
    searchParams.get("sort"),
    SORTABLE_FIELDS,
    "namaLengkap",
    "asc"
  );

  const search = searchParams.get("search")?.trim();
  const angkatanDari = searchParams.get("angkatanDari");
  const angkatanSampai = searchParams.get("angkatanSampai");
  const sektorIndustriId = searchParams.get("sektorIndustriId");
  const programStudi = searchParams.get("programStudi");

  const where: Prisma.AlumniWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { namaLengkap: { contains: search, mode: "insensitive" } },
      { profesi: { contains: search, mode: "insensitive" } },
    ];
  }

  const dari = angkatanDari ? Number(angkatanDari) : null;
  const sampai = angkatanSampai ? Number(angkatanSampai) : null;
  const dariValid = dari !== null && Number.isInteger(dari);
  const sampaiValid = sampai !== null && Number.isInteger(sampai);

  if (dariValid || sampaiValid) {
    where.angkatan = {};
    if (dariValid) {
      where.angkatan.gte = dari;
    }
    if (sampaiValid) {
      where.angkatan.lte = sampai;
    }
  }

  if (sektorIndustriId) {
    where.sektorIndustriId = sektorIndustriId;
  }

  if (programStudi && Object.values(ProgramStudi).includes(programStudi as ProgramStudi)) {
    where.programStudi = programStudi as ProgramStudi;
  }

  const [data, total] = await prisma.$transaction([
    prisma.alumni.findMany({
      where,
      orderBy: { [field]: direction },
      skip: pagination.skip,
      take: pagination.take,
      include: {
        sektorIndustri: true,
        account: {
          select: {
            status: true,
            openToCollaboration: true,
            openToOpportunity: true,
          },
        },
      },
    }),
    prisma.alumni.count({ where }),
  ]);

  const meta = {
    page: pagination.page,
    limit: pagination.limit,
    total,
  };

  const pengunjung = await ambilPengunjungAktif();

  if (!pengunjung) {
    return okPaginated(data.map(keDirektoriAnonim), meta);
  }

  const statusKoneksi = await ambilStatusKoneksi(
    pengunjung.accountId,
    data.map((alumni) => alumni.id)
  );

  return okPaginated(
    data.map((alumni) =>
      keDirektoriAktif(alumni, statusKoneksi.get(alumni.id) ?? "NONE")
    ),
    meta
  );
}

export const GET = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
