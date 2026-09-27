import { NextRequest } from "next/server";
import {
  Prisma,
  ProgramStudi,
  StatusAlumni,
} from "@/generated/prisma/client";
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
import { catatAudit } from "@/lib/audit";
import { parseSort } from "@/lib/sort";
import { normalizeAlumniInput } from "@/lib/normalize-input";
import { alumniCreateSchema } from "@/lib/validations/alumni";

const SORTABLE_FIELDS = [
  "namaLengkap",
  "angkatan",
  "profesi",
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
    "namaLengkap",
    "asc"
  );

  const search = searchParams.get("search")?.trim();
  const angkatan = searchParams.get("angkatan");
  const sektorIndustriId = searchParams.get("sektorIndustriId");
  const programStudi = searchParams.get("programStudi");
  const status = searchParams.get("status");

  const where: Prisma.AlumniWhereInput = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { namaLengkap: { contains: search, mode: "insensitive" } },
      { profesi: { contains: search, mode: "insensitive" } },
    ];
  }

  if (angkatan) {
    const year = Number(angkatan);
    if (!Number.isNaN(year)) {
      where.angkatan = year;
    }
  }

  if (sektorIndustriId) {
    where.sektorIndustriId = sektorIndustriId;
  }

  if (programStudi && Object.values(ProgramStudi).includes(programStudi as ProgramStudi)) {
    where.programStudi = programStudi as ProgramStudi;
  }

  if (status && Object.values(StatusAlumni).includes(status as StatusAlumni)) {
    where.status = status as StatusAlumni;
  }

  /*
   * Filter keterbukaan (kolaborasi/kesempatan) — datanya ada di akun alumni.
   * Nilainya sejalan dengan badge di daftar admin; `belum-aktif` menangkap akun
   * yang bukan ACTIVE (mis. ditangguhkan), sedangkan `belum-ada-akun` alumni
   * yang belum punya akun sama sekali.
   */
  const keterbukaan = searchParams.get("keterbukaan");

  const syaratKeterbukaan: Prisma.AlumniWhereInput | null =
    keterbukaan === "kolaborasi"
      ? { account: { is: { status: "ACTIVE", openToCollaboration: true } } }
      : keterbukaan === "kesempatan"
        ? { account: { is: { status: "ACTIVE", openToOpportunity: true } } }
        : keterbukaan === "belum-terbuka"
          ? {
              account: {
                is: {
                  status: "ACTIVE",
                  openToCollaboration: false,
                  openToOpportunity: false,
                },
              },
            }
          : keterbukaan === "belum-ada-akun"
            ? { account: { is: null } }
            : keterbukaan === "belum-aktif"
              ? { account: { is: { status: { not: "ACTIVE" } } } }
              : null;

  if (syaratKeterbukaan) {
    Object.assign(where, syaratKeterbukaan);
  }

  const [data, total] = await prisma.$transaction([
    prisma.alumni.findMany({
      where,
      orderBy: { [field]: direction },
      skip: pagination.skip,
      take: pagination.take,
      include: {
        sektorIndustri: true,
        /*
         * Keterbukaan (kolaborasi/kesempatan) hanya ada di akun alumni, jadi
         * ikut diambil supaya daftar bisa menampilkan badge-nya tanpa request
         * tambahan per baris.
         */
        account: {
          select: {
            id: true,
            status: true,
            openToCollaboration: true,
            openToOpportunity: true,
          },
        },
      },
    }),
    prisma.alumni.count({ where }),
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

  const parsed = alumniCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = normalizeAlumniInput(parsed.data);

  const sektorIndustri = await prisma.sektorIndustri.findFirst({
    where: { id: data.sektorIndustriId, deletedAt: null },
  });

  if (!sektorIndustri) {
    return badRequest("Sektor industri tidak ditemukan", {
      sektorIndustriId: "Sektor industri tidak valid",
    });
  }

  const alumni = await prisma.$transaction(async (tx) => {
    const created = await tx.alumni.create({
      data: {
        ...data,
        createdById: session.sub,
      },
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "CREATE",
      entitas: "Alumni",
      entitasId: created.id,
    });

    return created;
  });

  return created(alumni);
}

async function handler(req: NextRequest): Promise<Response> {
  await requirePermissionModul(MODUL.ALUMNI, req.method);

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
