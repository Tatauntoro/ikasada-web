import type { AksiAudit } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { kalimatAktivitas, labelEntitas } from "@/lib/aktivitas";

/**
 * Penyusun log aktivitas dari `AuditLog`.
 *
 * Nama aktor dan nama objek **di-resolve saat baca** (bukan disimpan di baris
 * audit), jadi teks tetap benar walau record diubah namanya, dan record yang
 * di-soft-delete pun namanya masih bisa ditampilkan. Resolusi dibatch: satu
 * query per tipe entitas, berapa pun jumlah barisnya.
 */

export type ItemAktivitas = {
  id: string;
  waktu: string;
  aktorNama: string;
  aktorJenis: "admin" | "alumni";
  kalimat: string;
  /** Label modul (mis. "Data Alumni"). */
  modul: string;
  entitas: string;
  entitasId: string;
};

export type BarisAudit = {
  id: string;
  aksi: AksiAudit;
  entitas: string;
  entitasId: string;
  createdAt: Date;
  adminId: string | null;
  alumniAccountId: string | null;
};

const SELECT_AUDIT = {
  id: true,
  aksi: true,
  entitas: true,
  entitasId: true,
  createdAt: true,
  adminId: true,
  alumniAccountId: true,
} as const;

type AkunRingkas = {
  namaLengkapSaatDaftar: string;
  alumni: { namaLengkap: string } | null;
};

function namaAkun(a: AkunRingkas): string {
  return a.alumni?.namaLengkap ?? a.namaLengkapSaatDaftar;
}

async function ambilNamaAktor(
  rows: BarisAudit[]
): Promise<Map<string, { nama: string; jenis: "admin" | "alumni" }>> {
  const adminIds = [
    ...new Set(rows.map((r) => r.adminId).filter((v): v is string => Boolean(v))),
  ];
  const akunIds = [
    ...new Set(
      rows.map((r) => r.alumniAccountId).filter((v): v is string => Boolean(v))
    ),
  ];

  const [admins, akuns] = await Promise.all([
    prisma.adminUser.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, nama: true },
    }),
    prisma.alumniAccount.findMany({
      where: { id: { in: akunIds } },
      select: {
        id: true,
        namaLengkapSaatDaftar: true,
        alumni: { select: { namaLengkap: true } },
      },
    }),
  ]);

  const map = new Map<string, { nama: string; jenis: "admin" | "alumni" }>();
  for (const a of admins) map.set(a.id, { nama: a.nama, jenis: "admin" });
  for (const a of akuns) map.set(a.id, { nama: namaAkun(a), jenis: "alumni" });
  return map;
}

type KoneksiRingkas = {
  reqId: string;
  reqNama: string;
  recId: string;
  recNama: string;
};

async function ambilNamaObjek(rows: BarisAudit[]): Promise<{
  objek: Map<string, string>;
  koneksi: Map<string, KoneksiRingkas>;
}> {
  const objek = new Map<string, string>();
  const ids = (entitas: string) => [
    ...new Set(
      rows.filter((r) => r.entitas === entitas).map((r) => r.entitasId)
    ),
  ];

  const [kegiatan, alumni, pengurus, kerjasama, arsip, akun, admin, koneksi] =
    await Promise.all([
      prisma.kegiatan.findMany({
        where: { id: { in: ids("Kegiatan") } },
        select: { id: true, judul: true },
      }),
      prisma.alumni.findMany({
        where: { id: { in: ids("Alumni") } },
        select: { id: true, namaLengkap: true },
      }),
      prisma.pengurus.findMany({
        where: { id: { in: ids("Pengurus") } },
        select: { id: true, nama: true },
      }),
      prisma.kerjasama.findMany({
        where: { id: { in: ids("Kerjasama") } },
        select: { id: true, organisasi: true },
      }),
      prisma.arsip.findMany({
        where: { id: { in: ids("Arsip") } },
        select: { id: true, judul: true },
      }),
      prisma.alumniAccount.findMany({
        where: { id: { in: ids("AlumniAccount") } },
        select: {
          id: true,
          namaLengkapSaatDaftar: true,
          alumni: { select: { namaLengkap: true } },
        },
      }),
      prisma.adminUser.findMany({
        where: { id: { in: ids("AdminUser") } },
        select: { id: true, nama: true },
      }),
      prisma.connection.findMany({
        where: { id: { in: ids("Connection") } },
        select: {
          id: true,
          requesterAccountId: true,
          recipientAccountId: true,
          requester: {
            select: {
              namaLengkapSaatDaftar: true,
              alumni: { select: { namaLengkap: true } },
            },
          },
          recipient: {
            select: {
              namaLengkapSaatDaftar: true,
              alumni: { select: { namaLengkap: true } },
            },
          },
        },
      }),
    ]);

  for (const k of kegiatan) objek.set(`Kegiatan:${k.id}`, k.judul);
  for (const a of alumni) objek.set(`Alumni:${a.id}`, a.namaLengkap);
  for (const p of pengurus) objek.set(`Pengurus:${p.id}`, p.nama);
  for (const k of kerjasama) objek.set(`Kerjasama:${k.id}`, k.organisasi);
  for (const a of arsip) objek.set(`Arsip:${a.id}`, a.judul);
  for (const a of akun) objek.set(`AlumniAccount:${a.id}`, namaAkun(a));
  for (const a of admin) objek.set(`AdminUser:${a.id}`, a.nama);

  const koneksiMap = new Map<string, KoneksiRingkas>(
    koneksi.map((k) => [
      k.id,
      {
        reqId: k.requesterAccountId,
        reqNama: namaAkun(k.requester),
        recId: k.recipientAccountId,
        recNama: namaAkun(k.recipient),
      },
    ])
  );

  return { objek, koneksi: koneksiMap };
}

/** Ubah baris audit (sudah terurut) menjadi item siap tampil. */
export async function susunAktivitas(
  rows: BarisAudit[]
): Promise<ItemAktivitas[]> {
  if (rows.length === 0) return [];

  const [aktor, { objek, koneksi }] = await Promise.all([
    ambilNamaAktor(rows),
    ambilNamaObjek(rows),
  ]);

  return rows.map((r) => {
    const key = r.adminId ?? r.alumniAccountId ?? "";
    const aktorInfo =
      aktor.get(key) ??
      { nama: "Tidak diketahui", jenis: r.adminId ? "admin" : "alumni" };

    let namaObjek: string | undefined;
    if (r.entitas === "Connection") {
      const k = koneksi.get(r.entitasId);
      if (k && r.alumniAccountId) {
        namaObjek =
          k.reqId === r.alumniAccountId ? k.recNama : k.reqNama;
      }
    } else {
      namaObjek = objek.get(`${r.entitas}:${r.entitasId}`);
    }

    return {
      id: r.id,
      waktu: r.createdAt.toISOString(),
      aktorNama: aktorInfo.nama,
      aktorJenis: aktorInfo.jenis,
      kalimat: kalimatAktivitas(r.aksi, r.entitas, namaObjek),
      modul: labelEntitas(r.entitas),
      entitas: r.entitas,
      entitasId: r.entitasId,
    };
  });
}

/** Ambil satu halaman log + total. */
export async function ambilAktivitas(opts: {
  where: Prisma.AuditLogWhereInput;
  skip: number;
  take: number;
}): Promise<{ items: ItemAktivitas[]; total: number }> {
  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where: opts.where,
      orderBy: { createdAt: "desc" },
      skip: opts.skip,
      take: opts.take,
      select: SELECT_AUDIT,
    }),
    prisma.auditLog.count({ where: opts.where }),
  ]);

  const items = await susunAktivitas(rows as BarisAudit[]);
  return { items, total };
}

/** Aktivitas terbaru per admin (untuk kolom ringkas di Kelola Admin). */
export async function aktivitasTerakhirPerAdmin(
  adminIds: string[]
): Promise<Map<string, ItemAktivitas>> {
  const map = new Map<string, ItemAktivitas>();
  if (adminIds.length === 0) return map;

  const terbaru = await Promise.all(
    adminIds.map((id) =>
      prisma.auditLog.findFirst({
        where: { adminId: id },
        orderBy: { createdAt: "desc" },
        select: SELECT_AUDIT,
      })
    )
  );

  const rows = terbaru.filter((r): r is NonNullable<typeof r> => r !== null);
  const items = await susunAktivitas(rows as BarisAudit[]);
  const byId = new Map(items.map((it) => [it.id, it]));

  terbaru.forEach((r) => {
    if (!r || !r.adminId) return;
    const it = byId.get(r.id);
    if (it) map.set(r.adminId, it);
  });

  return map;
}
