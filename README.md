# IKASADA Web

Portal resmi **IKASADA** (Ikatan Alumni) — situs publik (profil organisasi, kegiatan, kerjasama, arsip dokumen) sekaligus jejaring alumni (registrasi, koneksi antar-alumni, direktori) dan Portal Admin untuk mengelola semuanya.

Dibangun dengan [Next.js](https://nextjs.org) (App Router) + [Prisma](https://www.prisma.io)/PostgreSQL, di-deploy sebagai container Docker.

## Daftar Isi

- [Tumpukan teknologi](#tumpukan-teknologi)
- [Struktur proyek](#struktur-proyek)
- [Mulai kerja (local development)](#mulai-kerja-local-development)
- [Environment variables](#environment-variables)
- [Skrip yang tersedia](#skrip-yang-tersedia)
- [Alur kontribusi](#alur-kontribusi)
- [Konvensi commit](#konvensi-commit)
- [Deploy](#deploy)

## Tumpukan teknologi

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL + Prisma ORM (migration, bukan `db push`) |
| Auth | JWT (`jose`) + `bcryptjs`, sesi lewat cookie httpOnly |
| Penyimpanan berkas | Cloudflare R2 (S3-compatible, `@aws-sdk/client-s3`) — **wajib di produksi**; fallback ke disk lokal hanya untuk dev |
| Validasi | Zod |
| Animasi/3D | Framer Motion, GSAP, react-three-fiber |
| Deploy | Docker (multi-stage, standalone output) + Dokploy |

## Struktur proyek

```
src/
├─ app/
│  ├─ (admin)/admin/     # Portal Admin (butuh sesi admin) — arsip, alumni, kegiatan, kerjasama, dst.
│  ├─ admin/login/       # Halaman login admin (di luar layout admin)
│  ├─ alumni/            # Portal alumni (registrasi, profil, jejaring/koneksi)
│  ├─ arsip/ kegiatan/ kerjasama/   # Halaman publik
│  └─ api/               # Route handlers — publik, admin, alumni
├─ components/           # Komponen React, dikelompokkan per area (admin/alumni/arsip/ui/…)
├─ lib/                  # Logika inti: auth, prisma client, penyimpanan berkas (r2.ts, simpan-*.ts), validasi
└─ generated/prisma/     # Prisma Client hasil `prisma generate` (jangan diedit, di-gitignore)

prisma/
├─ schema.prisma         # Schema database
├─ migrations/           # Riwayat migration (jangan diedit manual — lihat #alur-kontribusi)
└─ seed.ts               # Data awal (admin, master data, contoh alumni/kegiatan/arsip)

docs/                    # Catatan perencanaan & desain (konteks tambahan, bukan dokumentasi API)
```

## Mulai kerja (local development)

### Prasyarat

- Node.js **20+** (proyek ini pakai Node 22 di CI/Docker)
- [Podman](https://podman.io) atau Docker — untuk menjalankan PostgreSQL lokal
- npm (lockfile-nya `package-lock.json`)

### 1. Clone & install dependencies

```bash
git clone https://github.com/Tatauntoro/ikasada-web.git
cd ikasada-web
npm install
```

### 2. Jalankan PostgreSQL lokal

```bash
podman run -d --name ikasada-postgres \
  -e POSTGRES_USER=ikasada \
  -e POSTGRES_PASSWORD=ikasada \
  -e POSTGRES_DB=ikasada \
  -p 5432:5432 \
  -v ikasada-postgres-data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
```

(Ganti `podman` dengan `docker` kalau itu yang kamu pakai — perintahnya identik.)

### 3. Siapkan environment variables

```bash
cp .env.example .env
```

Isi minimal `DATABASE_URL` (kalau beda dari default di atas), `JWT_SECRET` (string acak bebas untuk dev), dan `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (kredensial admin yang akan dibuatkan). `R2_*` boleh dikosongkan **di dev** — semua upload otomatis fallback ke disk lokal (`storage/`). Di **produksi** `R2_*` wajib: aplikasi menolak start kalau kosong, supaya tidak ada fallback senyap ke disk container. Lihat detail tiap variabel di [Environment variables](#environment-variables).

### 4. Migrate & seed database

```bash
npx prisma migrate deploy   # terapkan semua migration
npm run db:seed             # bikin admin user + data contoh
```

### 5. Jalankan dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Login admin di `/admin/login` dengan kredensial dari `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.

## Environment variables

| Variabel | Wajib? | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | Connection string PostgreSQL |
| `JWT_SECRET` | Ya | Secret penandatanganan token sesi (admin & alumni) |
| `JWT_EXPIRES_IN` | Tidak | Default `8h` |
| `R2_ACCOUNT_ID` | Ya di produksi | Cloudflare account ID. Di dev boleh kosong → fallback ke disk lokal |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Ya di produksi | API token R2 (permission read+write ke bucket) |
| `R2_BUCKET_NAME` | Ya di produksi | Nama bucket R2 |
| `NEXT_PUBLIC_APP_URL` | Ya | Base URL app (dipakai untuk link di email/notifikasi) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Ya (untuk `db:seed`) | Kredensial admin yang dibuat `prisma/seed.ts` |

Referensi lengkap ada di [`.env.example`](.env.example).

## Skrip yang tersedia

| Skrip | Kegunaan |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | `prisma generate` + build produksi |
| `npm run start` | Jalankan hasil build (`next start`) |
| `npm run lint` | ESLint |
| `npm run db:migrate:dev` | Buat & terapkan migration baru dari perubahan `schema.prisma` (dev) |
| `npm run db:migrate:deploy` | Terapkan migration yang sudah ada, non-interaktif (dipakai saat deploy) |
| `npm run db:seed` | Isi admin user + data contoh |
| `npm run db:studio` | Buka Prisma Studio (GUI database) |
| `npm run db:push` | Sinkron schema tanpa migration file — **hindari**, cuma untuk eksperimen cepat lokal |
| `*:verify` (banyak) | Skrip verifikasi manual per fitur (lihat `scripts/`), dipakai saat mengembangkan fitur terkait |

## Alur kontribusi

1. Branch dari `main`: `feat/nama-fitur`, `fix/nama-bug`, atau `chore/...`.
2. Kalau mengubah `schema.prisma`, jalankan `npm run db:migrate:dev` untuk membuat migration file — **jangan** edit `prisma/migrations/**` yang sudah ada, dan jangan pakai `db:push` untuk perubahan yang mau di-commit.
3. Pastikan `npm run lint` dan `npx tsc --noEmit` bersih sebelum membuka PR.
4. Tulis pesan commit sesuai [Konvensi commit](#konvensi-commit) di bawah — ini dipakai otomatis oleh [release-please](.github/workflows/release-please.yml) untuk bikin release note.
5. Buka PR ke `main`. Repo ini tidak memakai `git push --force` ke `main` maupun riwayat commit yang di-rewrite — selalu commit baru di atas branch.

## Konvensi commit

Proyek ini pakai [Conventional Commits](https://www.conventionalcommits.org/), dibaca otomatis oleh **release-please** untuk menentukan versi & isi `CHANGELOG.md`:

| Prefix | Dipakai untuk | Efek ke versi |
|---|---|---|
| `feat:` | Fitur baru | Minor (`0.X.0`) |
| `fix:` | Perbaikan bug | Patch (`0.0.X`) |
| `chore:` | Tooling, config, dependency, dll (bukan fitur/bug) | Tidak bump versi |
| `docs:` | Dokumentasi saja | Tidak bump versi |
| `refactor:` | Perubahan kode tanpa ubah perilaku | Tidak bump versi |

Contoh: `feat: tambah filter tahun angkatan di direktori alumni`, `fix: cegah upload gambar >2MB lolos validasi`.

## Deploy

Deploy sebagai container Docker (lihat [`Dockerfile`](Dockerfile) dan [`docker-compose.yml`](docker-compose.yml)), dirancang untuk platform [Dokploy](https://dokploy.com):

- `docker-compose.yml` cuma mendefinisikan aplikasi — database PostgreSQL dikelola terpisah.
- Migration Prisma (`prisma migrate deploy`) jalan otomatis lewat service `migrate` sebelum service `app` start (lihat komentar di `docker-compose.yml`).
- Environment variable production di-set lewat panel Dokploy (atau `docker-compose.yml` + file `.env` di sebelahnya), bukan file yang di-commit.
- `R2_*` **wajib** di produksi: kalau belum diisi, container menolak start (lihat `scripts/preflight.mjs`) supaya tidak ada fallback senyap ke disk lokal. Isi dulu di panel Environment Dokploy sebelum deploy.
