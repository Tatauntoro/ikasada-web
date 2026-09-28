# syntax=docker/dockerfile:1

# Base image dipakai bersama semua stage supaya query engine Prisma yang
# di-generate saat build (glibc/openssl-nya) cocok dengan runtime.
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- Dependencies ----------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Prisma butuh DATABASE_URL saat "generate", nilai asli tidak dipakai saat
# build (semua route API pakai `dynamic = "force-dynamic"`, tidak query DB
# saat build). Nilai sesungguhnya di-set lewat env di docker-compose/Dokploy.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

RUN npm run build

# ---- Migrator ---------------------------------------------------------------
# Image terpisah yang cuma dipakai untuk menjalankan `prisma migrate deploy`
# sekali sebelum service app start (lihat docker-compose.yml). Butuh Prisma
# CLI + folder prisma/migrations, makanya build dari stage builder (bukan
# runner yang sudah di-strip ke standalone output).
FROM builder AS migrator
WORKDIR /app
ENTRYPOINT ["npx", "prisma"]
CMD ["migrate", "deploy"]

# ---- Runtime ------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Preflight boot: menolak start kalau R2_* kosong di produksi (lihat file-nya).
COPY --from=builder --chown=nextjs:nodejs /app/scripts/preflight.mjs ./preflight.mjs

# Folder penyimpanan lokal untuk berkas/media arsip + gambar upload (dipakai
# hanya di luar produksi; produksi wajib R2 — lihat scripts/preflight.mjs).
# SENGAJA di luar public/ (lihat komentar UPLOAD_DIR di
# src/lib/upload-gambar.ts) dan dibuatkan volume terpisah di docker-compose
# supaya berkas lokal lama tidak hilang saat redeploy.
RUN mkdir -p storage \
  && chown -R nextjs:nodejs storage

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Preflight dulu (R2 wajib di produksi), baru server.
CMD ["sh", "-c", "node preflight.mjs && exec node server.js"]
