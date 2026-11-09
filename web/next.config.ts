import type { NextConfig } from "next";
import { BODY_LIMIT_BYTES } from "./src/access/adapter/in/web/bodyLimit.ts";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR lets the security spec build into its own directory (it must stay inside web/); unset = `.next`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  // Next's own 308 for a trailing slash (and `//`) answers before proxy.ts, so it would carry no security headers; the
  // legacy portal has no such redirect either: `/health/` and `/api/tasks/` are ordinary unmatched paths there.
  skipTrailingSlashRedirect: true,
  // Name checked in node_modules/next/dist/server/config-schema.js (Next 16.4.5). Why this number: see bodyLimit.ts.
  experimental: { proxyClientMaxBodySize: BODY_LIMIT_BYTES },
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
