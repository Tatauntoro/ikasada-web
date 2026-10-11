-- Penanda izin khusus per-admin: bila true, `permissions` tidak ditimpa
-- template divisi (saat template berubah atau admin dipindah divisi).

ALTER TABLE "admin_user" ADD COLUMN "izin_khusus" BOOLEAN NOT NULL DEFAULT false;
