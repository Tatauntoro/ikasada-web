import { NextRequest } from "next/server";
import { Prisma, StatusKegiatan } from "@/generated/prisma/client";
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
import { normalizeKegiatanInput } from "@/lib/normalize-input";
import { kegiatanCreateSchema } from "@/lib/validations/kegiatan";

const SORTABLE_FIELDS = [
  "judul",
  "tanggalMulai",
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
    "tanggalMulai",
    "desc"
  );

  const search = searchParams.get("search")?.trim();
  const kategori = searchParams.get("kategori");
  const status = searchParams.get("status");
  const dariTanggal = searchParams.get("dariTanggal");
  const sampaiTanggal = searchParams.get("sampaiTanggal");

  const where: Prisma.KegiatanWhereInput = {
    deletedAt: null,
  };

  if (search) {
    where.judul = { contains: search, mode: "insensitive" };
  }

  if (kategori) {
    where.kategoriKegiatanId = kategori;
  }

  if (status && Object.values(StatusKegiatan).includes(status as StatusKegiatan)) {
    where.status = status as StatusKegiatan;
  }

  const dari = dariTanggal ? new Date(dariTanggal) : null;
  const sampai = sampaiTanggal ? new Date(sampaiTanggal) : null;
  const dariValid = dari !== null && !Number.isNaN(dari.getTime());
  const sampaiValid = sampai !== null && !Number.isNaN(sampai.getTime());

  if (dariValid || sampaiValid) {
    where.tanggalMulai = {};
    if (dariValid) {
      where.tanggalMulai.gte = dari;
    }
    if (sampaiValid) {
      where.tanggalMulai.lte = sampai;
    }
  }

  const [data, total] = await prisma.$transaction([
    prisma.kegiatan.findMany({
      where,
      orderBy: { [field]: direction },
      skip: pagination.skip,
      take: pagination.take,
      include: { kategoriKegiatan: true },
    }),
    prisma.kegiatan.count({ where }),
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

  const parsed = kegiatanCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeKegiatanInput(parsed.data);

  const kategori = await prisma.kategoriKegiatan.findFirst({
    where: { id: data.kategoriKegiatanId, deletedAt: null },
  });
  if (!kategori) {
    return badRequest("Kategori kegiatan tidak ditemukan", {
      kategori: "Kategori tidak valid",
    });
  }

  const kegiatan = await prisma.$transaction(async (tx) => {
    const slug = await generateUniqueSlug(data.judul, tx, { table: "kegiatan" });

    const created = await tx.kegiatan.create({
      data: {
        ...data,
        slug,
        createdById: session.sub,
      },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "CREATE",
      entitas: "Kegiatan",
      entitasId: created.id,
    });

    return created;
  });

  return created(kegiatan);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.KEGIATAN, req.method);

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
