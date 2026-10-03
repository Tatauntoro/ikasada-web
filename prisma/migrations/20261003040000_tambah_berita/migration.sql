-- CreateEnum
CREATE TYPE "StatusBerita" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "jenis_berita" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "jenis_berita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "berita" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "jenis_berita_id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "deskripsi_singkat" TEXT NOT NULL,
    "deskripsi_lengkap" TEXT,
    "gambar_url" TEXT,
    "status" "StatusBerita" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "berita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jenis_berita_nama_key" ON "jenis_berita"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "berita_slug_key" ON "berita"("slug");

-- CreateIndex
CREATE INDEX "berita_status_tanggal_idx" ON "berita"("status", "tanggal");

-- CreateIndex
CREATE INDEX "berita_jenis_berita_id_idx" ON "berita"("jenis_berita_id");

-- AddForeignKey
ALTER TABLE "berita" ADD CONSTRAINT "berita_jenis_berita_id_fkey" FOREIGN KEY ("jenis_berita_id") REFERENCES "jenis_berita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berita" ADD CONSTRAINT "berita_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
