-- AlterEnum
BEGIN;
CREATE TYPE "PenyimpananBerkas_new" AS ENUM ('R2', 'LOKAL');
ALTER TABLE "arsip" ALTER COLUMN "berkas_penyimpanan" TYPE "PenyimpananBerkas_new" USING ("berkas_penyimpanan"::text::"PenyimpananBerkas_new");
ALTER TABLE "arsip_media" ALTER COLUMN "berkas_penyimpanan" TYPE "PenyimpananBerkas_new" USING ("berkas_penyimpanan"::text::"PenyimpananBerkas_new");
ALTER TYPE "PenyimpananBerkas" RENAME TO "PenyimpananBerkas_old";
ALTER TYPE "PenyimpananBerkas_new" RENAME TO "PenyimpananBerkas";
DROP TYPE "PenyimpananBerkas_old";
COMMIT;
