-- Verifikasi konten: status + jejak verifikator.
--
-- `status` (DRAFT/PUBLISHED) tetap mengatur terbit; kolom `verifikasi`
-- mengatur gate-nya. Konten lama di-backfill `DISETUJUI` supaya tidak
-- mendadak terkunci dari publish.

-- CreateEnum
CREATE TYPE "StatusVerifikasiKonten" AS ENUM ('BELUM', 'MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- AlterEnum
ALTER TYPE "AksiAudit" ADD VALUE IF NOT EXISTS 'KONTEN_AJUKAN';
ALTER TYPE "AksiAudit" ADD VALUE IF NOT EXISTS 'KONTEN_VERIFIKASI';
ALTER TYPE "AksiAudit" ADD VALUE IF NOT EXISTS 'KONTEN_TOLAK';

-- AlterTable
ALTER TABLE "kegiatan"
    ADD COLUMN "verifikasi" "StatusVerifikasiKonten" NOT NULL DEFAULT 'BELUM',
    ADD COLUMN "diverifikasi_oleh_id" TEXT,
    ADD COLUMN "diverifikasi_at" TIMESTAMP(3),
    ADD COLUMN "catatan_verifikasi" TEXT;

-- AlterTable
ALTER TABLE "berita"
    ADD COLUMN "verifikasi" "StatusVerifikasiKonten" NOT NULL DEFAULT 'BELUM',
    ADD COLUMN "diverifikasi_oleh_id" TEXT,
    ADD COLUMN "diverifikasi_at" TIMESTAMP(3),
    ADD COLUMN "catatan_verifikasi" TEXT;

-- AlterTable
ALTER TABLE "arsip"
    ADD COLUMN "verifikasi" "StatusVerifikasiKonten" NOT NULL DEFAULT 'BELUM',
    ADD COLUMN "diverifikasi_oleh_id" TEXT,
    ADD COLUMN "diverifikasi_at" TIMESTAMP(3),
    ADD COLUMN "catatan_verifikasi" TEXT;

-- AlterTable
ALTER TABLE "kerjasama"
    ADD COLUMN "verifikasi" "StatusVerifikasiKonten" NOT NULL DEFAULT 'BELUM',
    ADD COLUMN "diverifikasi_oleh_id" TEXT,
    ADD COLUMN "diverifikasi_at" TIMESTAMP(3),
    ADD COLUMN "catatan_verifikasi" TEXT;

-- CreateIndex
CREATE INDEX "kegiatan_verifikasi_idx" ON "kegiatan"("verifikasi");
CREATE INDEX "berita_verifikasi_idx" ON "berita"("verifikasi");
CREATE INDEX "arsip_verifikasi_idx" ON "arsip"("verifikasi");
CREATE INDEX "kerjasama_verifikasi_idx" ON "kerjasama"("verifikasi");

-- Backfill: konten yang sudah ada dianggap sudah diverifikasi.
UPDATE "kegiatan" SET "verifikasi" = 'DISETUJUI';
UPDATE "berita" SET "verifikasi" = 'DISETUJUI';
UPDATE "arsip" SET "verifikasi" = 'DISETUJUI';
UPDATE "kerjasama" SET "verifikasi" = 'DISETUJUI';
