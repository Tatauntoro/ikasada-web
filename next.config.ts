import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prisma client di-generate ke src/generated/prisma (bukan node_modules),
  // jadi query engine binary-nya perlu dipaksa ikut di-trace supaya tidak
  // hilang dari build standalone.
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
  images: {
    // Gambar upload dilayani route `/api/uploads/**` (dibaca dari R2). URL lama
    // di DB masih membawa query `?b=r2|lokal`; tanpa `search` di sini
    // /_next/image menolak src ber-query dengan 400.
    localPatterns: [{ pathname: "/api/uploads/**" }, { pathname: "/**", search: "" }],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
};

export default nextConfig;
