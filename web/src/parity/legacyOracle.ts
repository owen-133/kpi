// The legacy portal as an in-process-callable oracle: server.js in Supabase mode (STORAGE_BACKEND=supabase)
// whose Supabase RPC calls are answered by a fresh PGlite (legacyFetchStub.ts).
// server.js starts listening when it is imported and reads its configuration at import time, so it cannot be
// imported twice in one process; each oracle is a child process on a free port, wrapped as `(request) => Response`.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import type { Session } from './runner.ts';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const STUB = fileURLToPath(new URL('./legacyFetchStub.ts', import.meta.url));
export const ADMIN_PASSWORD = 'golden-admin';
export const VIEWER_PASSWORD = 'golden-viewer';

export function pgliteAvailable(): boolean {
  const path = process.env.ORBIT_PGLITE_PATH ?? `${REPO_ROOT}web/node_modules/@electric-sql/pglite/dist/index.js`;
  return existsSync(path);
}

async function freePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port');
  const { port } = address;
  server.close();
  await once(server, 'close');
  return port;
}

// Starts a fresh legacy portal over a fresh database. Throws (loudly) when PGlite is missing or the server dies.
export async function startLegacyOracle(): Promise<Session> {
  if (!pgliteAvailable()) throw new Error('PGlite not available: set ORBIT_PGLITE_PATH or run (cd web && npm ci)');
  const port = await freePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    STORAGE_BACKEND: 'supabase',
    SUPABASE_URL: 'https://parity-oracle.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_parity-oracle',
    ADMIN_PASSWORD,
    VIEWER_PASSWORD,
  };
  delete env.NODE_ENV;
  const child = spawn(process.execPath, ['--import', STUB, 'server.js'], { cwd: REPO_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(() => {
      throw new Error(`legacy server failed to start\n${stderr}`);
    }),
  ]);
  const base = `http://127.0.0.1:${port}`;
  const handle = async (request: Request): Promise<Response> => {
    const incoming = new URL(request.url);
    const headers = new Headers(request.headers);
    // A same-origin Origin header means "the server itself": point it at the child's real origin.
    if (headers.get('origin') === incoming.origin) headers.set('origin', base);
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    return fetch(base + incoming.pathname + incoming.search, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    });
  };
  const stop = async (): Promise<void> => {
    if (child.exitCode === null) {
      const done = once(child, 'exit');
      child.kill();
      await done;
    }
  };
  return { handle, stop };
}
