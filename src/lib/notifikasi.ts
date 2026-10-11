import { AksiAudit, Prisma } from "@/generated/prisma/client";
import { RoleAdmin } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { INCLUDE_KONEKSI } from "@/lib/connection";
import { FITUR_JEJARING_ALUMNI } from "@/lib/fitur";
import { boleh, MODUL_INBOX_PER_TIPE } from "@/lib/permission";
import { bolehLihatSemuaDivisi, type AdminSesi } from "@/lib/sesi-admin";

/**
 * Notifikasi admin (inbox) — sumber tunggal feed.
 *
 * Tidak ada tabel notifikasi baru: `AuditLog` sudah mencatat pendaftaran akun
 * (`ALUMNI_REGISTER`) dan seluruh siklus koneksi (`CONNECTION_*`) lengkap dengan
 * pelakunya. Modul ini memetakan baris-baris itu menjadi item siap tampil, jadi
 * tidak ada jalur tulis ganda yang bisa melenceng dari audit trail.
 *
 * "Belum dibaca" dihitung dari dua hal sekaligus:
 * - `AdminUser.notifikasiDibacaAt` — penanda "semua yang lebih lama dari ini
 *   sudah dibaca" (dipakai tombol *Tandai semua sudah dibaca*);
 * - baris `NotifikasiDibaca` — penanda per item, supaya satu notifikasi bisa
 *   ditandai sendiri tanpa menyeret yang lain. Penanda ini juga per admin, jadi
 *   inbox admin A tidak terpengaruh bacaan admin B.
 *
 * Sebuah notifikasi dianggap **sudah dibaca** bila `createdAt` <= penanda waktu
 * itu, atau punya baris di `NotifikasiDibaca`.
 */

/**
 * Aksi audit yang layak jadi notifikasi admin.
 *
 * Aksi yang dilakukan admin sendiri (`ALUMNI_APPROVE`, `ALUMNI_REJECT`, dst.)
 * sengaja tidak dimasukkan: admin tahu ia baru melakukannya. Untuk memangkas
 * noise (mis. tidak perlu tahu setiap ACCEPT/DECLINE), cukup sunting array ini.
 */
export const AKSI_NOTIFIKASI = [
  "ALUMNI_REGISTER",
  "ALUMNI_RESET_PASSWORD_REQUEST",
  "CONNECTION_CREATE",
  "CONNECTION_ACCEPT",
  "CONNECTION_DECLINE",
  "CONNECTION_CANCEL",
  "CONNECTION_REVOKE",
  "KONTEN_AJUKAN",
  "KONTEN_VERIFIKASI",
  "KONTEN_TOLAK",
  "DIVISI_CREATE",
  "DIVISI_UPDATE",
  "DIVISI_DELETE",
  "ADMIN_CREATE",
  "ADMIN_UPDATE",
] as const satisfies readonly AksiAudit[];

export type AksiNotifikasi = (typeof AKSI_NOTIFIKASI)[number];

/**
 * Aksi yang benar-benar dimunculkan di feed Inbox.
 *
 * Saat mode jejaring dimatikan (`@/lib/fitur`), seluruh `CONNECTION_*` disaring
 * keluar: feed, badge belum-dibaca, dan filter "Aktivitas koneksi" tidak lagi
 * memuat aktivitas koneksi. Daftar aslinya (`AKSI_NOTIFIKASI`) tetap utuh
 * supaya bisa diaktifkan kembali tanpa menyunting kode.
 */
const AKSI_AKTIF: readonly AksiNotifikasi[] = FITUR_JEJARING_ALUMNI
  ? AKSI_NOTIFIKASI
  : AKSI_NOTIFIKASI.filter((aksi) => !aksi.startsWith("CONNECTION_"));

export type TipeNotifikasi = "PENDAFTARAN" | "KONEKSI" | "AKUN" | "KONTEN" | "ADMIN";

export type ItemNotifikasi = {
  /** id baris `AuditLog`. */
  id: string;
  tipe: TipeNotifikasi;
  aksi: AksiAudit;
  judul: string;
  pesan: string;
  /** Halaman yang relevan untuk ditindaklanjuti; `null` kalau tidak ada. */
  href: string | null;
  createdAt: string;
  baru: boolean;
};

const JUDUL: Record<AksiNotifikasi, string> = {
  ALUMNI_REGISTER: "Pendaftaran akun baru",
  ALUMNI_RESET_PASSWORD_REQUEST: "Permintaan reset kata sandi",
  CONNECTION_CREATE: "Permintaan koneksi baru",
  CONNECTION_ACCEPT: "Permintaan koneksi diterima",
  CONNECTION_DECLINE: "Permintaan koneksi ditolak",
  CONNECTION_CANCEL: "Permintaan koneksi dibatalkan",
  CONNECTION_REVOKE: "Koneksi diputus",
  KONTEN_AJUKAN: "Konten menunggu verifikasi",
  KONTEN_VERIFIKASI: "Konten diverifikasi",
  KONTEN_TOLAK: "Verifikasi konten ditolak",
  DIVISI_CREATE: "Divisi baru",
  DIVISI_UPDATE: "Divisi diubah",
  DIVISI_DELETE: "Divisi dihapus",
  ADMIN_CREATE: "Akun admin baru",
  ADMIN_UPDATE: "Akun admin diubah",
};

const AUDIT_SELECT = {
  id: true,
  aksi: true,
  entitas: true,
  entitasId: true,
  createdAt: true,
  admin: { select: { nama: true } },
  alumniAccount: {
    select: {
      namaLengkapSaatDaftar: true,
      angkatanSaatDaftar: true,
      email: true,
      alumni: { select: { namaLengkap: true } },
    },
  },
} satisfies Prisma.AuditLogSelect;

type BarisAudit = Prisma.AuditLogGetPayload<{ select: typeof AUDIT_SELECT }>;

function namaAkunAudit(baris: BarisAudit): string {
  const akun = baris.alumniAccount;
  if (!akun) return "Alumni";
  return akun.alumni?.namaLengkap ?? akun.namaLengkapSaatDaftar;
}

/** Catatan penolakan per konten (dipakai notifikasi `KONTEN_TOLAK`). */
async function ambilCatatanTolak(
  rows: BarisAudit[]
): Promise<Map<string, string>> {
  const per: Record<string, string[]> = {
    Kegiatan: [],
    Berita: [],
    Arsip: [],
    Kerjasama: [],
  };
  for (const r of rows) {
    if (r.aksi === "KONTEN_TOLAK" && per[r.entitas]) {
      per[r.entitas].push(r.entitasId);
    }
  }

  const map = new Map<string, string>();
  const [kegiatan, berita, arsip, kerjasama] = await Promise.all([
    per.Kegiatan.length > 0
      ? prisma.kegiatan.findMany({
          where: { id: { in: per.Kegiatan } },
          select: { id: true, catatanVerifikasi: true },
        })
      : [],
    per.Berita.length > 0
      ? prisma.berita.findMany({
          where: { id: { in: per.Berita } },
          select: { id: true, catatanVerifikasi: true },
        })
      : [],
    per.Arsip.length > 0
      ? prisma.arsip.findMany({
          where: { id: { in: per.Arsip } },
          select: { id: true, catatanVerifikasi: true },
        })
      : [],
    per.Kerjasama.length > 0
      ? prisma.kerjasama.findMany({
          where: { id: { in: per.Kerjasama } },
          select: { id: true, catatanVerifikasi: true },
        })
      : [],
  ]);

  for (const x of [...kegiatan, ...berita, ...arsip, ...kerjasama]) {
    if (x.catatanVerifikasi) map.set(x.id, x.catatanVerifikasi);
  }
  return map;
}

/**
 * Susun teks tiap jenis notifikasi. Untuk koneksi, nama pengirim/penerima
 * diambil dari record `Connection` (sumber kebenaran siapa berperan apa),
 * bukan dari pelaku audit.
 */
function keItem(
  baris: BarisAudit,
  koneksi: KoneksiRingkas | null,
  namaTarget: string | null,
  batas: Date | null,
  dibacaIndividu: Set<string>,
  catatanTolak: string | null
): ItemNotifikasi {
  const baru = !dibacaIndividu.has(baris.id) && (batas === null || baris.createdAt > batas);

  if (baris.aksi === "ALUMNI_REGISTER") {
    const nama = namaAkunAudit(baris);
    const angkatan = baris.alumniAccount?.angkatanSaatDaftar;
    return {
      id: baris.id,
      tipe: "PENDAFTARAN",
      aksi: baris.aksi,
      judul: JUDUL.ALUMNI_REGISTER,
      pesan: angkatan
        ? `${nama} (angkatan ${angkatan}) menunggu verifikasi pengurus.`
        : `${nama} menunggu verifikasi pengurus.`,
      href: "/admin/alumni-accounts",
      createdAt: baris.createdAt.toISOString(),
      baru,
    };
  }

  if (baris.aksi === "ALUMNI_RESET_PASSWORD_REQUEST") {
    const nama = namaAkunAudit(baris);
    const email = baris.alumniAccount?.email;
    return {
      id: baris.id,
      tipe: "AKUN",
      aksi: baris.aksi,
      judul: JUDUL.ALUMNI_RESET_PASSWORD_REQUEST,
      pesan: email
        ? `${nama} (${email}) meminta reset kata sandi. Buka verifikasi akun, reset, lalu sampaikan kata sandi baru lewat kanal resmi.`
        : `${nama} meminta reset kata sandi.`,
      href: "/admin/alumni-accounts",
      createdAt: baris.createdAt.toISOString(),
      baru,
    };
  }

  if (
    baris.aksi === "KONTEN_AJUKAN" ||
    baris.aksi === "KONTEN_VERIFIKASI" ||
    baris.aksi === "KONTEN_TOLAK"
  ) {
    const namaAdmin = baris.admin?.nama ?? "Pengurus";
    const labelEntitas = baris.entitas.toLowerCase();
    const pesan =
      baris.aksi === "KONTEN_AJUKAN"
        ? `${namaAdmin} mengajukan ${labelEntitas} untuk diverifikasi.`
        : baris.aksi === "KONTEN_VERIFIKASI"
          ? `${namaAdmin} memverifikasi ${labelEntitas}.`
          : `${namaAdmin} menolak verifikasi ${labelEntitas}.${
              catatanTolak ? ` Alasan: ${catatanTolak}` : ""
            }`;

    return {
      id: baris.id,
      tipe: "KONTEN",
      aksi: baris.aksi,
      judul: JUDUL[baris.aksi],
      pesan,
      // Hanya "menunggu verifikasi" yang butuh tindak lanjut.
      href: baris.aksi === "KONTEN_AJUKAN" ? "/admin/verifikasi" : null,
      createdAt: baris.createdAt.toISOString(),
      baru,
    };
  }

  if (
    baris.aksi === "DIVISI_CREATE" ||
    baris.aksi === "DIVISI_UPDATE" ||
    baris.aksi === "DIVISI_DELETE" ||
    baris.aksi === "ADMIN_CREATE" ||
    baris.aksi === "ADMIN_UPDATE"
  ) {
    const namaAdmin = baris.admin?.nama ?? "Pengurus";
    const target = namaTarget ?? baris.entitas;
    const pesan =
      baris.aksi === "DIVISI_CREATE"
        ? `${namaAdmin} menambahkan divisi ${target}.`
        : baris.aksi === "DIVISI_UPDATE"
          ? `${namaAdmin} mengubah divisi ${target}.`
          : baris.aksi === "DIVISI_DELETE"
            ? `${namaAdmin} menghapus divisi ${target}.`
            : baris.aksi === "ADMIN_CREATE"
              ? `${namaAdmin} membuat akun admin ${target}.`
              : `${namaAdmin} mengubah akun admin ${target}.`;

    return {
      id: baris.id,
      tipe: "ADMIN",
      aksi: baris.aksi,
      judul: JUDUL[baris.aksi],
      pesan,
      href: "/admin/admin-users",
      createdAt: baris.createdAt.toISOString(),
      baru,
    };
  }

  const judul = JUDUL[baris.aksi as AksiNotifikasi] ?? "Aktivitas koneksi";

  if (!koneksi) {
    return {
      id: baris.id,
      tipe: "KONEKSI",
      aksi: baris.aksi,
      judul,
      pesan: `${namaAkunAudit(baris)} — data koneksi tidak lagi tersedia.`,
      href: null,
      createdAt: baris.createdAt.toISOString(),
      baru,
    };
  }

  const pengirim = koneksi.requesterName;
  const penerima = koneksi.recipientName;

  let pesan: string;
  switch (baris.aksi) {
    case "CONNECTION_CREATE":
      pesan = `${pengirim} mengirim permintaan koneksi kepada ${penerima}.`;
      break;
    case "CONNECTION_ACCEPT":
      pesan = `${penerima} menerima permintaan koneksi dari ${pengirim}.`;
      break;
    case "CONNECTION_DECLINE":
      pesan = `${penerima} menolak permintaan koneksi dari ${pengirim}.`;
      break;
    case "CONNECTION_CANCEL":
      pesan = `${pengirim} membatalkan permintaan koneksi kepada ${penerima}.`;
      break;
    case "CONNECTION_REVOKE":
      pesan = `Koneksi antara ${pengirim} dan ${penerima} diputus.`;
      break;
    default:
      pesan = `${pengirim} — ${judul.toLowerCase()}.`;
  }

  return {
    id: baris.id,
    tipe: "KONEKSI",
    aksi: baris.aksi,
    judul,
    pesan,
    href: null,
    createdAt: baris.createdAt.toISOString(),
    baru,
  };
}

type KoneksiRingkas = {
  requesterName: string;
  recipientName: string;
};

/** Aksi yang termasuk satu tipe; `undefined` berarti semua tipe. */
function aksiUntukTipe(tipe?: TipeNotifikasi): AksiAudit[] {
  if (tipe === "PENDAFTARAN") return ["ALUMNI_REGISTER"];
  if (tipe === "AKUN") return ["ALUMNI_RESET_PASSWORD_REQUEST"];
  if (tipe === "KONTEN") {
    return ["KONTEN_AJUKAN", "KONTEN_VERIFIKASI", "KONTEN_TOLAK"];
  }
  if (tipe === "ADMIN") {
    return [
      "DIVISI_CREATE",
      "DIVISI_UPDATE",
      "DIVISI_DELETE",
      "ADMIN_CREATE",
      "ADMIN_UPDATE",
    ];
  }
  if (tipe === "KONEKSI") {
    /*
     * Saat mode jejaring mati, `AKSI_AKTIF` tidak memuat `CONNECTION_*`,
     * sehingga filter ini mengembalikan daftar kosong — dan `in: []` tidak
     * mencocokkan baris apa pun.
     */
    return AKSI_AKTIF.filter((aksi) => aksi.startsWith("CONNECTION_"));
  }
  return [...AKSI_AKTIF];
}

/** Tipe notifikasi dari satu aksi audit. */
function tipeDariAksi(aksi: string): TipeNotifikasi {
  if (aksi === "ALUMNI_REGISTER") return "PENDAFTARAN";
  if (aksi === "ALUMNI_RESET_PASSWORD_REQUEST") return "AKUN";
  if (aksi.startsWith("CONNECTION_")) return "KONEKSI";
  if (aksi.startsWith("KONTEN_")) return "KONTEN";
  return "ADMIN";
}

/**
 * Tipe notifikasi yang boleh dilihat admin ini, dari izin modul Inbox
 * (dipecah per kategori). Superadmin melihat semuanya.
 */
export function tipeNotifikasiDiizinkan(sesi: AdminSesi): TipeNotifikasi[] {
  const semua: TipeNotifikasi[] = ["PENDAFTARAN", "AKUN", "KONTEN", "ADMIN"];
  if (sesi.role === RoleAdmin.SUPERADMIN) return semua;
  return semua.filter((t) =>
    boleh(sesi.permissions, MODUL_INBOX_PER_TIPE[t], "lihat")
  );
}

/** Aksi audit untuk sekumpulan tipe yang diizinkan. */
function aksiDariTipe(tipeList: TipeNotifikasi[]): AksiAudit[] {
  return AKSI_AKTIF.filter((aksi) => tipeList.includes(tipeDariAksi(aksi)));
}

/**
 * Fragmen `where` untuk notifikasi verifikasi konten, dibatasi ke divisi admin.
 *
 * `null` berarti tidak dibatasi (superadmin / lintas divisi / tanpa divisi).
 * Selain itu, hanya konten yang **diajukan divisi ini** atau **dimiliki divisi
 * ini** yang terlihat — jadi divisi A tidak melihat riwayat verifikasi divisi B.
 * Konten dikenali lewat `entitasId` baris audit (id konten unik lintas entitas).
 */
async function kontenTerlihatWhere(
  sesi: AdminSesi
): Promise<Prisma.AuditLogWhereInput | null> {
  if (bolehLihatSemuaDivisi(sesi)) return null;
  const divisiId = sesi.divisi?.id;
  if (!divisiId) return null;

  const ids = new Set<string>();

  // Konten yang diajukan oleh admin divisi ini (termasuk konten lama tanpa
  // pemilik) — ini yang membuat "divisi A melihat notif dirinya sendiri".
  const diajukan = await prisma.auditLog.findMany({
    where: { aksi: "KONTEN_AJUKAN", admin: { divisiId } },
    select: { entitasId: true },
  });
  for (const a of diajukan) ids.add(a.entitasId);

  // Konten yang pemiliknya divisi ini.
  const [kegiatan, berita, arsip, kerjasama] = await Promise.all([
    prisma.kegiatan.findMany({ where: { divisiId }, select: { id: true } }),
    prisma.berita.findMany({ where: { divisiId }, select: { id: true } }),
    prisma.arsip.findMany({ where: { divisiId }, select: { id: true } }),
    prisma.kerjasama.findMany({ where: { divisiId }, select: { id: true } }),
  ]);
  for (const r of [...kegiatan, ...berita, ...arsip, ...kerjasama]) {
    ids.add(r.id);
  }

  return { entitasId: { in: [...ids] } };
}

async function whereNotifikasi(
  sesi: AdminSesi,
  tipe?: TipeNotifikasi,
  tipeDiizinkan?: TipeNotifikasi[]
): Promise<Prisma.AuditLogWhereInput> {
  const aksi = tipe
    ? aksiUntukTipe(tipe)
    : tipeDiizinkan
      ? aksiDariTipe(tipeDiizinkan)
      : aksiUntukTipe();

  const konten = aksi.filter((a) => a.startsWith("KONTEN_"));
  const lain = aksi.filter((a) => !a.startsWith("KONTEN_"));

  const klausa: Prisma.AuditLogWhereInput[] = [];
  if (lain.length > 0) {
    klausa.push({ aksi: { in: lain } });
  }
  if (konten.length > 0) {
    const scopeKonten = await kontenTerlihatWhere(sesi);
    const divisiId = sesi.divisi?.id;

    if (!scopeKonten) {
      klausa.push({ aksi: { in: konten } });
    } else {
      /*
       * Notifikasi konten dipecah:
       * - **Ajuan** hanya yang diajukan divisi ini — supaya divisi A tidak
       *   melihat ajuan divisi B, termasuk saat keduanya pernah mengajukan
       *   konten yang sama.
       * - **Keputusan verifikator** (verifikasi/tolak) tetap terlihat selama
       *   kontennya milik/diajukan divisi ini.
       */
      const ajukan = konten.filter((a) => a === "KONTEN_AJUKAN");
      const keputusan = konten.filter((a) => a !== "KONTEN_AJUKAN");
      const sub: Prisma.AuditLogWhereInput[] = [];

      if (ajukan.length > 0 && divisiId) {
        sub.push({ aksi: { in: ajukan }, admin: { divisiId } });
      }
      if (keputusan.length > 0) {
        sub.push({ aksi: { in: keputusan }, ...scopeKonten });
      }

      if (sub.length === 1) klausa.push(sub[0]);
      else if (sub.length > 1) klausa.push({ OR: sub });
    }
  }

  if (klausa.length === 1) return klausa[0];
  // Tidak ada aksi yang cocok (mis. tipe tanpa izin) → cocokkan nol baris.
  return klausa.length === 0 ? { aksi: { in: [] } } : { OR: klausa };
}

async function batasDibaca(adminId: string): Promise<Date | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { notifikasiDibacaAt: true },
  });
  return admin?.notifikasiDibacaAt ?? null;
}

/** Badge menghitung tipe yang boleh dilihat admin, bukan hasil filter halaman. */
export async function hitungBelumDibaca(sesi: AdminSesi): Promise<number> {
  const adminId = sesi.sub;
  const diizinkan = tipeNotifikasiDiizinkan(sesi);
  const where = await whereNotifikasi(sesi, undefined, diizinkan);
  const batas = await batasDibaca(adminId);
  return prisma.auditLog.count({
    where: {
      ...where,
      createdAt: { gt: batas ?? new Date(0) },
      // Yang sudah ditandai dibaca satu per satu tidak ikut dihitung.
      dibacaOleh: { none: { adminId } },
    },
  });
}

/**
 * Tandai satu notifikasi sudah dibaca oleh admin ini.
 *
 * Mengembalikan jumlah yang benar-benar berubah (0 bila notifikasi itu sudah
 * terbaca lewat penanda waktu, atau memang sudah ditandai) supaya pemanggil bisa
 * membedakan "berhasil" dari "tidak ada yang perlu diubah".
 */
export async function tandaiSatuNotifikasiDibaca(
  sesi: AdminSesi,
  auditLogId: string
): Promise<{ ada: boolean; berubah: number }> {
  const adminId = sesi.sub;
  // Batas divisi juga berlaku di sini: admin tidak bisa menandai notifikasi
  // yang bukan miliknya (mis. riwayat verifikasi divisi lain).
  const baris = await prisma.auditLog.findFirst({
    where: { id: auditLogId, ...(await whereNotifikasi(sesi)) },
    select: { id: true, createdAt: true },
  });

  if (!baris) {
    return { ada: false, berubah: 0 };
  }

  const batas = await batasDibaca(adminId);

  // Sudah tercakup penanda waktu: tidak perlu baris baru.
  if (batas !== null && baris.createdAt <= batas) {
    return { ada: true, berubah: 0 };
  }

  const hasil = await prisma.notifikasiDibaca.createMany({
    data: [{ adminId, auditLogId }],
    skipDuplicates: true,
  });

  return { ada: true, berubah: hasil.count };
}

/**
 * Tandai semua notifikasi sudah dibaca (per admin).
 *
 * Cukup menggeser satu penanda waktu, bukan menulis satu baris per notifikasi.
 * Penanda per item yang jadi usang (lebih lama dari penanda waktu) dibersihkan
 * sekalian supaya tabelnya tidak tumbuh tanpa batas.
 */
export async function tandaiSemuaNotifikasiDibaca(
  adminId: string
): Promise<Date> {
  const sekarang = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id: adminId },
      data: { notifikasiDibacaAt: sekarang },
    });

    await tx.notifikasiDibaca.deleteMany({
      where: { adminId, auditLog: { createdAt: { lte: sekarang } } },
    });
  });

  return sekarang;
}

export async function ambilNotifikasiAdmin(
  sesi: AdminSesi,
  opsi: {
    skip: number;
    take: number;
    tipe?: TipeNotifikasi;
    tipeDiizinkan?: TipeNotifikasi[];
  }
): Promise<{ items: ItemNotifikasi[]; total: number; belumDibaca: number }> {
  const adminId = sesi.sub;
  const batas = await batasDibaca(adminId);
  const where = await whereNotifikasi(sesi, opsi.tipe, opsi.tipeDiizinkan);
  const whereDiizinkan = await whereNotifikasi(
    sesi,
    undefined,
    opsi.tipeDiizinkan
  );

  const [rows, total, belumDibaca] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: opsi.skip,
      take: opsi.take,
      select: AUDIT_SELECT,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({
      where: {
        ...whereDiizinkan,
        createdAt: { gt: batas ?? new Date(0) },
        dibacaOleh: { none: { adminId } },
      },
    }),
  ]);

  /*
   * `AuditLog.entitasId` bukan foreign key, jadi koneksi diambil lewat kueri
   * kedua berbasis `id IN (...)` — bukan `include`. Hanya halaman ini yang
   * diambil supaya jumlah query tetap konstan.
   */
  const idKoneksi = rows
    .filter((row) => row.aksi.startsWith("CONNECTION_"))
    .map((row) => row.entitasId);

  const koneksi =
    idKoneksi.length > 0
      ? await prisma.connection.findMany({
          where: { id: { in: idKoneksi } },
          include: INCLUDE_KONEKSI,
        })
      : [];

  const petaKoneksi = new Map<string, KoneksiRingkas>(
    koneksi.map((k) => [
      k.id,
      {
        requesterName: k.requester.alumni?.namaLengkap ?? "Alumni",
        recipientName: k.recipient.alumni?.namaLengkap ?? "Alumni",
      },
    ])
  );

  /*
   * Penanda baca per item hanya diambil untuk baris di halaman ini (bukan
   * seluruh tabel), jadi jumlah query tetap konstan seperti pengambilan
   * koneksi di bawah.
   */
  const idBaris = rows.map((row) => row.id);
  const barisDibaca =
    idBaris.length > 0
      ? await prisma.notifikasiDibaca.findMany({
          where: { adminId, auditLogId: { in: idBaris } },
          select: { auditLogId: true },
        })
      : [];

  const dibacaIndividu = new Set(barisDibaca.map((b) => b.auditLogId));

  /*
   * Nama objek untuk notifikasi administrasi (divisi / akun admin), diambil
   * dengan kueri `id IN (...)` seperti koneksi — bukan `include`.
   */
  const idDivisi = rows
    .filter((row) => row.aksi.startsWith("DIVISI_"))
    .map((row) => row.entitasId);
  const idAdminTarget = rows
    .filter((row) => row.aksi.startsWith("ADMIN_"))
    .map((row) => row.entitasId);

  const [divisiTarget, adminTarget] = await Promise.all([
    idDivisi.length > 0
      ? prisma.divisi.findMany({
          where: { id: { in: idDivisi } },
          select: { id: true, nama: true },
        })
      : [],
    idAdminTarget.length > 0
      ? prisma.adminUser.findMany({
          where: { id: { in: idAdminTarget } },
          select: { id: true, nama: true },
        })
      : [],
  ]);

  const petaTarget = new Map<string, string>();
  for (const d of divisiTarget) petaTarget.set(`Divisi:${d.id}`, d.nama);
  for (const a of adminTarget) petaTarget.set(`AdminUser:${a.id}`, a.nama);

  const petaCatatanTolak = await ambilCatatanTolak(rows);

  const items = rows.map((row) =>
    keItem(
      row,
      petaKoneksi.get(row.entitasId) ?? null,
      petaTarget.get(`${row.entitas}:${row.entitasId}`) ?? null,
      batas,
      dibacaIndividu,
      petaCatatanTolak.get(row.entitasId) ?? null
    )
  );

  return { items, total, belumDibaca };
}
