-- Kelola Beranda: section beranda + titik sebaran geografis yang bisa diatur
-- dari Portal Admin.

-- CreateTable
CREATE TABLE "section_beranda" (
    "id" TEXT NOT NULL,
    "kunci" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "judul" TEXT,
    "eyebrow" TEXT,
    "deskripsi" TEXT,
    "konfigurasi" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "section_beranda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "section_beranda_kunci_key" ON "section_beranda"("kunci");

-- CreateTable
CREATE TABLE "titik_sebaran" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "keterangan" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "titik_sebaran_pkey" PRIMARY KEY ("id")
);
