import { NextRequest } from "next/server";
import { Prisma, StatusBerita } from "@/generated/prisma/client";
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
import { normalizeBeritaInput } from "@/lib/normalize-input";
import { beritaCreateSchema } from "@/lib/validations/berita";

const SORTABLE_FIELDS = ["judul", "tanggal", "createdAt", "updatedAt"] as const;

async function handleList(req: NextRequest): Promise<Response> {
  await requireAdmin();

  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);
  const { field, direction } = parseSort(
    searchParams.get("sort"),
    SORTABLE_FIELDS,
    "tanggal",
    "desc"
  );

  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const jenisBeritaId = searchParams.get("jenisBeritaId");

  const where: Prisma.BeritaWhereInput = {
    deletedAt: null,
  };

  if (search) {
    where.judul = { contains: search, mode: "insensitive" };
  }

  if (
    status &&
    Object.values(StatusBerita).includes(status as StatusBerita)
  ) {
    where.status = status as StatusBerita;
  }

  if (jenisBeritaId) {
    where.jenisBeritaId = jenisBeritaId;
  }

  const [data, total] = await prisma.$transaction([
    prisma.berita.findMany({
      where,
      orderBy: { [field]: direction },
      skip: pagination.skip,
      take: pagination.take,
      include: { jenisBerita: true },
    }),
    prisma.berita.count({ where }),
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

  const parsed = beritaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeBeritaInput(parsed.data);

  const jenis = await prisma.jenisBerita.findFirst({
    where: { id: data.jenisBeritaId, deletedAt: null },
  });
  if (!jenis) {
    return badRequest("Tipe berita tidak ditemukan", {
      jenisBeritaId: "Tipe berita tidak valid",
    });
  }

  const berita = await prisma.$transaction(async (tx) => {
    const slug = await generateUniqueSlug(data.judul, tx, { table: "berita" });

    const dibuat = await tx.berita.create({
      data: {
        ...data,
        slug,
        createdById: session.sub,
      },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "CREATE",
      entitas: "Berita",
      entitasId: dibuat.id,
    });

    return dibuat;
  });

  return created(berita);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.BERITA, req.method);

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
