// Security of the production build: the spec builds into its own directory once (never reads `.next`), starts it,
// checks the headers on every error status, and scans the build output for secret names and values.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import path from 'node:path';
import { buildBlocker, buildOwn, NEXT_BIN, WEB_DIRECTORY } from './productionBuild.ts';
import type { OwnBuild } from './productionBuild.ts';
import { scanDirectory } from './bundleScan.ts';

const SECRETS = { ADMIN_PASSWORD: 'bundle-admin-MARK-7f3a', VIEWER_PASSWORD: 'bundle-viewer-MARK-91c2', DATABASE_URL: 'postgres://orbit_user:dbpass-MARK-5d10@127.0.0.1:1/db' };
const skip = buildBlocker() ?? false;
if (skip) console.log(`production.security.spec: skipped, ${skip}`);

let build: OwnBuild;
before(() => { if (!skip) build = buildOwn(SECRETS); });
after(() => build?.remove());

const basic = (user: string, password: string): string => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const freePort = async (): Promise<number> => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  server.close();
  await once(server, 'close');
  return port;
};
const start = (port: number, env: Record<string, string>): ChildProcess =>
  spawn(process.execPath, [NEXT_BIN, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: WEB_DIRECTORY,
    env: { PATH: process.env.PATH ?? '', NEXT_DIST_DIR: build.distDir, ...env } as unknown as NodeJS.ProcessEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

describe('production start', () => {
  it('exits non-zero in production without the passwords and DATABASE_URL', { skip, timeout: 60_000 }, async () => {
    const child = start(await freePort(), { NODE_ENV: 'production' });
    let output = '';
    child.stdout?.on('data', (c) => { output += c; });
    child.stderr?.on('data', (c) => { output += c; });
    const timer = setTimeout(() => child.kill(), 40_000);
    const [code] = (await once(child, 'exit')) as [number | null];
    clearTimeout(timer);
    assert.notEqual(code, 0, output);
    assert.notEqual(code, null, `killed after timeout, it did not stop: ${output}`);
    assert.match(output, /배포 시 관리자와 조회 비밀번호가 필요합니다/, 'it must stop for the missing passwords, not for another reason');
  });

  it('serves 401 and health with a fresh nonce and no unsafe-* source when configured', { skip, timeout: 60_000 }, async () => {
    const port = await freePort();
    const child = start(port, { NODE_ENV: 'production', ...SECRETS });
    let output = '';
    child.stdout?.on('data', (c) => { output += c; });
    child.stderr?.on('data', (c) => { output += c; });
    const base = `http://127.0.0.1:${port}`;
    try {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (/Ready|started server/.test(output)) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const first = await fetch(`${base}/health`);
      const second = await fetch(`${base}/health`);
      assert.equal(first.status, 200);
      assert.equal(first.headers.get('x-powered-by'), null);
      assert.notEqual(first.headers.get('content-security-policy'), second.headers.get('content-security-policy'));

      // Header snapshot: the same set on 401, 403, 404, 413 and 503 (the nonce is the only varying part).
      const admin = { Authorization: basic('admin', SECRETS.ADMIN_PASSWORD) };
      const viewer = { Authorization: basic('viewer', SECRETS.VIEWER_PASSWORD) };
      const cases: Array<[number, string, RequestInit]> = [
        [401, '/_next/static/none.js', {}],
        [403, '/api/tasks', { method: 'POST', headers: { ...viewer, 'Content-Type': 'application/json' }, body: '{}' }],
        [404, '/api/does-not-exist', { headers: admin }],
        [413, '/api/tasks', { method: 'POST', headers: { ...admin, 'Content-Type': 'application/json' }, body: 'a'.repeat(1_600_001) }],
        [503, '/api/tasks', { headers: admin }],
      ];
      const snapshots = new Map<number, Record<string, string>>();
      for (const [status, pathname, init] of cases) {
        const response = await fetch(base + pathname, init);
        assert.equal(response.status, status, `${pathname}: ${await response.clone().text()}`);
        const policy = response.headers.get('content-security-policy') ?? '';
        assert.doesNotMatch(policy, /unsafe-/);
        assert.match(policy, /script-src 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
        snapshots.set(status, {
          csp: policy.replace(/nonce-[A-Za-z0-9+/=]+/g, 'nonce-N'),
          hsts: response.headers.get('strict-transport-security') ?? '',
          nosniff: response.headers.get('x-content-type-options') ?? '',
          referrer: response.headers.get('referrer-policy') ?? '',
          cache: response.headers.get('cache-control') ?? '',
          powered: response.headers.get('x-powered-by') ?? '',
        });
      }
      assert.deepEqual(snapshots.get(401), {
        csp: "default-src 'self'; script-src 'nonce-N' 'strict-dynamic'; style-src 'self' 'nonce-N'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        hsts: 'max-age=31536000',
        nosniff: 'nosniff',
        referrer: 'no-referrer',
        cache: 'no-store',
        powered: '',
      });
      for (const [status, snapshot] of snapshots) assert.deepEqual(snapshot, snapshots.get(401), `headers on ${status} differ from the 401 snapshot`);
    } finally {
      child.kill();
    }
  });
});

describe('bundle holds no secret names or values', () => {
  it('client chunks contain no secret variable name and nothing contains a secret value', { skip }, () => {
    const names = Object.keys(SECRETS);
    const values = [SECRETS.ADMIN_PASSWORD, SECRETS.VIEWER_PASSWORD, SECRETS.DATABASE_URL, 'dbpass-MARK-5d10'];
    const clientChunks = scanDirectory(path.join(build.absoluteDistDir, 'static'), [...names, ...values]);
    assert.deepEqual(clientChunks, [], 'a client chunk names or holds a server-only secret');
    const anywhere = scanDirectory(build.absoluteDistDir, values);
    assert.deepEqual(anywhere, [], 'a build output file holds a secret value');
  });
});
