// Security behavior of the guard: auth matrix, origin rules, body cap, headers, log hygiene and source bans.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ADMIN_PASSWORD, VIEWER_PASSWORD } from '../parity/credentials.ts';
import { startNextCandidate } from '../parity/nextCandidate.ts';
import { collectFiles } from '../architecture.helpers.ts';
import { applySecurityHeaders, contentSecurityPolicy, createNonce } from '../access/adapter/in/web/securityHeaders.ts';
import type { RouteDefinition } from '../shared/adapter/in/web/RouteRegistry.ts';

const ORIGIN = 'http://guard.test';
const basic = (user: string, password: string): string => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const AUTH = {
  none: {} as Record<string, string>,
  wrong: { Authorization: basic('admin', 'wrong') },
  viewer: { Authorization: basic('viewer', VIEWER_PASSWORD) },
  admin: { Authorization: basic('admin', ADMIN_PASSWORD), 'Content-Type': 'application/json' },
};
const SENTINEL = 'SENTINEL-홍길동-010-1234-5678';
const probeRoutes: RouteDefinition[] = [
  { method: 'POST', pattern: '/api/probe-throw', handler: () => { throw new Error(SENTINEL); } },
  { method: 'ANY', pattern: '/api/probe-ok', handler: () => new Response('{"ok":true}') },
];

const sessionPromise = startNextCandidate({ extraRoutes: probeRoutes, log: (line) => logged.push(line) });
const logged: string[] = [];
after(async () => (await sessionPromise).stop?.());

const send = async (pathname: string, init: RequestInit = {}): Promise<Response> => (await sessionPromise).handle(new Request(ORIGIN + pathname, init));

describe('auth matrix', () => {
  const routes: Array<[string, string[]]> = [['/api/session', ['GET', 'POST']], ['/api/probe-ok', ['GET', 'POST']], ['/', ['GET', 'POST']], ['/app.js', ['GET', 'DELETE']]];
  for (const [route, methods] of routes) {
    for (const method of methods) {
      const body = method === 'POST' ? '{}' : undefined;
      it(`${method} ${route}: no auth and wrong password get 401 with the Basic challenge`, async () => {
        for (const headers of [AUTH.none, AUTH.wrong]) {
          const response = await send(route, { method, headers, body });
          assert.equal(response.status, 401);
          assert.equal(response.headers.get('www-authenticate'), 'Basic realm="Orbit Ops", charset="UTF-8"');
        }
      });
      it(`${method} ${route}: viewer never gets a write through`, async () => {
        const response = await send(route, { method, headers: AUTH.viewer, body });
        if (method === 'GET') assert.ok([200, 404].includes(response.status));
        else assert.ok(response.status === 403 || (response.status === 405 && !route.startsWith('/api/')), `got ${response.status}`);
      });
    }
  }
  it('admin reads /api/session and a POST carrying a Next-Action header is just a POST (page: 405, api: routed)', async () => {
    assert.equal((await send('/api/session', { headers: AUTH.admin })).status, 200);
    const page = await send('/', { method: 'POST', headers: { ...AUTH.admin, 'Next-Action': 'abc' }, body: '{}' });
    assert.equal(page.status, 405);
    const unauthenticated = await send('/', { method: 'POST', headers: { 'Next-Action': 'abc' }, body: '{}' });
    assert.equal(unauthenticated.status, 401);
    const viewer = await send('/api/probe-ok', { method: 'POST', headers: { ...AUTH.viewer, 'Next-Action': 'abc' }, body: '{}' });
    assert.equal(viewer.status, 403);
  });
  it('the screen used by the proxy guards pages, static paths and Server Function POSTs', async () => {
    const { container } = await sessionPromise;
    for (const pathname of ['/', '/_next/static/chunks/x.js', '/anything']) {
      assert.equal((await container.pipeline.screen(new Request(ORIGIN + pathname)))?.status, 401, pathname);
      assert.equal(await container.pipeline.screen(new Request(ORIGIN + pathname, { headers: AUTH.admin })), null, pathname);
    }
    const action = new Request(ORIGIN + '/', { method: 'POST', headers: { ...AUTH.admin, 'Next-Action': 'x' } });
    assert.equal((await container.pipeline.screen(action))?.status, 405);
    assert.equal((await container.pipeline.screen(new Request(ORIGIN + '/health')))?.status, 200);
  });
});

describe('origin rules on writes', () => {
  const post = (origin: string | null): Promise<Response> => send('/api/probe-ok', { method: 'POST', headers: { ...AUTH.admin, ...(origin === null ? {} : { Origin: origin }) }, body: '{}' });
  it('cross-origin and the literal null origin get 403; missing and same origin pass', async () => {
    assert.equal((await post('http://evil.example')).status, 403);
    assert.equal((await post('null')).status, 403);
    assert.equal((await post(null)).status, 200);
    assert.equal((await post(ORIGIN)).status, 200);
  });
  it('a cross-origin GET is allowed', async () => {
    assert.equal((await send('/api/session', { headers: { ...AUTH.admin, Origin: 'http://evil.example' } })).status, 200);
  });
});

describe('body cap', () => {
  it('1,600,001 characters sent chunked without Content-Length get 413, 1,600,000 do not', async () => {
    const chunked = (characters: number): ReadableStream<Uint8Array> => {
      let sent = 0;
      return new ReadableStream({
        pull(controller) {
          const size = Math.min(65_536, characters - sent);
          if (size === 0) return controller.close();
          controller.enqueue(new TextEncoder().encode('a'.repeat(size)));
          sent += size;
        },
      });
    };
    const request = (characters: number): Request =>
      new Request(ORIGIN + '/api/probe-ok', { method: 'POST', headers: AUTH.admin, body: chunked(characters), duplex: 'half' } as RequestInit);
    const { handle } = await sessionPromise;
    assert.equal((await handle(request(1_600_001))).status, 413);
    assert.equal((await handle(request(1_600_000))).status, 400, 'at the cap the body is read, then rejected as non-JSON');
  });
  it('stops reading as soon as the cap is exceeded', async () => {
    let pulls = 0;
    const endless = new ReadableStream<Uint8Array>({ pull(controller) { pulls += 1; controller.enqueue(new TextEncoder().encode('a'.repeat(100_000))); } });
    const { handle } = await sessionPromise;
    const response = await handle(new Request(ORIGIN + '/api/probe-ok', { method: 'POST', headers: AUTH.admin, body: endless, duplex: 'half' } as RequestInit));
    assert.equal(response.status, 413);
    assert.ok(pulls < 40, `read ${pulls} chunks`);
  });
});

describe('response headers', () => {
  it('uses a different nonce per request and no unsafe-* source in a production policy', () => {
    const a = createNonce();
    const b = createNonce();
    assert.notEqual(a, b);
    const policy = contentSecurityPolicy(a, false);
    assert.doesNotMatch(policy, /unsafe-/);
    assert.match(contentSecurityPolicy(a, true), /'unsafe-eval'/);
    assert.ok(policy.includes(`script-src 'nonce-${a}' 'strict-dynamic'`));
    assert.ok(policy.includes(`style-src 'self' 'nonce-${a}'`));
    for (const directive of ["default-src 'self'", "img-src 'self' data: blob:", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"]) {
      assert.ok(policy.includes(directive), directive);
    }
  });
  it('sets the fixed security headers', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, 'n', false);
    assert.equal(headers.get('strict-transport-security'), 'max-age=31536000');
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('referrer-policy'), 'no-referrer');
    assert.equal(headers.get('cache-control'), 'no-store');
  });
});

describe('log hygiene', () => {
  it('a thrown error carrying personal data becomes the generic 503 and the sentinel is in no output', async () => {
    const written: string[] = [];
    const realOut = process.stdout.write.bind(process.stdout);
    const realErr = process.stderr.write.bind(process.stderr);
    const capture = (chunk: unknown): boolean => { written.push(String(chunk)); return true; };
    process.stdout.write = capture as typeof process.stdout.write;
    process.stderr.write = capture as typeof process.stderr.write;
    let response: Response;
    try {
      response = await send('/api/probe-throw', { method: 'POST', headers: AUTH.admin, body: JSON.stringify({ name: SENTINEL }) });
    } finally {
      process.stdout.write = realOut;
      process.stderr.write = realErr;
    }
    assert.equal(response.status, 503);
    assert.equal(await response.text(), JSON.stringify({ error: '데이터 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }));
    assert.equal(logged.length, 1);
    assert.equal(logged[0], 'Request failed: route=/api/probe-throw status=503 error=Error');
    assert.ok(![...written, ...logged].join('\n').includes(SENTINEL));
  });
});

describe('source bans over web/src', () => {
  const SRC = path.resolve(import.meta.dirname, '..');
  const files = collectFiles(SRC).filter((file) => !file.endsWith('guard.security.spec.ts') && !file.endsWith('architecture.spec.ts'));
  for (const banned of ['NEXT_PUBLIC_', 'dangerouslySetInnerHTML', 'sql.raw', '.unsafe(']) {
    it(`no source file contains ${banned}`, () => {
      const hits = files.filter((file) => readFileSync(file, 'utf8').includes(banned));
      assert.deepEqual(hits, []);
    });
  }
});
