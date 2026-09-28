-- CreateEnum
CREATE TYPE "ProgramStudi" AS ENUM ('JAWA', 'SUNDA', 'NUSANTARA');

-- CreateEnum
CREATE TYPE "StatusAlumni" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "StatusKegiatan" AS ENUM ('DRAFT', 'PUBLISHED', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "AksiAudit" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ALUMNI_REGISTER', 'ALUMNI_APPROVE', 'ALUMNI_REJECT', 'ALUMNI_SUSPEND', 'ALUMNI_LOGIN', 'ALUMNI_UPDATE_AVAILABILITY', 'ALUMNI_RESET_PASSWORD_REQUEST', 'CONNECTION_CREATE', 'CONNECTION_ACCEPT', 'CONNECTION_DECLINE', 'CONNECTION_CANCEL', 'CONNECTION_REVOKE', 'ARSIP_UNDUH');

-- CreateEnum
CREATE TYPE "StatusKerjasama" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "StatusArsip" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PenyimpananBerkas" AS ENUM ('CLOUDINARY', 'LOKAL');

-- CreateEnum
CREATE TYPE "JenisMedia" AS ENUM ('FOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "AksesArsip" AS ENUM ('PUBLIK', 'PUBLIK_UNDUH_ALUMNI', 'KHUSUS_ALUMNI');

-- CreateEnum
CREATE TYPE "StatusAlumniAccount" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RoleAdmin" AS ENUM ('SUPERADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusConnection" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'REVOKED');

-- CreateTable
CREATE TABLE "admin_user" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "RoleAdmin" NOT NULL DEFAULT 'ADMIN',
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    "notifikasi_dibaca_at" TIMESTAMP(3),

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kegiatan" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deskripsi_singkat" TEXT NOT NULL,
    "deskripsi_lengkap" TEXT,
    "tanggal_mulai" TIMESTAMP(3) NOT NULL,
    "tanggal_selesai" TIMESTAMP(3),
    "lokasi" TEXT NOT NULL,
    "kategori_kegiatan_id" TEXT NOT NULL,
    "gambar_thumbnail_url" TEXT,
    "video_youtube_url" TEXT,
    "video_youtube_id" TEXT,
    "galeri_gambar" JSONB,
    "link_pendaftaran" TEXT,
    "status" "StatusKegiatan" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori_kegiatan" (
    "id" TEXT NOT NULL,
    "nama_kategori" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kategori_kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengurus" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "angkatan" TEXT,
    "ket" TEXT,
    "foto_url" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pengurus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sektor_industri" (
    "id" TEXT NOT NULL,
    "nama_sektor" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sektor_industri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kerjasama" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organisasi" TEXT NOT NULL,
    "program_utama" TEXT NOT NULL,
    "profil" TEXT NOT NULL,
    "contoh_kegiatan" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image_url" TEXT,
    "alt" TEXT NOT NULL,
    "link_instagram" TEXT,
    "link_tiktok" TEXT,
    "email" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusKerjasama" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "kerjasama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_arsip" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "jenis_arsip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arsip" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "jenis_arsip_id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "tanggal_kegiatan_mulai" TIMESTAMP(3) NOT NULL,
    "tanggal_kegiatan_selesai" TIMESTAMP(3) NOT NULL,
    "deskripsi_singkat" TEXT NOT NULL,
    "deskripsi_lengkap" TEXT,
    "gambar_sampul_url" TEXT,
    "alt" TEXT,
    "berkas_id" TEXT,
    "berkas_penyimpanan" "PenyimpananBerkas",
    "berkas_nama" TEXT,
    "berkas_format" TEXT,
    "berkas_ukuran" INTEGER,
    "jumlah_unduhan" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusArsip" NOT NULL DEFAULT 'DRAFT',
    "akses" "AksesArsip" NOT NULL DEFAULT 'PUBLIK_UNDUH_ALUMNI',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "arsip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arsip_media" (
    "id" TEXT NOT NULL,
    "arsip_id" TEXT NOT NULL,
    "jenis" "JenisMedia" NOT NULL,
    "berkas_id" TEXT NOT NULL,
    "berkas_penyimpanan" "PenyimpananBerkas" NOT NULL,
    "nama_asli" TEXT,
    "format" TEXT,
    "ukuran" INTEGER,
    "caption" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arsip_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumni" (
    "id" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "gelar" TEXT,
    "foto_url" TEXT,
    "angkatan" INTEGER NOT NULL,
    "program_studi" "ProgramStudi" NOT NULL,
    "profesi" TEXT NOT NULL,
    "instansi" TEXT,
    "sektor_industri_id" TEXT NOT NULL,
    "email" TEXT,
    "no_whatsapp" TEXT,
    "link_instagram" TEXT,
    "link_sosmed_lain" JSONB,
    "status" "StatusAlumni" NOT NULL DEFAULT 'PUBLISHED',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "alumni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "alumni_account_id" TEXT,
    "aksi" "AksiAudit" NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitas_id" TEXT NOT NULL,
    "detail_perubahan" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi_dibaca" (
    "adminId" TEXT NOT NULL,
    "audit_log_id" TEXT NOT NULL,
    "dibaca_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_dibaca_pkey" PRIMARY KEY ("adminId","audit_log_id")
);

-- CreateTable
CREATE TABLE "alumni_account" (
    "id" TEXT NOT NULL,
    "alumni_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "StatusAlumniAccount" NOT NULL DEFAULT 'PENDING',
    "nama_lengkap_saat_daftar" TEXT NOT NULL,
    "angkatan_saat_daftar" INTEGER NOT NULL,
    "program_studi_saat_daftar" "ProgramStudi" NOT NULL,
    "consent_data_at" TIMESTAMP(3) NOT NULL,
    "open_to_collaboration" BOOLEAN NOT NULL DEFAULT false,
    "open_to_opportunity" BOOLEAN NOT NULL DEFAULT false,
    "show_email_to_connections" BOOLEAN NOT NULL DEFAULT false,
    "show_whatsapp_to_connections" BOOLEAN NOT NULL DEFAULT false,
    "show_social_links_to_connections" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "alumni_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection" (
    "id" TEXT NOT NULL,
    "requester_account_id" TEXT NOT NULL,
    "recipient_account_id" TEXT NOT NULL,
    "pair_key" TEXT NOT NULL,
    "status" "StatusConnection" NOT NULL DEFAULT 'PENDING',
    "revoked_by_account_id" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "read_responded_at" TIMESTAMP(3),
    "read_revoked_at" TIMESTAMP(3),

    CONSTRAINT "connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_rate_limit" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "window_started_at" TIMESTAMP(3) NOT NULL,
    "blocked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "kegiatan_slug_key" ON "kegiatan"("slug");

-- CreateIndex
CREATE INDEX "kegiatan_status_tanggal_mulai_idx" ON "kegiatan"("status", "tanggal_mulai");

-- CreateIndex
CREATE UNIQUE INDEX "kategori_kegiatan_nama_kategori_key" ON "kategori_kegiatan"("nama_kategori");

-- CreateIndex
CREATE UNIQUE INDEX "sektor_industri_nama_sektor_key" ON "sektor_industri"("nama_sektor");

-- CreateIndex
CREATE UNIQUE INDEX "kerjasama_slug_key" ON "kerjasama"("slug");

-- CreateIndex
CREATE INDEX "kerjasama_status_urutan_idx" ON "kerjasama"("status", "urutan");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_arsip_nama_key" ON "jenis_arsip"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "arsip_slug_key" ON "arsip"("slug");

-- CreateIndex
CREATE INDEX "arsip_status_tanggal_idx" ON "arsip"("status", "tanggal");

-- CreateIndex
CREATE INDEX "arsip_status_tanggal_kegiatan_mulai_idx" ON "arsip"("status", "tanggal_kegiatan_mulai");

-- CreateIndex
CREATE INDEX "arsip_jenis_arsip_id_idx" ON "arsip"("jenis_arsip_id");

-- CreateIndex
CREATE INDEX "arsip_media_arsip_id_urutan_idx" ON "arsip_media"("arsip_id", "urutan");

-- CreateIndex
CREATE INDEX "alumni_status_angkatan_idx" ON "alumni"("status", "angkatan");

-- CreateIndex
CREATE INDEX "audit_log_alumni_account_id_created_at_idx" ON "audit_log"("alumni_account_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_admin_id_created_at_idx" ON "audit_log"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_entitas_created_at_idx" ON "audit_log"("entitas", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_aksi_created_at_idx" ON "audit_log"("aksi", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_account_alumni_id_key" ON "alumni_account"("alumni_id");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_account_email_key" ON "alumni_account"("email");

-- CreateIndex
CREATE INDEX "alumni_account_status_idx" ON "alumni_account"("status");

-- CreateIndex
CREATE UNIQUE INDEX "connection_pair_key_key" ON "connection"("pair_key");

-- CreateIndex
CREATE INDEX "connection_recipient_account_id_status_created_at_idx" ON "connection"("recipient_account_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "connection_requester_account_id_status_created_at_idx" ON "connection"("requester_account_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_rate_limit_scope_key_hash_key" ON "auth_rate_limit"("scope", "key_hash");

-- AddForeignKey
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_kategori_kegiatan_id_fkey" FOREIGN KEY ("kategori_kegiatan_id") REFERENCES "kategori_kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengurus" ADD CONSTRAINT "pengurus_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kerjasama" ADD CONSTRAINT "kerjasama_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arsip" ADD CONSTRAINT "arsip_jenis_arsip_id_fkey" FOREIGN KEY ("jenis_arsip_id") REFERENCES "jenis_arsip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arsip" ADD CONSTRAINT "arsip_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arsip_media" ADD CONSTRAINT "arsip_media_arsip_id_fkey" FOREIGN KEY ("arsip_id") REFERENCES "arsip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_sektor_industri_id_fkey" FOREIGN KEY ("sektor_industri_id") REFERENCES "sektor_industri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_alumni_account_id_fkey" FOREIGN KEY ("alumni_account_id") REFERENCES "alumni_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi_dibaca" ADD CONSTRAINT "notifikasi_dibaca_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi_dibaca" ADD CONSTRAINT "notifikasi_dibaca_audit_log_id_fkey" FOREIGN KEY ("audit_log_id") REFERENCES "audit_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_account" ADD CONSTRAINT "alumni_account_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "alumni"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_requester_account_id_fkey" FOREIGN KEY ("requester_account_id") REFERENCES "alumni_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_recipient_account_id_fkey" FOREIGN KEY ("recipient_account_id") REFERENCES "alumni_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_revoked_by_account_id_fkey" FOREIGN KEY ("revoked_by_account_id") REFERENCES "alumni_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
