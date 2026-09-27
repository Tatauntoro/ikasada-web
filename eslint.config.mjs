import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static assets (draco decoder, model, uploads) — bukan kode aplikasi:
    "public/**",
    // Referensi desain / tooling, bukan kode aplikasi:
    "IKASADA Alumni Landing Page/**",
    "asset-path-kage/**",
    ".agents/**",
    ".claude/**",
    ".continue/**",
    ".hermes/**",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
