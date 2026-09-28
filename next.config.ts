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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
};

export default nextConfig;
