import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { RoleAdmin } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  badRequest,
  conflict,
  notFound,
  ok,
  validationError,
} from "@/lib/response";
import { apiHandler, readJsonBody } from "@/lib/api-handler";
import { requireSuperadmin } from "@/lib/sesi-admin";
import { catatAudit, diffPerubahan } from "@/lib/audit";
import { normalisasiIzin } from "@/lib/permission";
import { adminUpdateSchema } from "@/lib/validations/admin";

/**
 * Ubah satu akun admin (khusus superadmin): nama, role, aktif/nonaktif, izin.
 *
 * Dua pagar anti-lockout:
 * - superadmin tidak boleh menurunkan/menonaktifkan **dirinya sendiri**;
 * - superadmin aktif **terakhir** tidak boleh diturunkan/dinonaktifkan.
 */

type RouteParams = {
  params: Promise<{ id: string }>;
};

const SELECT_ADMIN = {
  id: true,
  nama: true,
  email: true,
  role: true,
  isAktif: true,
  permissions: true,
  izinKhusus: true,
  createdAt: true,
  lastLoginAt: true,
  divisi: { select: { id: true, nama: true } },
} as const;

async function handler(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  if (req.method !== "PATCH") {
    return badRequest("Method tidak didukung");
  }

  const session = await requireSuperadmin();
  const { id } = await params;

  const body = await readJsonBody(req);
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const data = parsed.data;

  const target = await prisma.adminUser.findUnique({
    where: { id },
    select: {
      id: true,
      nama: true,
      email: true,
      role: true,
      isAktif: true,
      permissions: true,
      izinKhusus: true,
      divisiId: true,
    },
  });
  if (!target) {
    return notFound("Admin tidak ditemukan");
  }

  const roleBaru = data.role ?? target.role;
  const aktifBaru = data.isAktif ?? target.isAktif;
  const menurunkan =
    target.role === RoleAdmin.SUPERADMIN && roleBaru !== RoleAdmin.SUPERADMIN;
  const menonaktifkan = target.isAktif && !aktifBaru;

  if (id === session.sub && (menurunkan || menonaktifkan)) {
    return conflict(
      "Anda tidak bisa menurunkan atau menonaktifkan akun sendiri."
    );
  }

  if (menurunkan || menonaktifkan) {
    const superadminAktifLain = await prisma.adminUser.count({
      where: { id: { not: id }, role: RoleAdmin.SUPERADMIN, isAktif: true },
    });
    if (target.role === RoleAdmin.SUPERADMIN && superadminAktifLain === 0) {
      return conflict(
        "Ini superadmin aktif terakhir — tidak bisa diturunkan atau dinonaktifkan."
      );
    }
  }

  // Email baru harus belum dipakai admin lain (identitas login, `@unique`).
  if (data.email !== undefined && data.email !== target.email) {
    const dipakai = await prisma.adminUser.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (dipakai && dipakai.id !== id) {
      return conflict("Email sudah dipakai admin lain.", {
        email: "Email sudah dipakai admin lain",
      });
    }
  }

  // Divisi tujuan harus ada (bila diisi); izinnya dipakai sebagai template
  // saat admin dipindahkan ke divisi itu.
  let izinDivisiTujuan: Prisma.InputJsonValue | null = null;
  if (data.divisiId) {
    const divisi = await prisma.divisi.findFirst({
      where: { id: data.divisiId, deletedAt: null },
      select: { id: true, permissions: true },
    });
    if (!divisi) {
      return badRequest("Divisi tidak ditemukan", {
        divisiId: "Divisi tidak valid",
      });
    }
    izinDivisiTujuan = normalisasiIzin(
      divisi.permissions
    ) as Prisma.InputJsonValue;
  }

  const updateData: Prisma.AdminUserUncheckedUpdateInput = {};
  if (data.nama !== undefined) updateData.nama = data.nama;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isAktif !== undefined) updateData.isAktif = data.isAktif;
  if (data.divisiId !== undefined) updateData.divisiId = data.divisiId;

  if (data.permissions !== undefined) {
    // "Atur izin" mengirim izin eksplisit → tandai izin khusus supaya tidak
    // ditimpa template divisi di kemudian hari.
    updateData.permissions = normalisasiIzin(
      data.permissions
    ) as Prisma.InputJsonValue;
    updateData.izinKhusus = true;
  } else if (data.izinKhusus === true) {
    updateData.izinKhusus = true;
  } else if (data.izinKhusus === false) {
    // "Ikuti template divisi": lepas penanda & salin template divisi saat ini
    // (atau divisi tujuan bila sekalian pindah).
    updateData.izinKhusus = false;
    const divisiTemplateId =
      data.divisiId !== undefined ? data.divisiId : target.divisiId;
    if (divisiTemplateId) {
      const tmpl = await prisma.divisi.findUnique({
        where: { id: divisiTemplateId },
        select: { permissions: true },
      });
      if (tmpl) {
        updateData.permissions = normalisasiIzin(
          tmpl.permissions
        ) as Prisma.InputJsonValue;
      }
    }
  } else if (
    data.divisiId !== undefined &&
    data.divisiId !== null &&
    data.divisiId !== target.divisiId &&
    izinDivisiTujuan &&
    !target.izinKhusus
  ) {
    // Pindah divisi tanpa izin eksplisit (dan bukan izin khusus) → izin
    // mengikuti template divisi baru.
    updateData.permissions = izinDivisiTujuan;
  }

  const hasil = await prisma.$transaction(async (tx) => {
    const diperbarui = await tx.adminUser.update({
      where: { id },
      data: updateData,
      select: SELECT_ADMIN,
    });

    await catatAudit(tx, {
      adminId: session.sub,
      aksi: "ADMIN_UPDATE",
      entitas: "AdminUser",
      entitasId: id,
      detailPerubahan: diffPerubahan(
        {
          nama: target.nama,
          email: target.email,
          role: target.role,
          isAktif: target.isAktif,
          permissions: target.permissions,
          divisiId: target.divisiId,
        },
        {
          nama: diperbarui.nama,
          email: diperbarui.email,
          role: diperbarui.role,
          isAktif: diperbarui.isAktif,
          permissions: diperbarui.permissions,
          divisiId: diperbarui.divisi?.id ?? null,
        }
      ),
    });

    return diperbarui;
  });

  return ok(hasil);
}

export const PATCH = apiHandler(handler);
export const dynamic = "force-dynamic";
