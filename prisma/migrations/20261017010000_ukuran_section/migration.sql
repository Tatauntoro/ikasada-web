-- Kelola Beranda: ukuran font relatif (%) untuk judul & eyebrow tiap section.
-- NULL = 100% (ukuran bawaan desain).

-- AlterTable
ALTER TABLE "section_beranda" ADD COLUMN "ukuran_judul" INTEGER;
ALTER TABLE "section_beranda" ADD COLUMN "ukuran_eyebrow" INTEGER;
