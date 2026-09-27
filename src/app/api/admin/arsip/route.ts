import { NextRequest } from "next/server";
import { Prisma, StatusArsip } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  created,
  badRequest,
  validationError,
  okPaginated,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { parsePagination } from "@/lib/pagination";
import { parseSort } from "@/lib/sort";
import { catatAudit } from "@/lib/audit";
import { generateUniqueSlug } from "@/lib/slug";
import { whereTahunKegiatan } from "@/lib/arsip-publik";
import { normalizeArsipInput, normalizeMediaArsip } from "@/lib/normalize-input";
import { arsipCreateSchema } from "@/lib/validations/arsip";

const SORTABLE_FIELDS = [
  "judul",
  "tanggalUpload",
  "tanggalKegiatanMulai",
  "createdAt",
  "updatedAt",
] as const;

async function handleList(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);
  const { field, direction } = parseSort(
    searchParams.get("sort"),
    SORTABLE_FIELDS,
    "tanggalUpload",
    "desc"
  );

  const search = searchParams.get("search")?.trim();
  const jenisId = searchParams.get("jenisId");
  const status = searchParams.get("status");

  const where: Prisma.ArsipWhereInput = { deletedAt: null };

  if (search) {
    where.judul = { contains: search, mode: "insensitive" };
  }

  if (jenisId) {
    where.jenisArsipId = jenisId;
  }

  if (status && Object.values(StatusArsip).includes(status as StatusArsip)) {
    where.status = status as StatusArsip;
  }

  // Filter tahun mengikuti rentang tanggal kegiatan (lihat `whereTahunKegiatan`).
  Object.assign(where, whereTahunKegiatan(searchParams.get("tahun")));

  const [data, total] = await prisma.$transaction([
    prisma.arsip.findMany({
      where,
      orderBy: { [field]: direction },
      skip: pagination.skip,
      take: pagination.take,
      include: { jenisArsip: true, _count: { select: { media: true } } },
    }),
    prisma.arsip.count({ where }),
  ]);

  return okPaginated(data, {
    page: pagination.page,
    limit: pagination.limit,
    total,
  });
}

async function handleCreate(req: NextRequest): Promise<Response> {
  const session = await requireAdmin();
  const body = await readJsonBody(req);

  const parsed = arsipCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeArsipInput(parsed.data);
  const media = normalizeMediaArsip(parsed.data.media);

  const jenis = await prisma.jenisArsip.findFirst({
    where: { id: data.jenisArsipId, deletedAt: null },
  });
  if (!jenis) {
    return badRequest("Jenis arsip tidak ditemukan", {
      jenisArsipId: "Jenis tidak valid",
    });
  }

  const arsip = await prisma.$transaction(async (tx) => {
    const slug = await generateUniqueSlug(data.judul, tx, { table: "arsip" });

    const dibuat = await tx.arsip.create({
      data: {
        ...data,
        slug,
        createdById: session.sub,
        media: media.length > 0 ? { create: media } : undefined,
      },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "CREATE",
      entitas: "Arsip",
      entitasId: dibuat.id,
    });

    return dibuat;
  });

  return created(arsip);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.ARSIP, req.method);

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
