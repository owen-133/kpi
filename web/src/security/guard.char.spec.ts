// Characterization of the guard in the administrator's and the viewer's words, through the whole pipeline over the real
// task routes (not a probe route): who may read, who may write, which origin may write, and what the open mode does.
// Same inputs and answers as the golden labels `secured/*` and `open/*` of the legacy portal.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../config/container.ts';
import type { Container } from '../config/container.ts';

const ADMIN = 'admin-secret-1';
const VIEWER = 'viewer-secret-2';
const ORIGIN = 'http://portal.test';
const basic = (user: string, password: string): string => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const AS = { admin: { Authorization: basic('admin', ADMIN) }, viewer: { Authorization: basic('viewer', VIEWER) } };
const INPUT = { title: '노트북 준비', requester: '홍길동', requested_at: '2026-11-03T01:00:00Z' };

type Answer = { status: number; body: any; headers: Headers };
async function ask(container: Container, method: string, path: string, headers: Record<string, string> = {}, body?: unknown): Promise<Answer> {
  const withBody = body === undefined ? {} : { body: JSON.stringify(body), headers: { ...headers, 'Content-Type': 'application/json' } };
  const response = await container.pipeline.handle(new Request(ORIGIN + path, { method, headers, ...withBody }));
  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* plain text answer */ }
  return { status: response.status, body: parsed, headers: response.headers };
}

let secured: Container;
let open: Container;
before(() => {
  secured = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: VIEWER }, { log: () => {} });
  open = createContainer({}, { log: () => {} });
});
after(async () => {
  await secured.stop();
  await open.stop();
});

describe('R-007 the viewer account changes nothing', () => {
  // R-007
  it('every write on the task routes is 403 with the viewer message, and the list afterwards is exactly what it was', async () => {
    const made = await ask(secured, 'POST', '/api/tasks', AS.admin, INPUT);
    assert.equal(made.status, 201);
    const id = made.body.id;
    const before = (await ask(secured, 'GET', `/api/tasks/${id}`, AS.viewer)).body;
    const writes: Array<[string, string, unknown]> = [
      ['POST', '/api/tasks', INPUT],
      ['POST', `/api/tasks/${id}/status`, { status: '진행 중' }],
      ['POST', `/api/tasks/${id}/notes`, { note: '몰래 메모' }],
      ['PUT', '/api/tasks', {}],
    ];
    for (const [method, path, body] of writes) {
      const answer = await ask(secured, method, path, AS.viewer, body);
      assert.equal(answer.status, 403, `${method} ${path}`);
      assert.deepEqual(answer.body, { error: '조회 계정은 업무를 변경할 수 없습니다.' }, `${method} ${path}`);
    }
    assert.deepEqual((await ask(secured, 'GET', `/api/tasks/${id}`, AS.viewer)).body, before, 'nothing changed');
    assert.equal(((await ask(secured, 'GET', '/api/tasks', AS.viewer)).body as unknown[]).length, 1, 'no task was added');
  });
  // R-007
  it('the viewer still reads: the list is 200 and the session says viewer', async () => {
    assert.equal((await ask(secured, 'GET', '/api/tasks', AS.viewer)).status, 200);
    assert.deepEqual((await ask(secured, 'GET', '/api/session', AS.viewer)).body, { role: 'viewer', shared: true });
  });
  // R-007 (the pair: the same write by the administrator is allowed)
  it('the administrator may do the same writes, so the 403 is about the account and not the route', async () => {
    assert.equal((await ask(secured, 'POST', '/api/tasks', AS.admin, INPUT)).status, 201);
  });
});

describe('R-008 Basic login and the open local mode', () => {
  const challenge = 'Basic realm="Orbit Ops", charset="UTF-8"';
  // R-008
  it('without credentials, with a wrong password, an unknown user, a password of the other account or a Bearer scheme the page and the API are 401 with the Basic challenge', async () => {
    const attempts: Array<[string, Record<string, string>]> = [
      ['/', {}],
      ['/api/tasks', {}],
      ['/', { Authorization: basic('admin', 'nope') }],
      ['/', { Authorization: basic('other', ADMIN) }],
      ['/', { Authorization: basic('admin', VIEWER) }],
      ['/', { Authorization: basic('viewer', ADMIN) }],
      ['/', { Authorization: 'Bearer x' }],
    ];
    for (const [path, headers] of attempts) {
      const answer = await ask(secured, 'GET', path, headers);
      assert.equal(answer.status, 401, path + JSON.stringify(headers));
      assert.equal(answer.headers.get('www-authenticate'), challenge);
      assert.equal(answer.body, '로그인이 필요합니다.');
    }
  });
  // R-008
  it('only GET /health is open: it answers ok without credentials while POST /health asks for the login', async () => {
    const get = await ask(secured, 'GET', '/health');
    assert.deepEqual([get.status, get.body], [200, { ok: true }]);
    assert.equal((await ask(secured, 'POST', '/health')).status, 401);
  });
  // R-008
  it('the session of a configured server is shared: admin and viewer each see their own role', async () => {
    assert.deepEqual((await ask(secured, 'GET', '/api/session', AS.admin)).body, { role: 'admin', shared: true });
    assert.deepEqual((await ask(secured, 'GET', '/api/session', AS.viewer)).body, { role: 'viewer', shared: true });
  });
  // R-008
  it('with no password configured nothing is asked: the caller passes as admin, the session is not shared, and writes work', async () => {
    assert.equal((await ask(open, 'GET', '/health')).status, 200);
    assert.deepEqual((await ask(open, 'GET', '/api/session')).body, { role: 'admin', shared: false });
    const made = await ask(open, 'POST', '/api/tasks', {}, { ...INPUT, title: '인증 없는 모드' });
    assert.equal(made.status, 201);
    assert.equal((await ask(open, 'POST', `/api/tasks/${made.body.id}/status`, {}, { status: '완료' })).status, 200);
    const listed = (await ask(open, 'GET', '/api/tasks')).body as Array<{ title: string; status: string }>;
    assert.deepEqual(listed.map((task) => [task.title, task.status]), [['인증 없는 모드', '완료']]);
  });
});

describe('R-009 a write from another origin is refused', () => {
  // R-009
  it('a POST whose Origin is not the server is 403 with the refusal message, on create and on status, and stores nothing', async () => {
    const made = await ask(secured, 'POST', '/api/tasks', AS.admin, INPUT);
    const id = made.body.id;
    const count = async () => ((await ask(secured, 'GET', '/api/tasks', AS.admin)).body as unknown[]).length;
    const before = await count();
    for (const evil of ['http://evil.example', 'https://evil.example']) {
      const create = await ask(secured, 'POST', '/api/tasks', { ...AS.admin, Origin: evil }, INPUT);
      assert.deepEqual([create.status, create.body], [403, { error: '허용되지 않은 요청입니다.' }]);
      const status = await ask(secured, 'POST', `/api/tasks/${id}/status`, { ...AS.admin, Origin: evil }, { status: '진행 중' });
      assert.deepEqual([status.status, status.body], [403, { error: '허용되지 않은 요청입니다.' }]);
    }
    assert.equal(await count(), before);
    assert.equal((await ask(secured, 'GET', `/api/tasks/${id}`, AS.admin)).body.status, '접수', 'the status stayed');
  });
  // R-009
  it('a GET from another origin passes, and a POST from the server itself passes', async () => {
    assert.equal((await ask(secured, 'GET', '/api/session', { ...AS.admin, Origin: 'http://evil.example' })).status, 200);
    const id = (await ask(secured, 'POST', '/api/tasks', AS.admin, INPUT)).body.id;
    assert.equal((await ask(secured, 'POST', `/api/tasks/${id}/notes`, { ...AS.admin, Origin: ORIGIN }, { note: '같은 출처' })).status, 201);
  });
});
