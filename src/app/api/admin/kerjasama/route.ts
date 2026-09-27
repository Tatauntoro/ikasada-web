import { NextRequest } from "next/server";
import { Prisma, StatusKerjasama } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  created,
  validationError,
  okPaginated,
  badRequest,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth";
import { requirePermissionModul } from "@/lib/sesi-admin";
import { MODUL } from "@/lib/permission";
import { parsePagination } from "@/lib/pagination";
import { parseSort } from "@/lib/sort";
import { catatAudit } from "@/lib/audit";
import { generateUniqueSlug } from "@/lib/slug";
import { normalizeKerjasamaInput } from "@/lib/normalize-input";
import { kerjasamaCreateSchema } from "@/lib/validations/kerjasama";

const SORTABLE_FIELDS = [
  "organisasi",
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
  const status = searchParams.get("status");

  const where: Prisma.KerjasamaWhereInput = {
    deletedAt: null,
  };

  if (search) {
    where.organisasi = { contains: search, mode: "insensitive" };
  }

  if (
    status &&
    Object.values(StatusKerjasama).includes(status as StatusKerjasama)
  ) {
    where.status = status as StatusKerjasama;
  }

  const [data, total] = await prisma.$transaction([
    prisma.kerjasama.findMany({
      where,
      orderBy: { [field]: direction },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.kerjasama.count({ where }),
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

  const parsed = kerjasamaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeKerjasamaInput(parsed.data);

  const kerjasama = await prisma.$transaction(async (tx) => {
    const slug = await generateUniqueSlug(data.organisasi, tx, {
      table: "kerjasama",
    });

    const dibuat = await tx.kerjasama.create({
      data: {
        ...data,
        slug,
        createdById: session.sub,
      },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "CREATE",
      entitas: "Kerjasama",
      entitasId: dibuat.id,
    });

    return dibuat;
  });

  return created(kerjasama);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.KERJASAMA, req.method);

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
