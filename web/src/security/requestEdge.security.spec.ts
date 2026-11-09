// Edge behaviour of the REAL production build (its own build directory): request body limits before the guard runs.
// Next buffers a request body before proxy() runs, so `experimental.proxyClientMaxBodySize` (next.config.ts) is what
// protects memory from many parallel big unauthenticated POSTs; the guard's character cap stays the legacy answer.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import { createServer } from 'node:net';
import { buildBlocker, buildOwn, NEXT_BIN, WEB_DIRECTORY } from './productionBuild.ts';
import type { OwnBuild } from './productionBuild.ts';

const SECRETS = { ADMIN_PASSWORD: 'edge-admin-MARK-1a2b', VIEWER_PASSWORD: 'edge-viewer-MARK-3c4d', DATABASE_URL: 'postgres://orbit_user:dbpass-MARK-5d10@127.0.0.1:1/db' };
const skip = buildBlocker() ?? false;
if (skip) console.log(`requestEdge.security.spec: skipped, ${skip}`);

const CHARACTER_CAP = 1_600_000;
const TOO_LONG = '입력 내용이 너무 깁니다.';
const basic = (user: string, password: string): string => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const ADMIN = basic('admin', SECRETS.ADMIN_PASSWORD);

let build: OwnBuild;
let child: ChildProcess;
let output = '';
let base = '';
let port = 0;

const freePort = async (): Promise<number> => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port: free } = server.address() as { port: number };
  server.close();
  await once(server, 'close');
  return free;
};

before(async () => {
  if (skip) return;
  build = buildOwn(SECRETS);
  port = await freePort();
  child = spawn(process.execPath, [NEXT_BIN, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: WEB_DIRECTORY,
    env: { PATH: process.env.PATH ?? '', NEXT_DIST_DIR: build.distDir, NODE_ENV: 'production', ...SECRETS } as unknown as NodeJS.ProcessEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (c) => { output += c; });
  child.stderr?.on('data', (c) => { output += c; });
  base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 120 && !/Ready|started server/.test(output); attempt += 1) await new Promise((r) => setTimeout(r, 500));
  assert.match(output, /Ready|started server/, output);
}, { timeout: 300_000 });
after(() => {
  child?.kill();
  build?.remove();
});

/** A chunked POST of `total` bytes in pieces of about 16 KiB made of whole `unit` characters (no Content-Length). Resolves with the status, or 0 when the socket died. */
function chunkedPost(pathname: string, total: number, headers: Record<string, string>, unit = Buffer.from('a')): Promise<number> {
  return new Promise((resolve) => {
    const request = http.request({ host: '127.0.0.1', port, method: 'POST', path: pathname, headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked', ...headers } }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode ?? 0));
    });
    request.on('error', () => resolve(0));
    const piece = Buffer.from(unit.toString().repeat(Math.floor(16_384 / unit.length)));
    let sent = 0;
    const pump = (): void => {
      while (sent < total) {
        const size = Math.min(piece.length, total - sent);
        sent += size;
        if (!request.write(size === piece.length ? piece : piece.subarray(0, size))) {
          request.once('drain', pump);
          return;
        }
      }
      request.end();
    };
    pump();
  });
}

const objectOf = (characters: number, character: string): string => `{"a":"${character.repeat(characters - 8)}"}`;

describe('request body limit before the guard (real build)', () => {
  it('answers an unauthenticated 20 MB chunked POST with 401 or 413 and no 10 MB buffering error', { skip, timeout: 60_000 }, async () => {
    const status = await chunkedPost('/api/tasks', 20 * 1024 * 1024, {});
    assert.ok([401, 413].includes(status), `status ${status}`);
    assert.doesNotMatch(output, /exceeded 10(\.0)?\s?MB/i, output);
  });

  it('keeps accepting a body of exactly the legacy character cap, in ASCII and in 3-byte characters', { skip, timeout: 60_000 }, async () => {
    for (const character of ['a', '한']) {
      const body = objectOf(CHARACTER_CAP, character);
      assert.equal(body.length, CHARACTER_CAP);
      const response = await fetch(`${base}/api/session`, { method: 'POST', headers: { Authorization: ADMIN, 'Content-Type': 'application/json' }, body });
      assert.equal(response.status, 200, `${character}: ${await response.clone().text()}`);
    }
  });

  it('answers the legacy 413 one character over the cap, with Content-Length and chunked', { skip, timeout: 60_000 }, async () => {
    for (const character of ['a', '한']) {
      const body = objectOf(CHARACTER_CAP + 1, character);
      const sized = await fetch(`${base}/api/session`, { method: 'POST', headers: { Authorization: ADMIN, 'Content-Type': 'application/json' }, body });
      assert.equal(sized.status, 413, character);
      assert.deepEqual(await sized.json(), { error: TOO_LONG });
      assert.equal(sized.headers.get('x-content-type-options'), 'nosniff');
    }
    // Chunked 3-byte body past the cap: the size limit must not turn the legacy 413 into a 400 on a truncated body.
    const status = await chunkedPost('/api/session', 3 * (CHARACTER_CAP + 8), { Authorization: ADMIN }, Buffer.from('한'));
    assert.equal(status, 413);
  });

  it('keeps the legacy order: a viewer or an unauthenticated caller never gets 413 first', { skip, timeout: 60_000 }, async () => {
    const body = 'a'.repeat(6_000_000);
    const anonymous = await fetch(`${base}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(anonymous.status, 401);
    const viewer = await fetch(`${base}/api/tasks`, { method: 'POST', headers: { Authorization: basic('viewer', SECRETS.VIEWER_PASSWORD), 'Content-Type': 'application/json' }, body });
    assert.equal(viewer.status, 403);
    const admin = await fetch(`${base}/api/tasks`, { method: 'POST', headers: { Authorization: ADMIN, 'Content-Type': 'application/json' }, body });
    assert.equal(admin.status, 413);
    assert.deepEqual(await admin.json(), { error: TOO_LONG });
  });
});

describe('trailing slash (real build)', () => {
  // Next's built-in 308 redirects answer before the proxy and carry no security headers (skipTrailingSlashRedirect).
  const HEADERS = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy', 'cache-control'];
  const PATHS = ['/health/', '/api/tasks/', '/api/session/', '/api/tasks/1/'];

  it('never redirects, and answers 401 with every security header without credentials', { skip, timeout: 60_000 }, async () => {
    for (const pathname of PATHS) {
      const response = await fetch(base + pathname, { redirect: 'manual' });
      assert.equal(response.status, 401, `${pathname} -> ${response.status} location=${response.headers.get('location')}`);
      for (const name of HEADERS) assert.notEqual(response.headers.get(name), null, `${pathname} lacks ${name}`);
      assert.equal(response.headers.get('location'), null, pathname);
    }
  });

  it('answers an authenticated request on such a path with a plain 404, never a redirect, and with the headers', { skip, timeout: 60_000 }, async () => {
    for (const pathname of PATHS) {
      const response = await fetch(base + pathname, { redirect: 'manual', headers: { Authorization: ADMIN } });
      assert.equal(response.status, 404, `${pathname} -> ${response.status} location=${response.headers.get('location')}`);
      for (const name of HEADERS) assert.notEqual(response.headers.get(name), null, `${pathname} lacks ${name}`);
    }
  });

  it('still serves the exact public health path without credentials', { skip, timeout: 60_000 }, async () => {
    const response = await fetch(`${base}/health`, { redirect: 'manual' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

// Next 16.4.5 normalizes `//` and `\` with a hard-wired 308 before proxy.ts (resolve-routes.js; no config option), so that
// answer has no security headers. What is checked here is that it is harmless: the body only repeats the same-origin single-slash target.
describe('repeated slashes (real build): Next answers a bare 308 that no config can change', () => {
  it('redirects to a same-origin path without the repeated slash and the target is guarded', { skip, timeout: 60_000 }, async () => {
    for (const [requested, target] of [['/api//tasks', '/api/tasks'], ['//evil.example/x', '/evil.example/x'], ['/health//', '/health/']] as const) {
      const response = await fetch(base + requested, { redirect: 'manual' });
      assert.equal(response.status, 308, requested);
      assert.equal(response.headers.get('location'), target, requested);
      assert.equal(await response.text(), target, requested);
    }
    const followed = await fetch(`${base}/api/tasks`, { redirect: 'manual' });
    assert.equal(followed.status, 401);
  });
});
