// R-001 R-002 R-003 R-004 R-006
// Scenario: the request context through the whole guard pipeline over an in-memory PGlite holding supabase/*.sql.
// Every case reads like something the administrator or the viewer does with the portal.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';

const ADMIN = 'admin-secret-1';
const VIEWER = 'viewer-secret-2';
const basic = (user: string, password: string) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ABSENT = '00000000-0000-4000-8000-000000000001';
const ISO = '2026-11-03T01:00:00Z';

type Answer = { status: number; body: any };
let container: Container;
before(() => {
  container = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: VIEWER }, { log: () => {} });
});
after(async () => {
  await container.stop();
});

async function send(method: string, path: string, body?: unknown, who: 'admin' | 'viewer' = 'admin'): Promise<Answer> {
  const headers = new Headers({ Authorization: who === 'admin' ? basic('admin', ADMIN) : basic('viewer', VIEWER) });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await container.pipeline.handle(new Request('http://portal.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: response.status, body: await response.json() };
}
const create = (over: Record<string, unknown> = {}) => send('POST', '/api/tasks', { title: '노트북 준비', requester: '홍길동', requested_at: ISO, ...over });
async function newId(over: Record<string, unknown> = {}): Promise<string> {
  const answer = await create(over);
  assert.equal(answer.status, 201);
  return answer.body.id;
}

describe('registering a request', () => {
  it('an administrator registers a request and it shows up, trimmed, at the top of the list as 접수', async () => {
    const answer = await create({ title: '  최소 입력  ', requester: ' 김철수 ', department: '인사팀', due_date: '2026-11-05' });
    assert.equal(answer.status, 201);
    assert.match(answer.body.id, UUID);
    const listed = (await send('GET', '/api/tasks')).body as Array<Record<string, unknown>>;
    const mine = listed.find((task) => task.id === answer.body.id);
    assert.equal(mine?.title, '최소 입력');
    assert.equal(mine?.requester, '김철수');
    assert.equal(mine?.status, '접수');
    assert.equal(mine?.department, '인사팀');
    assert.equal(mine?.due_date, '2026-11-05');
  });

  it('the list carries the KPI extras of each task (assignee empty, not a test)', async () => {
    const id = await newId();
    await send('POST', `/api/tasks/${id}/status`, { status: '진행 중' });
    const mine = ((await send('GET', '/api/tasks')).body as Array<Record<string, unknown>>).find((task) => task.id === id);
    assert.equal(mine?.status, '진행 중');
    assert.equal('assignee' in (mine ?? {}), false, 'no extras row exists until the task is assigned or flagged');
  });

  const missing: Array<[string, Record<string, unknown>]> = [
    ['title missing', { title: undefined }],
    ['title only spaces', { title: '   ' }],
    ['title a number zero', { title: 0 }],
    ['requester missing', { requester: undefined }],
    ['requested_at missing', { requested_at: undefined }],
    ['requested_at not a date', { requested_at: 'not a date' }],
  ];
  for (const [name, over] of missing) {
    it(`refuses with 400 and the required-fields message when ${name}`, async () => {
      const answer = await create(over);
      assert.deepEqual([answer.status, answer.body], [400, { error: '제목, 요청자, 요청 시각을 확인하세요.' }]);
    });
  }

  for (const due of ['11/05', '2026-02-31', '2026-1-5', ' x']) {
    it(`refuses with 400 and the due-date message for due_date '${due}'`, async () => {
      const answer = await create({ due_date: due });
      assert.deepEqual([answer.status, answer.body], [400, { error: '기한을 확인하세요.' }]);
    });
  }

  it('accepts an empty due date and a real calendar day', async () => {
    assert.equal((await create({ due_date: '' })).status, 201);
    assert.equal((await create({ due_date: '2026-02-28' })).status, 201);
  });

  it('a field of 9999, 10000 characters is accepted and 10001 is refused with the length message, for every field', async () => {
    for (const length of [9999, 10000]) assert.equal((await create({ description: 'a'.repeat(length) })).status, 201, String(length));
    for (const field of ['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description']) {
      const answer = await create({ [field]: 'a'.repeat(10001) });
      assert.deepEqual([answer.status, answer.body], [400, { error: '입력 길이를 확인하세요.' }], field);
    }
  });

  it('the length is measured after trimming: 10000 characters between blanks pass, and the length message wins over the required fields', async () => {
    assert.equal((await create({ description: '  ' + 'a'.repeat(10000) + '  ' })).status, 201);
    const answer = await create({ title: '', description: 'a'.repeat(10001) });
    assert.deepEqual(answer.body, { error: '입력 길이를 확인하세요.' });
  });

  it('non-text values are read like the legacy server: numbers become text, falsy values become empty', async () => {
    const id = await newId({ title: 12345, department: false, channel: null });
    const task = (await send('GET', `/api/tasks/${id}`)).body;
    assert.equal(task.title, '12345');
    assert.equal(task.department, '');
    assert.equal(task.channel, '');
  });

  it('a viewer cannot register: 403 and nothing is stored', async () => {
    const before = ((await send('GET', '/api/tasks')).body as unknown[]).length;
    const answer = await send('POST', '/api/tasks', { title: 'x', requester: 'y', requested_at: ISO }, 'viewer');
    assert.deepEqual([answer.status, answer.body], [403, { error: '조회 계정은 업무를 변경할 수 없습니다.' }]);
    assert.equal(((await send('GET', '/api/tasks')).body as unknown[]).length, before);
  });
});

describe('changing the status', () => {
  it('moves a request through 진행 중, 대기 and 완료 and records each change in the history', async () => {
    const id = await newId();
    assert.deepEqual((await send('POST', `/api/tasks/${id}/status`, { status: '진행 중' })).body, { ok: true });
    assert.deepEqual((await send('POST', `/api/tasks/${id}/status`, { status: '대기', reason: '부품 대기' })).body, { ok: true });
    assert.deepEqual((await send('POST', `/api/tasks/${id}/status`, { status: '완료' })).body, { ok: true });
    const task = (await send('GET', `/api/tasks/${id}`)).body;
    assert.equal(task.status, '완료');
    assert.notEqual(task.completed_at, null);
    assert.deepEqual(task.events.map((e: any) => [e.kind, e.detail]).slice(1), [
      ['상태 변경', '접수 → 진행 중'],
      ['상태 변경', '진행 중 → 대기 · 부품 대기'],
      ['상태 변경', '대기 → 완료'],
    ]);
  });

  it('refuses a status that is not one of the four with 400', async () => {
    const id = await newId();
    for (const status of ['없는상태', '', ' 완료', undefined, null, 1, ['완료']]) {
      const answer = await send('POST', `/api/tasks/${id}/status`, { status });
      assert.deepEqual([answer.status, answer.body], [400, { error: '올바른 상태를 선택하세요.' }], String(status));
    }
  });

  it('answers ok without writing a history line when the status does not change', async () => {
    const id = await newId();
    await send('POST', `/api/tasks/${id}/status`, { status: '진행 중' });
    const events = async () => (await send('GET', `/api/tasks/${id}`)).body.events.length;
    const before = await events();
    assert.deepEqual((await send('POST', `/api/tasks/${id}/status`, { status: '진행 중' })).body, { ok: true });
    assert.equal(await events(), before);
  });

  it('reopening a finished request needs a reason: 400 without one, and it stays finished', async () => {
    const id = await newId();
    await send('POST', `/api/tasks/${id}/status`, { status: '완료' });
    for (const reason of [undefined, '', '   ']) {
      const answer = await send('POST', `/api/tasks/${id}/status`, { status: '진행 중', ...(reason === undefined ? {} : { reason }) });
      assert.deepEqual([answer.status, answer.body], [400, { error: '완료 업무를 재개하는 사유를 입력하세요.' }]);
    }
    assert.equal((await send('GET', `/api/tasks/${id}`)).body.status, '완료');
    assert.deepEqual((await send('POST', `/api/tasks/${id}/status`, { status: '진행 중', reason: '  추가 설치  ' })).body, { ok: true });
    const task = (await send('GET', `/api/tasks/${id}`)).body;
    assert.equal(task.status, '진행 중');
    assert.equal(task.completed_at, null);
    assert.equal(task.events.at(-1).detail, '완료 → 진행 중 · 추가 설치');
  });

  it('a reason of 10000 characters is accepted and 10001 is refused with the reason message, even when the status is wrong', async () => {
    const id = await newId();
    await send('POST', `/api/tasks/${id}/status`, { status: '완료' });
    assert.equal((await send('POST', `/api/tasks/${id}/status`, { status: '진행 중', reason: 'a'.repeat(10000) })).status, 200);
    const tooLong = await send('POST', `/api/tasks/${id}/status`, { status: '완료', reason: 'a'.repeat(10001) });
    assert.deepEqual([tooLong.status, tooLong.body], [400, { error: '사유가 너무 깁니다.' }]);
    const bothWrong = await send('POST', `/api/tasks/${id}/status`, { status: '없음', reason: 'a'.repeat(10001) });
    assert.deepEqual(bothWrong.body, { error: '올바른 상태를 선택하세요.' });
  });

  it('answers 404 for an unknown task and 400 for an id that is not a uuid', async () => {
    const unknown = await send('POST', `/api/tasks/${ABSENT}/status`, { status: '진행 중' });
    assert.deepEqual([unknown.status, unknown.body], [404, { error: '업무를 찾을 수 없습니다.' }]);
    const notUuid = await send('POST', '/api/tasks/not-a-uuid/status', { status: '진행 중' });
    assert.deepEqual([notUuid.status, notUuid.body], [400, { error: '식별자 또는 시각 형식을 확인하세요.' }]);
  });

  it('a viewer cannot change a status: 403 and the status stays', async () => {
    const id = await newId();
    const answer = await send('POST', `/api/tasks/${id}/status`, { status: '완료' }, 'viewer');
    assert.equal(answer.status, 403);
    assert.equal((await send('GET', `/api/tasks/${id}`)).body.status, '접수');
  });
});

describe('adding a note', () => {
  it('adds a trimmed note to the history and answers 201', async () => {
    const id = await newId();
    const answer = await send('POST', `/api/tasks/${id}/notes`, { note: '  장비 준비 완료  ' });
    assert.deepEqual([answer.status, answer.body], [201, { ok: true }]);
    const last = (await send('GET', `/api/tasks/${id}`)).body.events.at(-1);
    assert.deepEqual([last.kind, last.detail], ['처리 메모', '장비 준비 완료']);
  });

  it('refuses an empty, blank or missing note with the 1-10000 message', async () => {
    const id = await newId();
    for (const body of [{ note: '' }, { note: '  \n ' }, {}, { note: null }, { note: 0 }]) {
      const answer = await send('POST', `/api/tasks/${id}/notes`, body);
      assert.deepEqual([answer.status, answer.body], [400, { error: '메모를 1~10000자로 입력하세요.' }], JSON.stringify(body));
    }
  });

  it('accepts 1 and 10000 characters and refuses 10001', async () => {
    const id = await newId();
    for (const length of [1, 9999, 10000]) assert.equal((await send('POST', `/api/tasks/${id}/notes`, { note: 'a'.repeat(length) })).status, 201, String(length));
    assert.equal((await send('POST', `/api/tasks/${id}/notes`, { note: 'a'.repeat(10001) })).status, 400);
  });

  it('answers 404 for an unknown task and 403 for a viewer', async () => {
    const unknown = await send('POST', `/api/tasks/${ABSENT}/notes`, { note: 'x' });
    assert.deepEqual([unknown.status, unknown.body], [404, { error: '업무를 찾을 수 없습니다.' }]);
    assert.equal((await send('POST', `/api/tasks/${ABSENT}/notes`, { note: 'x' }, 'viewer')).status, 403);
  });
});

describe('reading a request', () => {
  it('the detail has the task, its history in order and the KPI part; a viewer may read it too', async () => {
    const id = await newId({ description: '내용' });
    await send('POST', `/api/tasks/${id}/notes`, { note: '첫 메모' });
    for (const who of ['admin', 'viewer'] as const) {
      const answer = await send('GET', `/api/tasks/${id}`, undefined, who);
      assert.equal(answer.status, 200);
      assert.equal(answer.body.id, id);
      assert.equal(answer.body.description, '내용');
      assert.deepEqual(answer.body.events.map((e: any) => e.kind), ['등록', '처리 메모']);
      assert.deepEqual(answer.body.kpi, { files: [], available: true });
    }
  });

  it('an unknown task is 404 and an id that is not a uuid is 400', async () => {
    const unknown = await send('GET', `/api/tasks/${ABSENT}`);
    assert.deepEqual([unknown.status, unknown.body], [404, { error: '업무를 찾을 수 없습니다.' }]);
    const notUuid = await send('GET', '/api/tasks/not-a-uuid');
    assert.deepEqual([notUuid.status, notUuid.body], [400, { error: '식별자 또는 시각 형식을 확인하세요.' }]);
  });

  it('a path no request route owns is 404, not a database call: wrong method, extra segment, empty id', async () => {
    const id = await newId();
    for (const [method, path] of [['GET', `/api/tasks/${id}/status`], ['POST', `/api/tasks/${id}`], ['PUT', '/api/tasks'], ['GET', '/api/tasks/'], ['GET', `/api/tasks/${id}/x/y`]]) {
      const answer = await send(method, path, method === 'POST' ? {} : undefined);
      assert.deepEqual([answer.status, answer.body], [404, { error: '지원하지 않는 요청입니다.' }], `${method} ${path}`);
    }
  });
});
