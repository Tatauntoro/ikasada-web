-- Galeri foto/video untuk Berita dan Kegiatan (mengikuti pola `arsip_media`).
-- Tidak ada URL publik yang disimpan: hanya identitas berkas; isinya dilayani
-- endpoint per entri (`/api/berita/[slug]/media/[id]`, `/api/kegiatan/[slug]/media/[id]`).

-- CreateTable
CREATE TABLE "berita_media" (
    "id" TEXT NOT NULL,
    "berita_id" TEXT NOT NULL,
    "jenis" "JenisMedia" NOT NULL,
    "berkas_id" TEXT NOT NULL,
    "berkas_penyimpanan" "PenyimpananBerkas" NOT NULL,
    "nama_asli" TEXT,
    "format" TEXT,
    "ukuran" INTEGER,
    "caption" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "berita_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kegiatan_media" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "jenis" "JenisMedia" NOT NULL,
    "berkas_id" TEXT NOT NULL,
    "berkas_penyimpanan" "PenyimpananBerkas" NOT NULL,
    "nama_asli" TEXT,
    "format" TEXT,
    "ukuran" INTEGER,
    "caption" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kegiatan_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "berita_media_berita_id_urutan_idx" ON "berita_media"("berita_id", "urutan");

-- CreateIndex
CREATE INDEX "kegiatan_media_kegiatan_id_urutan_idx" ON "kegiatan_media"("kegiatan_id", "urutan");

-- AddForeignKey
ALTER TABLE "berita_media" ADD CONSTRAINT "berita_media_berita_id_fkey" FOREIGN KEY ("berita_id") REFERENCES "berita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kegiatan_media" ADD CONSTRAINT "kegiatan_media_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
