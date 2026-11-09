// PLAN section 5 required tests that run in-process on PGlite:
//   every registered route x {no auth, wrong password, viewer, admin}, a viewer's writes never change the data,
//   and a marker inside a database error never reaches a log line.
// Covered elsewhere: body cap with chunked transfer and the thrown-error sentinel (guard.security.spec.ts), headers on
// 401/403/404/413/503 and the bundle scan (production.security.spec.ts), role limits (roles.security.spec.ts).
// Covered later: CSV formula input (the board UI chunk), upload boundary (the attachment context).
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ADMIN_PASSWORD, VIEWER_PASSWORD } from '../parity/legacyOracle.ts';
import { registeredRoutes, ROUTE_FACTORY_NAMES, startNextCandidate } from '../parity/nextCandidate.ts';
import type { RouteDefinition } from '../shared/adapter/in/web/RouteRegistry.ts';

const ORIGIN = 'http://matrix.test';
const basic = (user: string, password: string): string => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const AUTH = {
  none: {} as Record<string, string>,
  wrong: { Authorization: basic('admin', 'wrong') },
  viewer: { Authorization: basic('viewer', VIEWER_PASSWORD) },
  admin: { Authorization: basic('admin', ADMIN_PASSWORD) },
};
const MARKER = 'DBMARK-홍길동-010-9999-0000';
const logged: string[] = [];
const probe: RouteDefinition[] = [
  // A real failing database call whose raw driver error carries the marker in its message and detail, the way
  // postgres.js reports `Failing row contains (...)`. The port's own translation hides the marker, so the driver
  // error is rebuilt here: this tests the guard's error boundary, not the adapter's translation.
  {
    method: 'POST',
    pattern: '/api/probe-db-error',
    handler: async (context) => {
      const orbit = await container().orbitFunctions();
      await orbit.call('orbit_api', { action: 'status', payload: { id: String(context.body.marker), status: 'done' } }).catch(() => undefined);
      throw Object.assign(new Error(`invalid input syntax for type uuid: "${String(context.body.marker)}"`), { name: 'PostgresError', detail: `Failing row contains (${String(context.body.marker)})` });
    },
  },
];
const sessionPromise = startNextCandidate({ extraRoutes: probe, log: (line) => logged.push(line) });
let current: Awaited<typeof sessionPromise>['container'] | undefined;
const container = () => current as NonNullable<typeof current>;
const ready = sessionPromise.then((session) => { current = session.container; return session; });
after(async () => (await sessionPromise).stop?.());

const send = async (pathname: string, init: RequestInit = {}): Promise<Response> => (await ready).handle(new Request(ORIGIN + pathname, init));

/** A concrete path for a route: a string pattern as is, a RegExp with each `([^/]+)` group replaced by a sample segment. */
function samplePath(route: RouteDefinition): string {
  if (typeof route.pattern === 'string') return route.pattern;
  const sample = route.pattern.source.replace(/^\^/, '').replace(/\$$/, '').replace(/\\\//g, '/').replace(/\(\[\^\/\]\+\)/g, '00000000-0000-4000-8000-000000000001');
  assert.ok(route.pattern.exec(sample)?.[0] === sample, `cannot derive a sample path from ${route.pattern}`);
  return sample;
}
const methodsOf = (route: RouteDefinition): string[] => (route.method === 'ANY' ? ['GET', 'POST'] : [route.method]);
const protectedRoutes = registeredRoutes().filter((route) => route.isPublic !== true);

describe('registry', () => {
  it('the spec rebuilds the same factory list the container wires, and none is public except /health', () => {
    const source = readFileSync(path.resolve(import.meta.dirname, '..', 'config', 'container.ts'), 'utf8');
    const block = source.slice(source.indexOf('const routes: RouteDefinition[] = ['), source.indexOf('...(options.extraRoutes'));
    const wired = [...block.matchAll(/\.\.\.(\w+)\(/g)].map((match) => match[1]);
    assert.deepEqual(wired, [...ROUTE_FACTORY_NAMES]);
    assert.deepEqual(registeredRoutes().filter((route) => route.isPublic === true).map((route) => String(route.pattern)), ['/health']);
    assert.ok(protectedRoutes.length >= 20, `only ${protectedRoutes.length} routes`);
  });
  it('every protected route is reached by the real pipeline (admin does not get the unmatched-route 404)', async () => {
    for (const route of protectedRoutes) {
      for (const method of methodsOf(route)) {
        const response = await send(samplePath(route), { method, headers: AUTH.admin, body: method === 'GET' ? undefined : '{}' });
        const text = await response.text();
        assert.ok(!(response.status === 404 && text.includes('지원하지 않는 요청입니다')), `${method} ${samplePath(route)} is not routed by the container`);
      }
    }
  });
});

describe('path x role matrix over every registered route', () => {
  for (const route of protectedRoutes) {
    for (const method of methodsOf(route)) {
      const pathname = samplePath(route);
      const body = method === 'GET' ? undefined : '{}';
      it(`${method} ${pathname}`, async () => {
        for (const headers of [AUTH.none, AUTH.wrong]) {
          const response = await send(pathname, { method, headers, body });
          assert.equal(response.status, 401, 'no auth and a wrong password');
          assert.equal(response.headers.get('www-authenticate'), 'Basic realm="Orbit Ops", charset="UTF-8"');
        }
        const viewer = await send(pathname, { method, headers: AUTH.viewer, body });
        const admin = await send(pathname, { method, headers: AUTH.admin, body });
        if (method === 'GET') {
          assert.ok(viewer.status !== 401 && viewer.status < 500, `viewer GET got ${viewer.status}`);
          // an admin-only read (settings history) is a role refusal, so the admin must get through on the same path
          if (viewer.status === 403) assert.equal(admin.status, 200, 'a viewer 403 on a read is allowed only where the admin reads it');
        } else assert.equal(viewer.status, 403, 'a viewer write');
        assert.ok(admin.status !== 401 && admin.status !== 403 && admin.status !== 405 && admin.status < 500, `admin got ${admin.status}`);
      });
    }
  }
});

describe('a viewer never changes the data', () => {
  const FUNCTIONS = [
    ['orbit_api', 'list'], ['orbit_kpi', 'extras'], ['orbit_kpi', 'improvements'], ['orbit_kpi', 'reports'], ['orbit_settings', 'get'], ['orbit_settings', 'history'],
  ] as const;
  const snapshot = async (): Promise<string> => {
    const orbit = await (await ready).container.orbitFunctions();
    const parts: unknown[] = [];
    for (const [name, action] of FUNCTIONS) parts.push(await orbit.call(name, { action, payload: {} }));
    return JSON.stringify(parts);
  };
  it('every write route as viewer is refused and the data is byte-identical; the same snapshot does see an admin write', async () => {
    const created = await send('/api/tasks', { method: 'POST', headers: AUTH.admin, body: JSON.stringify({ title: 'seed', requester: '홍', requested_at: '2026-11-03T01:00:00Z' }) });
    assert.equal(created.status, 201);
    const { id } = (await created.json()) as { id: string };
    const before = await snapshot();
    const writes = protectedRoutes.flatMap((route) => methodsOf(route).filter((method) => method !== 'GET').map((method) => ({ route, method })));
    assert.ok(writes.length >= 10, `only ${writes.length} write routes`);
    for (const { route, method } of writes) {
      const pathname = samplePath(route).replace('00000000-0000-4000-8000-000000000001', id);
      const body = JSON.stringify({ title: 'viewer', requester: 'v', requested_at: '2026-11-03T01:00:00Z', status: 'done', note: 'viewer note', assignee: 'v', values: {}, revision: 1, month: '2026-10' });
      const response = await send(pathname, { method, headers: AUTH.viewer, body });
      assert.equal(response.status, 403, `${method} ${pathname}`);
    }
    assert.equal(await snapshot(), before);
    await send('/api/tasks', { method: 'POST', headers: AUTH.admin, body: JSON.stringify({ title: 'second', requester: '홍', requested_at: '2026-11-03T02:00:00Z' }) });
    assert.notEqual(await snapshot(), before, 'the snapshot must notice a real write');
  });
});

describe('log hygiene for database errors', () => {
  it('a marker inside the raw PostgreSQL error becomes a 503 and appears in no log line or output', async () => {
    const written: string[] = [];
    const realOut = process.stdout.write.bind(process.stdout);
    const realErr = process.stderr.write.bind(process.stderr);
    const capture = (chunk: unknown): boolean => { written.push(String(chunk)); return true; };
    process.stdout.write = capture as typeof process.stdout.write;
    process.stderr.write = capture as typeof process.stderr.write;
    let response: Response;
    try {
      response = await send('/api/probe-db-error', { method: 'POST', headers: AUTH.admin, body: JSON.stringify({ marker: MARKER }) });
    } finally {
      process.stdout.write = realOut;
      process.stderr.write = realErr;
    }
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes(MARKER));
    assert.equal(logged.length, 1);
    assert.match(logged[0], /^Request failed: route=\/api\/probe-db-error status=503 error=PostgresError$/);
    assert.ok(![...written, ...logged].join('\n').includes(MARKER));
  });
});
