import { RoleAdmin } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { ForbiddenError, UnauthorizedError, getSession } from "@/lib/auth";
import {
  AKSI,
  boleh,
  normalisasiIzin,
  MODUL,
  type AksiSlug,
  type Izin,
  type ModulSlug,
} from "@/lib/permission";

/**
 * Sesi admin yang sudah diverifikasi terhadap database.
 *
 * Token admin (`@/lib/auth`) hanya membawa `sub`/`nama`/`email`; `role`, status
 * aktif, dan izin **selalu dibaca ulang dari database** di sini. Dengan begitu
 * perubahan role/izin atau menonaktifkan admin langsung berlaku tanpa memaksa
 * login ulang — pola yang sama dengan `sesi-alumni.ts`.
 *
 * Dipisah dari `@/lib/auth` supaya modul itu tetap murni soal tanda tangan &
 * cookie (tanpa database).
 */

export type AdminSesi = {
  sub: string;
  nama: string;
  email: string;
  role: RoleAdmin;
  permissions: Izin;
  /** Divisi tempat admin bertugas; `null` untuk admin teknis/tanpa divisi. */
  divisi: { id: string; nama: string; lintasDivisi: boolean } | null;
};

const SELECT_ADMIN = {
  id: true,
  nama: true,
  email: true,
  role: true,
  isAktif: true,
  permissions: true,
  divisi: { select: { id: true, nama: true, lintasDivisi: true } },
} as const;

async function ambilAdmin(id: string): Promise<AdminSesi | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { id },
    select: SELECT_ADMIN,
  });

  if (!admin || !admin.isAktif) return null;

  return {
    sub: admin.id,
    nama: admin.nama,
    email: admin.email,
    role: admin.role,
    permissions: normalisasiIzin(admin.permissions),
    divisi: admin.divisi,
  };
}

/**
 * Apakah admin boleh melihat konten **semua** divisi.
 *
 * Benar untuk superadmin, admin tanpa divisi (mis. admin teknis), dan divisi
 * bertanda `lintasDivisi` (mis. Ketua Umum). Selain itu, admin hanya melihat
 * konten divisinya sendiri (plus konten lama yang belum berdivisi).
 */
export function bolehLihatSemuaDivisi(sesi: {
  role: RoleAdmin;
  divisi: { lintasDivisi: boolean } | null;
}): boolean {
  return (
    sesi.role === RoleAdmin.SUPERADMIN ||
    !sesi.divisi ||
    sesi.divisi.lintasDivisi
  );
}

/**
 * Fragmen `where` untuk membatasi daftar konten ke divisi admin.
 *
 * `null` berarti tidak perlu dibatasi (admin boleh lihat semua divisi). Konten
 * lama yang `divisiId`-nya masih `null` tetap ikut terlihat, supaya pemisahan
 * baru ini tidak menyembunyikan data yang sudah ada.
 */
export function whereDivisi(sesi: AdminSesi): {
  OR: { divisiId: string | null }[];
} | null {
  if (bolehLihatSemuaDivisi(sesi)) return null;
  return { OR: [{ divisiId: sesi.divisi!.id }, { divisiId: null }] };
}

/**
 * Apakah admin boleh memverifikasi konten (mis. Ketua Umum).
 *
 * Berdasarkan izin `verifikasi-konten` (aksi `ubah`); superadmin selalu boleh.
 * Verifikator juga boleh Publish tanpa menunggu verifikasi.
 */
export function bolehVerifikasiKonten(sesi: AdminSesi): boolean {
  return (
    sesi.role === RoleAdmin.SUPERADMIN ||
    boleh(sesi.permissions, MODUL.VERIFIKASI_KONTEN, AKSI.UBAH)
  );
}

/** `null` kalau tidak ada session, akun hilang, atau dinonaktifkan. */
export async function adminAktif(): Promise<AdminSesi | null> {
  const sesi = await getSession();
  if (!sesi) return null;
  return ambilAdmin(sesi.sub);
}

/** Sesi admin aktif; `401` kalau tidak ada, `403` kalau dinonaktifkan. */
export async function requireAdminAktif(): Promise<AdminSesi> {
  const sesi = await getSession();
  if (!sesi) {
    throw new UnauthorizedError();
  }

  const admin = await ambilAdmin(sesi.sub);
  if (!admin) {
    // Sudah dibedakan di `ambilAdmin` hanya lewat null; cek ulang untuk pesan
    // yang tepat: akun hilang → 401, dinonaktifkan → 403.
    const ada = await prisma.adminUser.findUnique({
      where: { id: sesi.sub },
      select: { isAktif: true },
    });
    if (!ada) {
      throw new UnauthorizedError("Sesi tidak valid. Silakan login kembali.");
    }
    throw new ForbiddenError("Akun admin ini dinonaktifkan.");
  }

  return admin;
}

/**
 * Sesi admin aktif **dan** berhak atas `aksi` pada `modul`.
 *
 * `SUPERADMIN` selalu lolos; `ADMIN` dicek terhadap `permissions`.
 */
export async function requirePermission(
  modul: ModulSlug,
  aksi: AksiSlug
): Promise<AdminSesi> {
  const sesi = await requireAdminAktif();

  if (sesi.role === RoleAdmin.SUPERADMIN) {
    return sesi;
  }

  if (!boleh(sesi.permissions, modul, aksi)) {
    throw new ForbiddenError("Anda tidak punya izin untuk tindakan ini.");
  }

  return sesi;
}

/** Khusus superadmin (mis. Kelola Admin). */
export async function requireSuperadmin(): Promise<AdminSesi> {
  const sesi = await requireAdminAktif();

  if (sesi.role !== RoleAdmin.SUPERADMIN) {
    throw new ForbiddenError("Hanya superadmin yang boleh mengakses ini.");
  }

  return sesi;
}

/** HTTP method → aksi CRUD. */
export function aksiDariMethod(method: string): AksiSlug {
  switch (method) {
    case "POST":
      return AKSI.TAMBAH;
    case "PUT":
    case "PATCH":
      return AKSI.UBAH;
    case "DELETE":
      return AKSI.HAPUS;
    default:
      return AKSI.LIHAT;
  }
}

/**
 * Guard ringkas untuk route CRUD: aksi ditentukan dari method request.
 *
 * Dipakai di route yang menangani beberapa method sekaligus (GET/POST/PUT/
 * DELETE), sehingga cukup satu pemanggilan dengan `req.method`.
 */
export async function requirePermissionModul(
  modul: ModulSlug,
  method: string
): Promise<AdminSesi> {
  return requirePermission(modul, aksiDariMethod(method));
}
