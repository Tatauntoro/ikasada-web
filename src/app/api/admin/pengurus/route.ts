import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
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
import { normalizePengurusInput } from "@/lib/normalize-input";
import { pengurusCreateSchema } from "@/lib/validations/pengurus";

const SORTABLE_FIELDS = [
  "nama",
  "jabatan",
  "urutan",
  "createdAt",
  "updatedAt",
] as const;

async function handleList(req: NextRequest): Promise<Response> {
  await requireAdmin();

  const { searchParams } = req.nextUrl;
  const pagination = parsePagination(searchParams);
  const { field, direction } = parseSort(
    searchParams.get("sort"),
    SORTABLE_FIELDS,
    "urutan",
    "asc"
  );

  const search = searchParams.get("search")?.trim();

  const where: Prisma.PengurusWhereInput = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { nama: { contains: search, mode: "insensitive" } },
      { jabatan: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.pengurus.findMany({
      where,
      orderBy: { [field]: direction },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.pengurus.count({ where }),
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

  const parsed = pengurusCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizePengurusInput(parsed.data);

  const pengurus = await prisma.$transaction(async (tx) => {
    const created = await tx.pengurus.create({
      data: {
        ...data,
        createdById: session.sub,
      },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "CREATE",
      entitas: "Pengurus",
      entitasId: created.id,
    });

    return created;
  });

  return created(pengurus);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.PENGURUS, req.method);

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
