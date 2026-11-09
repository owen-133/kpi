import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR lets the security spec build into its own directory (it must stay inside web/); unset = `.next`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
