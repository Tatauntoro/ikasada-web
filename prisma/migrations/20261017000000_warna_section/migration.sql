-- Kelola Beranda: warna kustom (hex) untuk judul & eyebrow tiap section.
-- Kosong (NULL) = pakai warna bawaan desain.

-- AlterTable
ALTER TABLE "section_beranda" ADD COLUMN "warna_judul" TEXT;
ALTER TABLE "section_beranda" ADD COLUMN "warna_eyebrow" TEXT;
