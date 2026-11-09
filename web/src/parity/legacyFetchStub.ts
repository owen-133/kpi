// Preloaded into the legacy server child process (`node --import legacyFetchStub.ts server.js`).
// Creates a fresh in-memory PGlite, applies the Supabase SQL files, and replaces globalThis.fetch so the
// PostgREST RPC calls of supabase-store.js are answered by that database as role service_role.
// Same wiring as test/supabase.test.js; every other fetch goes through to the real fetch.
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const repoRoot = new URL('../../../', import.meta.url);
const pglitePath =
  process.env.ORBIT_PGLITE_PATH ?? fileURLToPath(new URL('web/node_modules/@electric-sql/pglite/dist/index.js', repoRoot));
const { PGlite } = await import(pathToFileURL(pglitePath).href);
const db = new PGlite();
await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
for (const file of ['schema', 'settings', 'deletion', 'kpi', 'upgrade']) {
  await db.exec(readFileSync(new URL(`supabase/${file}.sql`, repoRoot), 'utf8'));
}
await db.exec('SET ROLE service_role');

const RPC = new Set(['orbit_settings', 'orbit_api', 'orbit_lifecycle', 'orbit_kpi', 'orbit_edit_task']);
const realFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!url.hostname.endsWith('.supabase.co')) return realFetch(input, init);
  const name = url.pathname.split('/').at(-1) ?? '';
  if (!RPC.has(name)) throw new Error(`unexpected Supabase call ${url.pathname}`);
  const { action, payload } = JSON.parse(String(init?.body));
  try {
    const result =
      name === 'orbit_edit_task'
        ? await db.query('SELECT public.orbit_edit_task($1::jsonb) AS data', [JSON.stringify(payload)])
        : await db.query(`SELECT public.${name}($1,$2::jsonb) AS data`, [action, JSON.stringify(payload)]);
    return Response.json(result.rows[0].data);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return Response.json({ code: err.code, message: err.message }, { status: 400 });
  }
};
