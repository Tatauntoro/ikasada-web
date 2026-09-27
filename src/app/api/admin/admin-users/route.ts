import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  badRequest,
  conflict,
  created,
  okPaginated,
  validationError,
} from "@/lib/response";
import { apiHandlerWithoutParams, readJsonBody } from "@/lib/api-handler";
import { requireSuperadmin } from "@/lib/sesi-admin";
import { catatAudit } from "@/lib/audit";
import { aktivitasTerakhirPerAdmin } from "@/lib/aktivitas-server";
import { adminCreateSchema } from "@/lib/validations/admin";

/**
 * Kelola Admin (khusus superadmin).
 *
 * `GET` daftar akun admin (tanpa `passwordHash`), `POST` membuat admin baru
 * dengan role `ADMIN` dan izin **kosong** (least privilege) — superadmin yang
 * mengisi izinnya lewat `PATCH /api/admin/admin-users/[id]`.
 */

const BCRYPT_ROUNDS = 10;

const SELECT_ADMIN = {
  id: true,
  nama: true,
  email: true,
  role: true,
  isAktif: true,
  permissions: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

async function handleList(): Promise<Response> {
  const data = await prisma.adminUser.findMany({
    select: SELECT_ADMIN,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  // Aktivitas terbaru per admin (dipisah dari "login terakhir").
  const aktivitas = await aktivitasTerakhirPerAdmin(data.map((a) => a.id));
  const items = data.map((a) => ({
    ...a,
    aktivitasTerakhir: aktivitas.get(a.id) ?? null,
  }));

  return okPaginated(items, {
    page: 1,
    limit: items.length,
    total: items.length,
  });
}

async function handleCreate(req: NextRequest): Promise<Response> {
  const session = await requireSuperadmin();
  const body = await readJsonBody(req);

  const parsed = adminCreateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { nama, email, password } = parsed.data;

  const sudahAda = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true },
  });
  if (sudahAda) {
    return conflict("Email sudah dipakai admin lain.");
  }

  const passwordHash = await hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.$transaction(async (tx) => {
    const dibuat = await tx.adminUser.create({
      data: {
        nama,
        email,
        passwordHash,
        role: "ADMIN",
        isAktif: true,
        // Izin kosong dulu; superadmin mengaturnya setelah ini.
        permissions: {},
      },
      select: SELECT_ADMIN,
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "CREATE",
      entitas: "AdminUser",
      entitasId: dibuat.id,
    });

    return dibuat;
  });

  return created(admin);
}

async function handler(req: NextRequest): Promise<Response> {
  if (req.method === "GET") {
    await requireSuperadmin();
    return handleList();
  }

  if (req.method === "POST") {
    return handleCreate(req);
  }

  return badRequest("Method tidak didukung");
}

export const GET = apiHandlerWithoutParams(handler);
export const POST = apiHandlerWithoutParams(handler);
export const dynamic = "force-dynamic";
