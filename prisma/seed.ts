import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db";
import {
  alumniAwal,
  arsipAwal,
  beritaAwal,
  jenisArsipAwal,
  jenisBeritaAwal,
  kegiatanAwal,
  kerjasamaAwal,
  pengurusAwal,
} from "./data-awal";
import { MODUL, MODUL_INBOX, MODUL_SLUGS, type Izin } from "../src/lib/permission";
import { SECTION_DEFAULT } from "../src/lib/beranda";
import benuaData from "../src/data/benua.json";

/**
 * Semua modul dengan aksi `lihat` — dipakai template divisi "lintas".
 *
 * Modul Inbox diberi tambahan `tindak-lanjut` supaya pemegangnya boleh membuka
 * halaman tujuan dari notifikasi (mis. Verifikasi Konten).
 */
const semuaLihat = Object.fromEntries(
  MODUL_SLUGS.map((m) => [m, MODUL_INBOX.includes(m) ? ["lihat", "tindak-lanjut"] : ["lihat"]])
) as Izin;

/**
 * Divisi awal + template izinnya.
 *
 * `permissions` hanya template: saat admin ditempatkan di divisi ini, matriks
 * izinnya diisi dari sini (tetap bisa diubah per-admin di Kelola Admin).
 * `lintasDivisi` = boleh melihat konten semua divisi (Ketua Umum).
 */
const divisiAwal: {
  nama: string;
  urutan: number;
  lintasDivisi: boolean;
  permissions: Izin;
}[] = [
  {
    nama: "Ketua Umum",
    urutan: 1,
    lintasDivisi: true,
    // Lihat semua modul + boleh memverifikasi konten divisi lain.
    permissions: {
      ...semuaLihat,
      [MODUL.VERIFIKASI_KONTEN]: ["lihat", "ubah"],
      [MODUL.DASHBOARD]: ["lihat", "lihat-detail"],
    },
  },
  {
    nama: "Sekretariat",
    urutan: 2,
    lintasDivisi: false,
    permissions: {
      [MODUL.DASHBOARD]: ["lihat", "lihat-detail"],
      [MODUL.ALUMNI]: ["lihat", "tambah", "ubah"],
      [MODUL.VERIFIKASI_AKUN]: ["lihat", "ubah"],
      [MODUL.PENGURUS]: ["lihat", "tambah", "ubah"],
      [MODUL.KERJASAMA]: ["lihat", "tambah", "ubah"],
      [MODUL.ARSIP]: ["lihat", "tambah", "ubah"],
      [MODUL.BERITA]: ["lihat", "tambah", "ubah"],
      [MODUL.KEGIATAN]: ["lihat", "tambah", "ubah"],
      [MODUL.JENIS_ARSIP]: ["lihat"],
      [MODUL.JENIS_BERITA]: ["lihat"],
      [MODUL.KATEGORI_KEGIATAN]: ["lihat"],
      [MODUL.SEKTOR_INDUSTRI]: ["lihat"],
      [MODUL.INBOX_PENDAFTARAN]: ["lihat", "tindak-lanjut"],
      [MODUL.INBOX_PERMINTAAN]: ["lihat", "tindak-lanjut"],
    },
  },
  {
    nama: "Humas",
    urutan: 3,
    lintasDivisi: false,
    permissions: {
      [MODUL.DASHBOARD]: ["lihat", "lihat-detail"],
      [MODUL.BERITA]: ["lihat", "tambah", "ubah"],
      [MODUL.KEGIATAN]: ["lihat", "tambah", "ubah"],
      [MODUL.KERJASAMA]: ["lihat", "tambah", "ubah"],
      [MODUL.ARSIP]: ["lihat", "tambah", "ubah"],
      [MODUL.JENIS_BERITA]: ["lihat"],
      [MODUL.KATEGORI_KEGIATAN]: ["lihat"],
      [MODUL.SEKTOR_INDUSTRI]: ["lihat"],
      [MODUL.INBOX_KONTEN]: ["lihat", "tindak-lanjut"],
    },
  },
  {
    nama: "Litbang",
    urutan: 4,
    lintasDivisi: false,
    permissions: {
      [MODUL.DASHBOARD]: ["lihat", "lihat-detail"],
      [MODUL.ARSIP]: ["lihat", "tambah", "ubah"],
      [MODUL.KEGIATAN]: ["lihat", "tambah", "ubah"],
      [MODUL.BERITA]: ["lihat", "tambah", "ubah"],
      [MODUL.JENIS_ARSIP]: ["lihat"],
      [MODUL.KATEGORI_KEGIATAN]: ["lihat"],
      [MODUL.INBOX_KONTEN]: ["lihat", "tindak-lanjut"],
    },
  },
];

const sektorIndustriList = [
  "Pemerintahan",
  "Media",
  "Pendidikan",
  "BUMN",
  "Swasta",
  "Lainnya",
];

const kategoriKegiatanList = [
  "WORKSHOP",
  "SEMINAR",
  "GATHERING",
  "LAINNYA",
];

async function main() {
  // 1. Seed admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD wajib diisi di .env");
  }

  const passwordHash = await hash(adminPassword, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    // Admin seed selalu jadi pemilik penuh supaya tidak ada lockout setelah
    // migrasi role/izin.
    update: { role: "SUPERADMIN", isAktif: true },
    create: {
      nama: "Admin IKASADA",
      email: adminEmail,
      passwordHash,
      role: "SUPERADMIN",
    },
  });

  console.log(`✅ Admin user: ${admin.email}`);

  // 2. Seed sektor industri
  const sektorMap = new Map<string, string>();

  for (const nama of sektorIndustriList) {
    const sektor = await prisma.sektorIndustri.upsert({
      where: { namaSektor: nama },
      update: {},
      create: { namaSektor: nama },
    });
    sektorMap.set(nama, sektor.id);
    console.log(`✅ Sektor industri: ${sektor.namaSektor}`);
  }

  // 3. Seed kategori kegiatan
  const kategoriMap = new Map<string, string>();

  for (const nama of kategoriKegiatanList) {
    const kategori = await prisma.kategoriKegiatan.upsert({
      where: { namaKategori: nama },
      update: {},
      create: { namaKategori: nama },
    });
    kategoriMap.set(nama, kategori.id);
    console.log(`✅ Kategori kegiatan: ${kategori.namaKategori}`);
  }

  // 3b. Seed divisi (master data) + template izinnya
  for (const d of divisiAwal) {
    const slug = d.nama
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    await prisma.divisi.upsert({
      where: { nama: d.nama },
      // Jangan timpa konfigurasi divisi yang sudah disesuaikan manual.
      update: {},
      create: {
        nama: d.nama,
        slug,
        urutan: d.urutan,
        lintasDivisi: d.lintasDivisi,
        permissions: d.permissions,
      },
    });
    console.log(`✅ Divisi: ${d.nama}`);
  }

  // 3c. Seed section beranda + titik sebaran default (tidak menimpa yang sudah diatur)
  for (const s of SECTION_DEFAULT) {
    await prisma.sectionBeranda.upsert({
      where: { kunci: s.kunci },
      update: {},
      create: {
        kunci: s.kunci,
        urutan: s.urutan,
        eyebrow: s.eyebrow ?? null,
        judul: s.judul ?? null,
        deskripsi: s.deskripsi ?? null,
      },
    });
  }
  console.log(`✅ ${SECTION_DEFAULT.length} section beranda`);

  const titikCount = await prisma.titikSebaran.count({
    where: { deletedAt: null },
  });
  if (titikCount === 0) {
    const benua = (benuaData as {
      benua: { nama: string; lat: number; lng: number }[];
    }).benua;
    await prisma.titikSebaran.createMany({
      data: benua.map((b, i) => ({
        nama: b.nama,
        lat: b.lat,
        lng: b.lng,
        urutan: i,
      })),
    });
    console.log(`✅ ${benua.length} titik sebaran geografis`);
  } else {
    console.log("ℹ️ Titik sebaran sudah ada, skip seed titik");
  }

  // 4. Seed alumni awal (hanya jika belum ada data alumni)
  const alumniCount = await prisma.alumni.count({ where: { deletedAt: null } });
  if (alumniCount === 0) {
    await prisma.alumni.createMany({
      data: alumniAwal.map((a) => {
        const { industriNama, ...rest } = a;
        return {
          ...rest,
          status: a.status ?? "PUBLISHED",
          sektorIndustriId: sektorMap.get(industriNama) ?? sektorMap.get("Lainnya")!,
          createdById: admin.id,
        };
      }),
    });
    console.log(`✅ ${alumniAwal.length} alumni awal dibuat`);
  } else {
    console.log("ℹ️ Alumni sudah ada, skip seed alumni awal");
  }

  // 5. Seed kegiatan awal (hanya jika belum ada data kegiatan)
  const kegiatanCount = await prisma.kegiatan.count({
    where: { deletedAt: null },
  });
  if (kegiatanCount === 0) {
    await prisma.kegiatan.createMany({
      data: kegiatanAwal.map((k) => {
        const { kategori, ...rest } = k;
        return {
          ...rest,
          kategoriKegiatanId:
            kategoriMap.get(kategori) ?? kategoriMap.get("LAINNYA")!,
          createdById: admin.id,
        };
      }),
    });
    console.log(`✅ ${kegiatanAwal.length} kegiatan awal dibuat`);
  } else {
    console.log("ℹ️ Kegiatan sudah ada, skip seed kegiatan awal");
  }

  // 6. Seed pengurus awal (hanya jika belum ada data pengurus)
  const pengurusCount = await prisma.pengurus.count({
    where: { deletedAt: null },
  });
  if (pengurusCount === 0) {
    await prisma.pengurus.createMany({
      data: pengurusAwal.map((p) => ({
        ...p,
        createdById: admin.id,
      })),
    });
    console.log(`✅ ${pengurusAwal.length} pengurus awal dibuat`);
  } else {
    console.log("ℹ️ Pengurus sudah ada, skip seed pengurus awal");
  }

  // 7. Seed kerjasama awal (hanya jika belum ada data kerjasama)
  const kerjasamaCount = await prisma.kerjasama.count({
    where: { deletedAt: null },
  });
  if (kerjasamaCount === 0) {
    await prisma.kerjasama.createMany({
      data: kerjasamaAwal.map((k) => ({
        ...k,
        createdById: admin.id,
      })),
    });
    console.log(`✅ ${kerjasamaAwal.length} kerjasama awal dibuat`);
  } else {
    console.log("ℹ️ Kerjasama sudah ada, skip seed kerjasama awal");
  }

  // 8. Seed jenis arsip (master data)
  const jenisArsipMap = new Map<string, string>();

  for (const nama of jenisArsipAwal) {
    const jenis = await prisma.jenisArsip.upsert({
      where: { nama },
      update: {},
      create: { nama },
    });
    jenisArsipMap.set(nama, jenis.id);
    console.log(`✅ Jenis arsip: ${jenis.nama}`);
  }

  // 9. Seed arsip awal (hanya jika belum ada data arsip)
  const arsipCount = await prisma.arsip.count({ where: { deletedAt: null } });
  if (arsipCount === 0) {
    await prisma.arsip.createMany({
      data: arsipAwal.map((a) => {
        const { jenis, tanggal, ...rest } = a;
        const tanggalUpload = new Date(tanggal);

        return {
          ...rest,
          tanggalUpload,
          /*
           * Tanggal kegiatan data dummy ini belum diketahui, jadi dipakai
           * tanggal upload-nya. Admin bisa memperbaikinya dari Portal Admin.
           */
          tanggalKegiatanMulai: tanggalUpload,
          tanggalKegiatanSelesai: tanggalUpload,
          jenisArsipId: jenisArsipMap.get(jenis) ?? jenisArsipMap.get("Laporan")!,
          createdById: admin.id,
        };
      }),
    });
    console.log(`✅ ${arsipAwal.length} arsip awal dibuat`);
  } else {
    console.log("ℹ️ Arsip sudah ada, skip seed arsip awal");
  }

  // 10. Seed jenis berita (master data)
  const jenisBeritaMap = new Map<string, string>();

  for (const nama of jenisBeritaAwal) {
    const jenis = await prisma.jenisBerita.upsert({
      where: { nama },
      update: {},
      create: { nama },
    });
    jenisBeritaMap.set(nama, jenis.id);
    console.log(`✅ Jenis berita: ${jenis.nama}`);
  }

  // 11. Seed berita awal (hanya jika belum ada data berita)
  const beritaCount = await prisma.berita.count({
    where: { deletedAt: null },
  });
  if (beritaCount === 0) {
    await prisma.berita.createMany({
      data: beritaAwal.map((b) => {
        const { jenis, tanggal, ...rest } = b;
        return {
          ...rest,
          tanggal: new Date(tanggal),
          jenisBeritaId:
            jenisBeritaMap.get(jenis) ?? jenisBeritaMap.get("Pengumuman")!,
          createdById: admin.id,
        };
      }),
    });
    console.log(`✅ ${beritaAwal.length} berita awal dibuat`);
  } else {
    console.log("ℹ️ Berita sudah ada, skip seed berita awal");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
