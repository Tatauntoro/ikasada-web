-- Snapshot isi konten saat keputusan verifikasi terakhir (disetujui/ditolak).
-- Dipakai verifikator untuk melihat bagian mana yang berubah saat meninjau ulang.

ALTER TABLE "kegiatan" ADD COLUMN "snapshot_verifikasi" JSONB;
ALTER TABLE "berita" ADD COLUMN "snapshot_verifikasi" JSONB;
ALTER TABLE "arsip" ADD COLUMN "snapshot_verifikasi" JSONB;
ALTER TABLE "kerjasama" ADD COLUMN "snapshot_verifikasi" JSONB;
