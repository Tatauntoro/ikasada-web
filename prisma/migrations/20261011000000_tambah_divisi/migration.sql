-- Divisi & pemisahan konten per divisi.
--
-- Divisi adalah dimensi organisasi, bukan role: hak akses tetap dari matriks
-- `admin_user.permissions`. Kolom nullable `divisi_id` sengaja NULL-able agar
-- admin teknis dan konten lama (belum berdivisi) tetap valid.

-- CreateTable
CREATE TABLE "divisi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "lintas_divisi" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "divisi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "divisi_nama_key" ON "divisi"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "divisi_slug_key" ON "divisi"("slug");

-- AlterTable
ALTER TABLE "admin_user" ADD COLUMN "divisi_id" TEXT;

-- AlterTable
ALTER TABLE "kegiatan" ADD COLUMN "divisi_id" TEXT;

-- AlterTable
ALTER TABLE "berita" ADD COLUMN "divisi_id" TEXT;

-- AlterTable
ALTER TABLE "arsip" ADD COLUMN "divisi_id" TEXT;

-- AlterTable
ALTER TABLE "kerjasama" ADD COLUMN "divisi_id" TEXT;

-- AddForeignKey
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_divisi_id_fkey" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_divisi_id_fkey" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berita" ADD CONSTRAINT "berita_divisi_id_fkey" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arsip" ADD CONSTRAINT "arsip_divisi_id_fkey" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kerjasama" ADD CONSTRAINT "kerjasama_divisi_id_fkey" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
