// Integration scenarios: request -> guard pipeline -> route -> use case -> orbit_kpi in a real (PGlite) database.
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';
import type { OrbitFunctions } from '../../../../shared/port/OrbitFunctions.ts';

const ORIGIN = 'http://api.test';
const GHOST = '00000000-0000-4000-8000-000000000000';
const auth = (user: string, password: string) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const ADMIN = auth('admin', 'admin-pw');
const VIEWER = auth('viewer', 'viewer-pw');

let container: Container | undefined;
afterEach(async () => {
  await container?.stop();
  container = undefined;
});

async function start(): Promise<{ call: (method: string, path: string, body?: unknown, authorization?: string) => Promise<{ status: number; json: any; headers: Headers }>; orbit: OrbitFunctions; taskId: string }> {
  container = createContainer({ ADMIN_PASSWORD: 'admin-pw', VIEWER_PASSWORD: 'viewer-pw' }, { log: () => {} });
  const orbit = await container.orbitFunctions();
  const created = (await orbit.call('orbit_api', { action: 'create', payload: { title: '배정 시험', requester: '직원', requested_at: '2026-11-03T01:00:00Z' } })) as { id: string };
  const pipeline = container.pipeline;
  const call = async (method: string, path: string, body?: unknown, authorization = ADMIN) => {
    const response = await pipeline.handle(
      new Request(ORIGIN + path, { method, headers: { Authorization: authorization, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }),
    );
    const text = await response.text();
    return { status: response.status, json: text.startsWith('{') ? JSON.parse(text) : undefined, headers: response.headers };
  };
  return { call, orbit, taskId: created.id };
}
const assigneeOf = async (orbit: OrbitFunctions, id: string) =>
  ((await orbit.call('orbit_kpi', { action: 'extras', payload: {} })) as Array<{ task_id: string; assignee: string }>).find((x) => x.task_id === id)?.assignee;

describe('assigning a task over HTTP [R-020]', () => {
  it('the administrator assigns a name of 1, 99 and 100 characters and the stored name is the trimmed one', async () => {
    const { call, orbit, taskId } = await start();
    for (const length of [1, 99, 100]) {
      const r = await call('POST', `/api/tasks/${taskId}/assign`, { assignee: ' ' + '가'.repeat(length) + ' ' });
      assert.deepEqual([r.status, r.json], [200, { ok: true }], `length ${length}`);
      assert.equal(await assigneeOf(orbit, taskId), '가'.repeat(length));
    }
  });

  it('an empty, blank or 101-character name is 400 with the range message and the stored name stays', async () => {
    const { call, orbit, taskId } = await start();
    await call('POST', `/api/tasks/${taskId}/assign`, { assignee: '원래 담당' });
    for (const assignee of ['', '   ', '\n\t ', '가'.repeat(101), '😀'.repeat(51), null]) {
      const r = await call('POST', `/api/tasks/${taskId}/assign`, { assignee });
      assert.deepEqual([r.status, r.json], [400, { error: '담당자를 1~100자로 입력하세요.' }], JSON.stringify(assignee));
    }
    assert.equal((await call('POST', `/api/tasks/${taskId}/assign`, {})).status, 400);
    assert.equal(await assigneeOf(orbit, taskId), '원래 담당');
  });

  it('a number is stored as its text and 50 emoji (100 UTF-16 units) are accepted', async () => {
    const { call, orbit, taskId } = await start();
    assert.equal((await call('POST', `/api/tasks/${taskId}/assign`, { assignee: 12345 })).status, 200);
    assert.equal(await assigneeOf(orbit, taskId), '12345');
    assert.equal((await call('POST', `/api/tasks/${taskId}/assign`, { assignee: '😀'.repeat(50) })).status, 200);
  });

  it('the name is checked before the task is looked up: a blank name for a missing task is 400, a good name is 404', async () => {
    const { call } = await start();
    assert.equal((await call('POST', `/api/tasks/${GHOST}/assign`, { assignee: '  ' })).status, 400);
    const r = await call('POST', `/api/tasks/${GHOST}/assign`, { assignee: 'x' });
    assert.deepEqual([r.status, r.json], [404, { error: '업무를 찾을 수 없습니다.' }]);
  });

  it('an id that is not a uuid is 400 with the format message', async () => {
    const { call } = await start();
    const r = await call('POST', '/api/tasks/no-such-task/assign', { assignee: 'x' });
    assert.deepEqual([r.status, r.json], [400, { error: '입력 형식을 확인하세요.' }]);
  });

  it('the viewer account is refused with 403 and nothing is stored; a GET on the route is the unsupported-request 404', async () => {
    const { call, orbit, taskId } = await start();
    const r = await call('POST', `/api/tasks/${taskId}/assign`, { assignee: '조회 계정' }, VIEWER);
    assert.deepEqual([r.status, r.json], [403, { error: '조회 계정은 업무를 변경할 수 없습니다.' }]);
    assert.equal(await assigneeOf(orbit, taskId), undefined);
    const get = await call('GET', `/api/tasks/${taskId}/assign`);
    assert.deepEqual([get.status, get.json], [404, { error: '지원하지 않는 요청입니다.' }]);
  });

  it('reassigning keeps the first assignment time', async () => {
    const { call, orbit, taskId } = await start();
    await call('POST', `/api/tasks/${taskId}/assign`, { assignee: '첫 담당' });
    const first = ((await orbit.call('orbit_kpi', { action: 'extras', payload: {} })) as Array<{ assigned_at: string }>)[0].assigned_at;
    await call('POST', `/api/tasks/${taskId}/assign`, { assignee: '둘째 담당' });
    const after = ((await orbit.call('orbit_kpi', { action: 'extras', payload: {} })) as Array<{ assigned_at: string; assignee: string }>)[0];
    assert.deepEqual([after.assignee, after.assigned_at], ['둘째 담당', first]);
  });
});

describe('marking test data over HTTP [R-021]', () => {
  it('true and false are accepted, repeated false too, and the detail shows the flag', async () => {
    const { call, orbit, taskId } = await start();
    for (const is_test of [true, false, false]) assert.deepEqual((await call('POST', `/api/tasks/${taskId}/test-data`, { is_test })).json, { ok: true });
    await call('POST', `/api/tasks/${taskId}/test-data`, { is_test: true });
    const extras = (await orbit.call('orbit_kpi', { action: 'extras', payload: {} })) as Array<{ is_test: boolean }>;
    assert.equal(extras[0].is_test, true);
  });

  it('every non-boolean is 400 with the check message, also for a task that does not exist (validation before lookup)', async () => {
    const { call, taskId } = await start();
    const bad: unknown[] = [undefined, 'true', 'false', 1, 0, null, [true]];
    for (const is_test of bad) {
      const r = await call('POST', `/api/tasks/${taskId}/test-data`, { is_test });
      assert.deepEqual([r.status, r.json], [400, { error: '데이터 구분을 확인하세요.' }], JSON.stringify(is_test));
    }
    assert.equal((await call('POST', `/api/tasks/${GHOST}/test-data`, { is_test: 'yes' })).status, 400);
    assert.equal((await call('POST', `/api/tasks/${GHOST}/test-data`, { is_test: true })).status, 404);
  });

  it('the viewer account is refused with 403', async () => {
    const { call, taskId } = await start();
    assert.equal((await call('POST', `/api/tasks/${taskId}/test-data`, { is_test: true }, VIEWER)).status, 403);
  });
});

describe('KPI status over HTTP', () => {
  it('is available for the administrator and the viewer, with the no-store header', async () => {
    const { call } = await start();
    for (const authorization of [ADMIN, VIEWER]) {
      const r = await call('GET', '/api/kpi-status', undefined, authorization);
      assert.deepEqual([r.status, r.json], [200, { available: true }]);
      assert.equal(r.headers.get('cache-control'), 'no-store');
    }
  });

  it('is 401 without credentials', async () => {
    const { call } = await start();
    assert.equal((await call('GET', '/api/kpi-status', undefined, auth('admin', 'wrong'))).status, 401);
  });
});
