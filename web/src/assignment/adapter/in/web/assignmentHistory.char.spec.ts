// R-020 R-021: the history rows that assigning and marking test data leave on a request, through the guard pipeline
// over the real SQL. Same inputs and rows as the legacy portal on the cloud database (the recorded answers); the actor is
// `admin`. The legacy SQLite store wrote "미배정 → name" / "old → new" for assignments; the SQL function writes the bare
// name, and the Next app follows the SQL, so that sentence form is not pinned here.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';

const ADMIN = 'admin-secret-1';
const VIEWER = 'viewer-secret-2';
const GHOST = '00000000-0000-4000-8000-000000000000';
const basic = (user: string, password: string) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
let container: Container;
before(() => {
  container = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: VIEWER }, { log: () => {} });
});
after(async () => container.stop());

async function send(method: string, path: string, body?: unknown, viewer = false): Promise<{ status: number; body: any }> {
  const headers = new Headers({ Authorization: viewer ? basic('viewer', VIEWER) : basic('admin', ADMIN), 'Content-Type': 'application/json' });
  const response = await container.pipeline.handle(new Request('http://portal.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: response.status, body: await response.json() };
}
const newTask = async (): Promise<string> => (await send('POST', '/api/tasks', { title: '이력 업무', requester: '홍길동', requested_at: '2026-11-03T01:00:00Z' })).body.id;
const historyOf = async (id: string, kind: string): Promise<Array<{ detail: string; actor: string }>> =>
  ((await send('GET', `/api/tasks/${id}`)).body.events as Array<{ kind: string; detail: string; actor: string }>).filter((e) => e.kind === kind);

describe('R-020 assigning writes the history', () => {
  // R-020
  it('every assignment adds a row named after the trimmed assignee, in the order they were made', async () => {
    const id = await newTask();
    await send('POST', `/api/tasks/${id}/assign`, { assignee: '  김담당 ' });
    await send('POST', `/api/tasks/${id}/assign`, { assignee: '이담당' });
    const rows = await historyOf(id, '담당자 배정');
    assert.deepEqual(rows.map((e) => e.detail), ['김담당', '이담당']);
    assert.deepEqual([...new Set(rows.map((e) => e.actor))], ['admin']);
  });
  // R-020
  it('an unknown task is 404 with the not-found message and the viewer is 403 with the viewer message, and neither writes a row', async () => {
    const id = await newTask();
    const missing = await send('POST', `/api/tasks/${GHOST}/assign`, { assignee: 'x' });
    assert.deepEqual([missing.status, missing.body], [404, { error: '업무를 찾을 수 없습니다.' }]);
    const viewer = await send('POST', `/api/tasks/${id}/assign`, { assignee: 'x' }, true);
    assert.deepEqual([viewer.status, viewer.body], [403, { error: '조회 계정은 업무를 변경할 수 없습니다.' }]);
    assert.deepEqual(await historyOf(id, '담당자 배정'), []);
  });
  // R-020
  it('a missing or null assignee is empty and refused; a number is read as its text', async () => {
    const id = await newTask();
    for (const body of [{}, { assignee: null }]) {
      const answer = await send('POST', `/api/tasks/${id}/assign`, body);
      assert.deepEqual([answer.status, answer.body], [400, { error: '담당자를 1~100자로 입력하세요.' }], JSON.stringify(body));
    }
    assert.equal((await send('POST', `/api/tasks/${id}/assign`, { assignee: 42 })).status, 200);
    assert.deepEqual((await historyOf(id, '담당자 배정')).map((e) => e.detail), ['42']);
  });
});

describe('R-021 the data flag writes the history', () => {
  // R-021
  it('flipping to test data and back writes one sentence per direction and the list shows the flag each time', async () => {
    const id = await newTask();
    const flagOf = async (): Promise<unknown> => ((await send('GET', '/api/tasks')).body as Array<{ id: string; is_test?: unknown }>).find((t) => t.id === id)?.is_test;
    assert.deepEqual((await send('POST', `/api/tasks/${id}/test-data`, { is_test: true })).body, { ok: true });
    assert.deepEqual((await historyOf(id, '데이터 구분 변경')).map((e) => e.detail), ['테스트 업무 · 지표 제외']);
    assert.equal(await flagOf(), true);
    await send('POST', `/api/tasks/${id}/test-data`, { is_test: false });
    assert.deepEqual((await historyOf(id, '데이터 구분 변경')).map((e) => e.detail), ['테스트 업무 · 지표 제외', '실제 업무 · 지표 포함']);
    assert.equal(await flagOf(), false);
  });
  // R-021
  it('a value that is not a boolean is 400 and writes no history row; the real booleans still work afterwards', async () => {
    const id = await newTask();
    for (const body of [{}, { is_test: 'true' }, { is_test: 1 }, { is_test: 0 }, { is_test: null }, { is_test: 'false' }, { is_test: [true] }]) {
      const answer = await send('POST', `/api/tasks/${id}/test-data`, body);
      assert.deepEqual([answer.status, answer.body], [400, { error: '데이터 구분을 확인하세요.' }], JSON.stringify(body));
    }
    assert.deepEqual(await historyOf(id, '데이터 구분 변경'), []);
    assert.equal((await send('POST', `/api/tasks/${id}/test-data`, { is_test: false })).status, 200);
  });
  // R-021
  it('setting the same value again still writes a history row: there is no change detection', async () => {
    const id = await newTask();
    await send('POST', `/api/tasks/${id}/test-data`, { is_test: false });
    await send('POST', `/api/tasks/${id}/test-data`, { is_test: false });
    assert.deepEqual((await historyOf(id, '데이터 구분 변경')).map((e) => e.detail), ['실제 업무 · 지표 포함', '실제 업무 · 지표 포함']);
  });
});
