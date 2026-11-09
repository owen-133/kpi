// Test credentials shared by the Next candidate and the specs (the same values the legacy corpus logs in with),
// and the PGlite availability probe the specs use to skip themselves.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ADMIN_PASSWORD = 'golden-admin';
export const VIEWER_PASSWORD = 'golden-viewer';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export function pgliteAvailable(): boolean {
  const path = process.env.ORBIT_PGLITE_PATH ?? `${REPO_ROOT}web/node_modules/@electric-sql/pglite/dist/index.js`;
  return existsSync(path);
}
