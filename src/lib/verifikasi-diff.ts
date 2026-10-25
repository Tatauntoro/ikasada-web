/**
 * Snapshot & pembanding isi konten untuk verifikasi.
 *
 * Modul **murni** (tanpa Prisma/DB) supaya bisa dipakai di server — menyimpan
 * snapshot dan menghitung selisih — sekaligus di komponen klien — menerjemahkan
 * kunci field yang berubah menjadi label yang bisa dibaca verifikator.
 *
 * Snapshot diambil dari kolom-kolom yang **bisa diubah divisi lewat form**
 * (bukan `status`/`verifikasi`, yang mengatur alur, bukan isi). Tanggal
 * dinormalkan ke ISO agar perbandingan JSON setara antara nilai Date dari DB
 * dan nilai tersimpan di kolom JSON.
 */

export type EntitasSnapshot = "kegiatan" | "berita" | "arsip" | "kerjasama";

export type SnapshotKonten = Record<string, unknown>;

/** Label bagian konten untuk ringkasan "bagian yang berubah". */
export const LABEL_SNAPSHOT: Record<string, string> = {
  judul: "Judul",
  penulis: "Nama penulis",
  deskripsiSingkat: "Deskripsi singkat",
  deskripsiLengkap: "Deskripsi lengkap",
  tanggalMulai: "Tanggal mulai",
  tanggalSelesai: "Tanggal selesai",
  lokasi: "Lokasi",
  kategoriKegiatanId: "Kategori",
  videoYoutubeUrl: "Video YouTube",
  linkPendaftaran: "Link pendaftaran",
  gambarThumbnailUrl: "Thumbnail",
  jenisBeritaId: "Tipe berita",
  tanggal: "Tanggal",
  gambarUrl: "Gambar",
  jenisArsipId: "Jenis arsip",
  akses: "Tingkat akses",
  tanggalUpload: "Tanggal upload",
  tanggalKegiatanMulai: "Tanggal kegiatan (mulai)",
  tanggalKegiatanSelesai: "Tanggal kegiatan (selesai)",
  alt: "Teks alternatif gambar",
  gambarSampulUrl: "Gambar sampul",
  berkasId: "Berkas dokumen",
  berkasFormat: "Format dokumen",
  organisasi: "Nama organisasi",
  programUtama: "Program utama",
  profil: "Profil",
  contohKegiatan: "Contoh kegiatan",
  urutan: "Urutan",
  imageUrl: "Gambar",
  linkInstagram: "Instagram",
  linkTiktok: "TikTok",
  email: "Email",
  media: "Galeri media",
};

function norm(nilai: unknown): unknown {
  if (nilai instanceof Date) return nilai.toISOString();
  if (nilai === undefined) return null;
  return nilai;
}

type BarisMedia = { jenis: string; berkasId: string; caption?: string | null };

/** Galeri dibandingkan lewat jenis/berkas/caption & urutannya. */
function mediaRingkas(media: BarisMedia[] | undefined | null) {
  return (media ?? []).map((m) => ({
    jenis: m.jenis,
    berkasId: m.berkasId,
    caption: m.caption ?? null,
  }));
}

/** Ambil field yang bisa diubah divisi dari satu baris konten (termasuk media). */
export function bikinSnapshot(
  entitas: EntitasSnapshot,
  d: Record<string, unknown>
): SnapshotKonten {
  const media = mediaRingkas(d.media as BarisMedia[] | undefined);

  switch (entitas) {
    case "kegiatan":
      return {
        judul: norm(d.judul),
        deskripsiSingkat: norm(d.deskripsiSingkat),
        deskripsiLengkap: norm(d.deskripsiLengkap),
        tanggalMulai: norm(d.tanggalMulai),
        tanggalSelesai: norm(d.tanggalSelesai),
        lokasi: norm(d.lokasi),
        kategoriKegiatanId: norm(d.kategoriKegiatanId),
        videoYoutubeUrl: norm(d.videoYoutubeUrl),
        linkPendaftaran: norm(d.linkPendaftaran),
        gambarThumbnailUrl: norm(d.gambarThumbnailUrl),
        media,
      };
    case "berita":
      return {
        judul: norm(d.judul),
        penulis: norm(d.penulis),
        jenisBeritaId: norm(d.jenisBeritaId),
        tanggal: norm(d.tanggal),
        deskripsiSingkat: norm(d.deskripsiSingkat),
        deskripsiLengkap: norm(d.deskripsiLengkap),
        gambarUrl: norm(d.gambarUrl),
        media,
      };
    case "arsip":
      return {
        judul: norm(d.judul),
        jenisArsipId: norm(d.jenisArsipId),
        akses: norm(d.akses),
        tanggalUpload: norm(d.tanggalUpload),
        tanggalKegiatanMulai: norm(d.tanggalKegiatanMulai),
        tanggalKegiatanSelesai: norm(d.tanggalKegiatanSelesai),
        deskripsiSingkat: norm(d.deskripsiSingkat),
        deskripsiLengkap: norm(d.deskripsiLengkap),
        alt: norm(d.alt),
        gambarSampulUrl: norm(d.gambarSampulUrl),
        berkasId: norm(d.berkasId),
        berkasFormat: norm(d.berkasFormat),
        media,
      };
    case "kerjasama":
      return {
        organisasi: norm(d.organisasi),
        programUtama: norm(d.programUtama),
        profil: norm(d.profil),
        alt: norm(d.alt),
        urutan: norm(d.urutan),
        imageUrl: norm(d.imageUrl),
        linkInstagram: norm(d.linkInstagram),
        linkTiktok: norm(d.linkTiktok),
        email: norm(d.email),
        contohKegiatan: norm(d.contohKegiatan),
      };
  }
}

function setara(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Kunci field yang berbeda dari snapshot. Mengembalikan `[]` bila snapshot
 * tidak ada (konten baru) — verifikator melihat "Konten baru", bukan daftar
 * perubahan.
 */
export function fieldBerubah(
  snapshot: SnapshotKonten | null | undefined,
  entitas: EntitasSnapshot,
  d: Record<string, unknown>
): string[] {
  if (!snapshot) return [];
  const sekarang = bikinSnapshot(entitas, d);
  return Object.keys(sekarang).filter((k) => {
    // Snapshot sebelum kolom penulis memakai atribusi default yang sama.
    const lama =
      entitas === "berita" && k === "penulis" && !(k in snapshot)
        ? "Redaksi IKASADA"
        : snapshot[k];
    return !setara(sekarang[k], lama);
  });
}

/** Terjemahkan kunci field menjadi label unik (untuk ringkasan). */
export function labelPerubahan(kunci: string[]): string[] {
  const label: string[] = [];
  for (const k of kunci) {
    const teks = LABEL_SNAPSHOT[k] ?? k;
    if (!label.includes(teks)) label.push(teks);
  }
  return label;
}
