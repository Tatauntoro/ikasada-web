import { prisma } from "@/lib/db";
import { MODUL } from "@/lib/permission";
import { bolehVerifikasiKonten, type AdminSesi } from "@/lib/sesi-admin";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { StatusVerifikasiKonten } from "@/generated/prisma/enums";

/**
 * Konten yang ikut alur verifikasi + pemetaan entitas → modul izinnya.
 *
 * Modul izin dipakai untuk mengecek hak `ubah` saat divisi mengajukan.
 */
export const ENTITAS_VERIFIKASI = {
  kegiatan: { modul: MODUL.KEGIATAN, label: "Kegiatan" },
  berita: { modul: MODUL.BERITA, label: "Berita" },
  arsip: { modul: MODUL.ARSIP, label: "Arsip" },
  kerjasama: { modul: MODUL.KERJASAMA, label: "Kerjasama" },
} as const;

export type EntitasVerifikasi = keyof typeof ENTITAS_VERIFIKASI;

export function entitasValid(nilai: string): nilai is EntitasVerifikasi {
  return Object.prototype.hasOwnProperty.call(ENTITAS_VERIFIKASI, nilai);
}

export type HasilGate =
  | { ok: true; reset: boolean }
  | { ok: false; pesan: string };

/** Bandingkan nilai kolom (Date → ISO, undefined → null) agar setara JSON. */
function nilaiSetara(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) =>
    v instanceof Date ? v.toISOString() : v === undefined ? null : v;
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/**
 * Apakah payload mengubah isi konten (selain `status`).
 *
 * Dipakai untuk membedakan "sekadar menerbitkan ulang konten yang sudah
 * diverifikasi" dari "mengubah konten" — yang kedua wajib verifikasi ulang.
 * Media tidak ikut di sini (bukan bagian `data`); pemanggil menambahkan
 * perbandingan jumlah media sendiri.
 */
export function kontenBerubah(
  lama: object,
  baru: Record<string, unknown>
): boolean {
  const lamaRek = lama as Record<string, unknown>;
  for (const [kunci, nilai] of Object.entries(baru)) {
    if (kunci === "status") continue;
    if (!nilaiSetara(lamaRek[kunci], nilai)) return true;
  }
  return false;
}

/**
 * Apakah daftar galeri berubah (jenis/berkas/keterangan atau urutannya).
 *
 * `baru` adalah media dari form (sudah dinormalkan); `lama` baris tersimpan.
 */
export function mediaBerubah(
  lama: { jenis: string; berkasId: string; caption?: string | null }[],
  baru: { jenis: string; berkasId: string; caption?: string | null }[]
): boolean {
  if (lama.length !== baru.length) return true;
  for (let i = 0; i < lama.length; i++) {
    const a = lama[i];
    const b = baru[i];
    if (
      a.jenis !== b.jenis ||
      a.berkasId !== b.berkasId ||
      (a.caption ?? null) !== (b.caption ?? null)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Aturan verifikasi saat menyimpan konten.
 *
 * - Verifikator (mis. Ketua Umum) & superadmin bebas.
 * - **Create** `PUBLISHED` oleh non-verifikator → ditolak.
 * - **Edit** yang mengubah isi → verifikasi dibatalkan; `Publish` ditolak
 *   sampai diajukan & diverifikasi ulang.
 * - **Terbitkan** konten yang sudah `DISETUJUI` **tanpa** perubahan isi → boleh.
 */
export function gateSimpan(
  sesi: AdminSesi,
  opsi: {
    statusBaru: string | undefined;
    verifikasiLama?: StatusVerifikasiKonten;
    /** Untuk update: apakah payload mengubah isi konten (selain `status`). */
    kontenBerubah?: boolean;
  }
): HasilGate {
  if (bolehVerifikasiKonten(sesi)) return { ok: true, reset: false };

  const mauPublish = opsi.statusBaru === "PUBLISHED";

  // Create — belum ada isi sebelumnya.
  if (opsi.kontenBerubah === undefined) {
    return mauPublish
      ? {
          ok: false,
          pesan: "Konten harus diverifikasi Ketua Umum sebelum diterbitkan.",
        }
      : { ok: true, reset: false };
  }

  // Edit yang mengubah isi → wajib verifikasi ulang.
  if (opsi.kontenBerubah) {
    return mauPublish
      ? {
          ok: false,
          pesan:
            "Konten diubah — ajukan verifikasi ulang ke Ketua Umum sebelum menerbitkan.",
        }
      : { ok: true, reset: true };
  }

  // Tanpa perubahan isi (mis. sekadar menerbitkan).
  if (mauPublish && opsi.verifikasiLama !== "DISETUJUI") {
    return {
      ok: false,
      pesan: "Konten harus diverifikasi Ketua Umum sebelum diterbitkan.",
    };
  }

  return { ok: true, reset: false };
}

/** Kolom yang direset saat verifikasi dibatalkan karena konten diubah. */
export const RESET_VERIFIKASI = {
  verifikasi: "BELUM",
  diverifikasiOleh: null,
  diverifikasiAt: null,
  catatanVerifikasi: null,
} as const;

/** Baris konten yang dinormalkan untuk antrean/verifikasi. */
export type BarisVerifikasi = {
  id: string;
  nama: string;
  status: string;
  verifikasi: StatusVerifikasiKonten;
  divisiId: string | null;
  divisiNama: string | null;
  updatedAt: string;
};

const SELECT_DASAR = {
  id: true,
  status: true,
  verifikasi: true,
  divisiId: true,
  updatedAt: true,
  divisi: { select: { nama: true } },
  // Fallback divisi untuk konten lama yang belum punya `divisiId`.
  createdBy: { select: { divisi: { select: { nama: true } } } },
} as const;

/** Satu baris konten (bukan soft-deleted), atau `null`. */
export async function ambilBarisVerifikasi(
  entitas: EntitasVerifikasi,
  id: string
): Promise<BarisVerifikasi | null> {
  switch (entitas) {
    case "kegiatan": {
      const r = await prisma.kegiatan.findFirst({
        where: { id, deletedAt: null },
        select: { ...SELECT_DASAR, judul: true },
      });
      return r && keBaris(r, r.judul);
    }
    case "berita": {
      const r = await prisma.berita.findFirst({
        where: { id, deletedAt: null },
        select: { ...SELECT_DASAR, judul: true },
      });
      return r && keBaris(r, r.judul);
    }
    case "arsip": {
      const r = await prisma.arsip.findFirst({
        where: { id, deletedAt: null },
        select: { ...SELECT_DASAR, judul: true },
      });
      return r && keBaris(r, r.judul);
    }
    case "kerjasama": {
      const r = await prisma.kerjasama.findFirst({
        where: { id, deletedAt: null },
        select: { ...SELECT_DASAR, organisasi: true },
      });
      return r && keBaris(r, r.organisasi);
    }
  }
}

function keBaris(
  r: {
    id: string;
    status: string;
    verifikasi: StatusVerifikasiKonten;
    divisiId: string | null;
    updatedAt: Date;
    divisi: { nama: string } | null;
    createdBy: { divisi: { nama: string } | null };
  },
  nama: string
): BarisVerifikasi {
  return {
    id: r.id,
    nama,
    status: r.status,
    verifikasi: r.verifikasi,
    divisiId: r.divisiId,
    // Divisi pemilik konten; bila belum berdivisi, pakai divisi pembuatnya.
    divisiNama: r.divisi?.nama ?? r.createdBy.divisi?.nama ?? null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Daftar konten berstatus verifikasi tertentu, lintas entitas. */
export async function daftarVerifikasi(
  verifikasi: StatusVerifikasiKonten,
  opsi: { entitas?: EntitasVerifikasi } = {}
): Promise<(BarisVerifikasi & { entitas: EntitasVerifikasi; label: string })[]> {
  const target: EntitasVerifikasi[] = opsi.entitas
    ? [opsi.entitas]
    : (Object.keys(ENTITAS_VERIFIKASI) as EntitasVerifikasi[]);

  const hasil: (BarisVerifikasi & { entitas: EntitasVerifikasi; label: string })[] =
    [];

  for (const entitas of target) {
    const where = { verifikasi, deletedAt: null };

    let baris: BarisVerifikasi[] = [];
    switch (entitas) {
      case "kegiatan": {
        const rows = await prisma.kegiatan.findMany({
          where,
          orderBy: { updatedAt: "asc" },
          select: { ...SELECT_DASAR, judul: true },
        });
        baris = rows.map((r) => keBaris(r, r.judul));
        break;
      }
      case "berita": {
        const rows = await prisma.berita.findMany({
          where,
          orderBy: { updatedAt: "asc" },
          select: { ...SELECT_DASAR, judul: true },
        });
        baris = rows.map((r) => keBaris(r, r.judul));
        break;
      }
      case "arsip": {
        const rows = await prisma.arsip.findMany({
          where,
          orderBy: { updatedAt: "asc" },
          select: { ...SELECT_DASAR, judul: true },
        });
        baris = rows.map((r) => keBaris(r, r.judul));
        break;
      }
      case "kerjasama": {
        const rows = await prisma.kerjasama.findMany({
          where,
          orderBy: { updatedAt: "asc" },
          select: { ...SELECT_DASAR, organisasi: true },
        });
        baris = rows.map((r) => keBaris(r, r.organisasi));
        break;
      }
    }

    for (const b of baris) {
      hasil.push({
        ...b,
        entitas,
        label: ENTITAS_VERIFIKASI[entitas].label,
      });
    }
  }

  // Divisi pengaju (dari audit ajukan) lebih relevan daripada divisi pemilik
  // konten — terutama untuk konten lama yang belum berdivisi.
  const divisiPengaju = await ambilDivisiPengaju(hasil);
  for (const item of hasil) {
    const nama = divisiPengaju.get(item.id);
    if (nama) item.divisiNama = nama;
  }

  hasil.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return hasil;
}

/**
 * Nama divisi admin yang **mengajukan** verifikasi tiap konten.
 *
 * Diambil dari baris `AuditLog` aksi `KONTEN_AJUKAN` terbaru per konten, jadi
 * yang tampil adalah divisi pengaju — bukan divisi pemilik konten (yang bisa
 * `null` untuk konten lama). Query dibatch: satu query audit + satu query admin.
 */
async function ambilDivisiPengaju(
  baris: { id: string; entitas: EntitasVerifikasi }[]
): Promise<Map<string, string>> {
  if (baris.length === 0) return new Map();

  const label = [
    ...new Set(baris.map((b) => ENTITAS_VERIFIKASI[b.entitas].label)),
  ];
  const ids = baris.map((b) => b.id);

  const audits = await prisma.auditLog.findMany({
    where: { aksi: "KONTEN_AJUKAN", entitas: { in: label }, entitasId: { in: ids } },
    orderBy: { createdAt: "desc" },
    select: { entitasId: true, adminId: true },
  });

  const adminPerKonten = new Map<string, string>();
  for (const a of audits) {
    if (a.adminId && !adminPerKonten.has(a.entitasId)) {
      adminPerKonten.set(a.entitasId, a.adminId);
    }
  }
  if (adminPerKonten.size === 0) return new Map();

  const adminIds = [...new Set(adminPerKonten.values())];
  const admins = await prisma.adminUser.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, divisi: { select: { nama: true } } },
  });
  const namaAdmin = new Map(
    admins.map((a) => [a.id, a.divisi?.nama ?? null])
  );

  const hasil = new Map<string, string>();
  for (const [entitasId, adminId] of adminPerKonten) {
    const nama = namaAdmin.get(adminId);
    if (nama) hasil.set(entitasId, nama);
  }
  return hasil;
}

/** Tulis status verifikasi ke baris konten (bisa di dalam transaksi). */
export async function tulisVerifikasi(
  entitas: EntitasVerifikasi,
  id: string,
  data: {
    verifikasi: StatusVerifikasiKonten;
    diverifikasiOleh?: string | null;
    diverifikasiAt?: Date | null;
    catatanVerifikasi?: string | null;
  },
  client: PrismaClient | Prisma.TransactionClient = prisma
): Promise<void> {
  switch (entitas) {
    case "kegiatan":
      await client.kegiatan.update({ where: { id }, data });
      break;
    case "berita":
      await client.berita.update({ where: { id }, data });
      break;
    case "arsip":
      await client.arsip.update({ where: { id }, data });
      break;
    case "kerjasama":
      await client.kerjasama.update({ where: { id }, data });
      break;
  }
}

/**
 * Baris konten lengkap (termasuk galeri, bila ada) untuk menyusun snapshot.
 *
 * Galeri diurutkan `urutan asc` supaya urutannya ikut dibandingkan — sama
 * dengan cara halaman edit mengambil media.
 */
export async function ambilKontenLengkap(
  entitas: EntitasVerifikasi,
  id: string
): Promise<Record<string, unknown> | null> {
  switch (entitas) {
    case "kegiatan":
      return (await prisma.kegiatan.findFirst({
        where: { id, deletedAt: null },
        include: { media: { orderBy: { urutan: "asc" } } },
      })) as Record<string, unknown> | null;
    case "berita":
      return (await prisma.berita.findFirst({
        where: { id, deletedAt: null },
        include: { media: { orderBy: { urutan: "asc" } } },
      })) as Record<string, unknown> | null;
    case "arsip":
      return (await prisma.arsip.findFirst({
        where: { id, deletedAt: null },
        include: { media: { orderBy: { urutan: "asc" } } },
      })) as Record<string, unknown> | null;
    case "kerjasama":
      return (await prisma.kerjasama.findFirst({
        where: { id, deletedAt: null },
      })) as Record<string, unknown> | null;
  }
}

/** Simpan snapshot isi konten (bisa di dalam transaksi yang sama). */
export async function tulisSnapshot(
  entitas: EntitasVerifikasi,
  id: string,
  snapshot: Prisma.InputJsonValue,
  client: PrismaClient | Prisma.TransactionClient = prisma
): Promise<void> {
  const data = { snapshotVerifikasi: snapshot };
  switch (entitas) {
    case "kegiatan":
      await client.kegiatan.update({ where: { id }, data });
      break;
    case "berita":
      await client.berita.update({ where: { id }, data });
      break;
    case "arsip":
      await client.arsip.update({ where: { id }, data });
      break;
    case "kerjasama":
      await client.kerjasama.update({ where: { id }, data });
      break;
  }
}
