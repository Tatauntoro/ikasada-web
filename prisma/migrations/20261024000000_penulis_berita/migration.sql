-- Expand-only: pertahankan berita lama dan atribusi yang sudah tampil publik.
-- DEFAULT juga menjaga kompatibilitas dengan klien lama yang belum mengirim penulis.
ALTER TABLE "berita"
ADD COLUMN "penulis" VARCHAR(120) NOT NULL DEFAULT 'Redaksi IKASADA';
