// R-031 R-026 R-027
// Scenario: editing, deleting, restoring and purging a request through the whole guard pipeline over an in-memory PGlite
// holding supabase/*.sql. Every case reads like something the administrator or the viewer does with the portal.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';

const ADMIN = 'admin-secret-1';
const VIEWER = 'viewer-secret-2';
const basic = (user: string, password: string) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const ABSENT = '00000000-0000-4000-8000-000000000001';
const ISO = '2026-11-03T01:00:00Z';
const FIELD = '수정 항목을 확인하세요.';
const REQUIRED = '업무명·요청자·요청 시각·기한을 확인하세요.';
const REASON = '수정 사유와 버전을 확인하세요.';
const NOT_FOUND = '업무를 찾을 수 없습니다.';
const VIEWER_WRITE = '조회 계정은 업무를 변경할 수 없습니다.';
const VIEWER_TRASH = '관리자만 휴지통과 삭제 이력을 볼 수 있습니다.';

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
const input = { title: '노트북 준비', requester: '홍길동', department: '인사팀', channel: '메신저', category: '비품·자산', priority: '높음', requested_at: ISO, due_date: '2026-11-05', description: '1대' };
async function newId(over: Record<string, unknown> = {}): Promise<string> {
  const answer = await send('POST', '/api/tasks', { ...input, ...over });
  assert.equal(answer.status, 201);
  return answer.body.id;
}
const edited = { ...input, title: '수정된 업무', requester: '수정 요청자', description: '수정된 내용' };
const edit = (id: string, over: Record<string, unknown> = {}, who: 'admin' | 'viewer' = 'admin') => send('POST', `/api/tasks/${id}/edit`, { values: edited, revision: 0, reason: '정정', ...over }, who);
const lifecycle = (id: string, action: string, over: Record<string, unknown> = {}, who: 'admin' | 'viewer' = 'admin') => send('POST', `/api/tasks/${id}/${action}`, { reason: '사유', ...over }, who);
const detail = async (id: string) => (await send('GET', `/api/tasks/${id}`)).body;

describe('editing a request', () => {
  it('a valid edit answers revision 1, changes the stored fields, keeps the status and writes one history row with reason and before/after', async () => {
    const id = await newId();
    const answer = await edit(id, { reason: '  정정 사유  ' });
    assert.deepEqual([answer.status, answer.body], [200, { ok: true, revision: 1 }]);
    const task = await detail(id);
    assert.equal(task.title, '수정된 업무');
    assert.equal(task.edit_revision, 1);
    assert.equal(task.status, '접수');
    const rows = task.events.filter((e: any) => e.kind === '업무 정보 수정');
    assert.equal(rows.length, 1);
    const recorded = JSON.parse(rows[0].detail);
    assert.equal(recorded.reason, '정정 사유');
    assert.deepEqual(recorded.changes.title, { before: '노트북 준비', after: '수정된 업무' });
  });

  it('values are trimmed before they are stored', async () => {
    const id = await newId();
    await edit(id, { values: { ...edited, title: '  앞뒤 공백  ', requester: ' 김 ' } });
    const task = await detail(id);
    assert.equal(task.title, '앞뒤 공백');
    assert.equal(task.requester, '김');
  });

  it('an edit that changes nothing answers unchanged, adds no history row and keeps revision 0', async () => {
    const id = await newId();
    const answer = await edit(id, { values: input, reason: '변경 없음' });
    assert.deepEqual([answer.status, answer.body], [200, { ok: true, unchanged: true }]);
    const task = await detail(id);
    assert.equal(task.edit_revision, 0);
    assert.equal(task.events.filter((e: any) => e.kind === '업무 정보 수정').length, 0);
  });

  it('a field is accepted at 10000 characters and refused at 10001, measured before trimming; a rejected edit leaves the revision', async () => {
    const id = await newId();
    for (const description of ['a'.repeat(10001), ' ' + 'a'.repeat(10000)]) {
      const answer = await edit(id, { values: { ...edited, description } });
      assert.deepEqual([answer.status, answer.body], [400, { error: FIELD }], `length ${description.length}`);
    }
    assert.equal((await detail(id)).edit_revision, 0);
    assert.equal((await edit(id, { values: { ...edited, description: 'a'.repeat(10000) } })).status, 200);
  });

  it('a missing, non-text or null field, or no values at all, is refused with the field message', async () => {
    const id = await newId();
    const { department: _gone, ...withoutDepartment } = edited;
    for (const values of [withoutDepartment, { ...edited, priority: 3 }, { ...edited, channel: null }, undefined, null, 'x']) {
      const answer = await edit(id, { values });
      assert.deepEqual([answer.status, answer.body], [400, { error: FIELD }], JSON.stringify(values)?.slice(0, 30));
    }
  });

  it('blank title or requester, an unreadable request time and non-calendar due dates (2026-02-30) get the required-fields message; an empty due date passes', async () => {
    const id = await newId();
    const refused: Array<Record<string, unknown>> = [{ title: '' }, { title: '   ' }, { requester: '  ' }, { requested_at: '어제' }, { requested_at: '' }, { due_date: '2026-02-30' }, { due_date: '2026/11/03' }];
    for (const over of refused) {
      const answer = await edit(id, { values: { ...edited, ...over } });
      assert.deepEqual([answer.status, answer.body], [400, { error: REQUIRED }], JSON.stringify(over));
    }
    const ok = await edit(id, { values: { ...edited, due_date: '', department: '' } });
    assert.deepEqual([ok.status, ok.body], [200, { ok: true, revision: 1 }]);
  });

  it('the reason is 1..1000 characters after trimming: empty, blank and 1001 get the reason message; 1 and 1000 are stored whole', async () => {
    const id = await newId();
    for (const reason of ['', '   ', 'a'.repeat(1001)]) {
      const answer = await edit(id, { reason });
      assert.deepEqual([answer.status, answer.body], [400, { error: REASON }], `length ${reason.length}`);
    }
    assert.deepEqual((await edit(id, { values: { ...edited, title: '하나' }, reason: 'a' })).body, { ok: true, revision: 1 });
    assert.deepEqual((await edit(id, { values: { ...edited, title: '최대' }, revision: 1, reason: 'b'.repeat(1000) })).body, { ok: true, revision: 2 });
    const rows = (await detail(id)).events.filter((e: any) => e.kind === '업무 정보 수정');
    assert.equal(JSON.parse(rows[rows.length - 1].detail).reason.length, 1000);
  });

  it('the revision must be a non-negative integer: -1, 1.5, "0" and null get the reason message, and so does leaving it out', async () => {
    const id = await newId();
    for (const revision of [-1, 1.5, '0', null]) {
      const answer = await edit(id, { revision });
      assert.deepEqual([answer.status, answer.body], [400, { error: REASON }], JSON.stringify(revision));
    }
    const missing = await send('POST', `/api/tasks/${id}/edit`, { values: edited, reason: 'x' });
    assert.deepEqual([missing.status, missing.body], [400, { error: REASON }]);
    assert.equal((await edit(id, { revision: 0 })).status, 200);
  });

  it('an edit made on a stale revision is a 409 and changes nothing', async () => {
    const id = await newId();
    assert.equal((await edit(id, { revision: 0 })).status, 200);
    const stale = await edit(id, { values: { ...edited, title: '낡은 화면' }, revision: 0 });
    assert.deepEqual([stale.status, stale.body], [409, { error: '다른 화면에서 업무가 수정됐습니다. 상세를 다시 열어 확인하세요.' }]);
    assert.equal((await detail(id)).title, '수정된 업무');
    const ahead = await edit(id, { revision: 5 });
    assert.equal(ahead.status, 409);
  });

  it('a viewer cannot edit: 403 and nothing is written; an unknown id is 404; a text that is no id is 400', async () => {
    const id = await newId();
    const viewer = await edit(id, {}, 'viewer');
    assert.deepEqual([viewer.status, viewer.body], [403, { error: VIEWER_WRITE }]);
    assert.equal((await detail(id)).title, '노트북 준비');
    const ghost = await edit(ABSENT);
    assert.deepEqual([ghost.status, ghost.body], [404, { error: NOT_FOUND }]);
    const notId = await edit('not-a-uuid');
    assert.equal(notId.status, 400);
  });

  it('a request in the trash cannot be edited until it is restored', async () => {
    const id = await newId();
    await lifecycle(id, 'delete');
    const refused = await edit(id);
    assert.deepEqual([refused.status, refused.body], [409, { error: '휴지통의 업무는 복원 후 수정하세요.' }]);
    await lifecycle(id, 'restore');
    assert.equal((await edit(id)).status, 200);
  });
});

describe('deleting and restoring a request', () => {
  it('a deleted request leaves the list, shows in the trash and the administrator can still open it, without the KPI part', async () => {
    const id = await newId({ title: '삭제할 업무' });
    const answer = await lifecycle(id, 'delete', { reason: '중복 등록' });
    assert.deepEqual([answer.status, answer.body], [200, { ok: true }]);
    assert.equal(((await send('GET', '/api/tasks')).body as any[]).some((task) => task.id === id), false);
    const trash = (await send('GET', '/api/trash')).body as any[];
    assert.ok(trash.some((task) => task.id === id && task.deleted_at));
    const opened = await detail(id);
    assert.equal(opened.id, id);
    assert.ok(opened.deleted_at);
    assert.equal('kpi' in opened, false);
    assert.ok(opened.events.some((e: any) => e.kind === '업무 삭제' && e.detail === '중복 등록'));
  });

  it('the viewer gets 404 for the deleted request while the administrator gets it', async () => {
    const id = await newId();
    await lifecycle(id, 'delete');
    const viewer = await send('GET', `/api/tasks/${id}`, undefined, 'viewer');
    assert.deepEqual([viewer.status, viewer.body], [404, { error: NOT_FOUND }]);
    assert.equal((await send('GET', `/api/tasks/${id}`)).status, 200);
  });

  it('deleting twice is a 409, restoring a request that is not in the trash is a 409, and status and notes on a deleted request are 404', async () => {
    const id = await newId();
    assert.equal((await lifecycle(id, 'restore')).status, 409);
    assert.equal((await lifecycle(id, 'delete')).status, 200);
    const twice = await lifecycle(id, 'delete');
    assert.deepEqual([twice.status, twice.body], [409, { error: '이미 휴지통에 있는 업무입니다.' }]);
    assert.equal((await send('POST', `/api/tasks/${id}/status`, { status: '완료' })).status, 404);
    assert.equal((await send('POST', `/api/tasks/${id}/notes`, { note: 'x' })).status, 404);
    const restored = await lifecycle(id, 'restore', { reason: '복구' });
    assert.deepEqual([restored.status, restored.body], [200, { ok: true }]);
    const again = await lifecycle(id, 'restore');
    assert.deepEqual([again.status, again.body], [409, { error: '휴지통의 업무만 복원·영구 삭제할 수 있습니다.' }]);
    assert.ok(((await send('GET', '/api/tasks')).body as any[]).some((task) => task.id === id), 'back in the list');
  });

  it('the reason is 1..1000 characters after trimming: empty, blank, missing and 1001 get the lifecycle reason message, 1 and 1000 pass', async () => {
    const id = await newId();
    for (const action of ['delete', 'restore', 'purge']) {
      for (const reason of ['', '   ', 'a'.repeat(1001), undefined]) {
        const answer = await send('POST', `/api/tasks/${id}/${action}`, reason === undefined ? {} : { reason });
        assert.deepEqual([answer.status, answer.body], [400, { error: '사유를 1~1000자로 입력하세요.' }], `${action} ${reason?.length}`);
      }
    }
    assert.equal((await lifecycle(id, 'delete', { reason: 'a' })).status, 200);
    assert.equal((await lifecycle(id, 'restore', { reason: 'b'.repeat(1000) })).status, 200);
  });

  it('delete and restore of an unknown id are 404 and of a text that is no id are 400; a viewer gets 403 and nothing changes', async () => {
    assert.equal((await lifecycle(ABSENT, 'delete')).status, 404);
    assert.equal((await lifecycle('not-a-uuid', 'delete')).status, 400);
    const id = await newId();
    const viewer = await lifecycle(id, 'delete', {}, 'viewer');
    assert.deepEqual([viewer.status, viewer.body], [403, { error: VIEWER_WRITE }]);
    assert.equal(((await send('GET', '/api/tasks')).body as any[]).some((task) => task.id === id), true);
  });
});

describe('purging a request', () => {
  it('purging a request that was never deleted is a 409 and it stays', async () => {
    const id = await newId();
    const answer = await lifecycle(id, 'purge', { confirmation: input.title });
    assert.deepEqual([answer.status, answer.body], [409, { error: '휴지통의 업무만 복원·영구 삭제할 수 있습니다.' }]);
    assert.equal((await send('GET', `/api/tasks/${id}`)).status, 200);
  });

  it('a wrong, empty, padded or missing confirmation is a 400 and the request stays in the trash; the exact title purges it for good', async () => {
    const id = await newId({ title: '영구 삭제 대상' });
    await lifecycle(id, 'delete');
    for (const confirmation of ['다른 제목', '', ' 영구 삭제 대상', '영구 삭제 대상 ', undefined]) {
      const answer = await lifecycle(id, 'purge', confirmation === undefined ? {} : { confirmation });
      assert.deepEqual([answer.status, answer.body], [400, { error: '업무 제목을 정확히 입력하세요.' }], JSON.stringify(confirmation));
    }
    assert.equal((await send('GET', `/api/tasks/${id}`)).status, 200, 'still there');
    const done = await lifecycle(id, 'purge', { reason: '정리', confirmation: '영구 삭제 대상' });
    assert.deepEqual([done.status, done.body], [200, { ok: true }]);
    assert.deepEqual([(await send('GET', `/api/tasks/${id}`)).status], [404]);
    assert.equal(((await send('GET', '/api/trash')).body as any[]).some((task) => task.id === id), false);
    assert.equal((await lifecycle(id, 'purge', { confirmation: '영구 삭제 대상' })).status, 404, 'a second purge finds nothing');
  });

  it('a viewer cannot purge: 403', async () => {
    const id = await newId();
    await lifecycle(id, 'delete');
    const answer = await lifecycle(id, 'purge', { confirmation: input.title }, 'viewer');
    assert.deepEqual([answer.status, answer.body], [403, { error: VIEWER_WRITE }]);
    assert.equal((await send('GET', `/api/tasks/${id}`)).status, 200);
  });
});

describe('the trash and the deletion history', () => {
  it('the trash lists the newest deletion first and the history lists the newest event first without copying the title', async () => {
    const first = await newId({ title: '먼저 삭제' });
    const second = await newId({ title: '나중 삭제' });
    await lifecycle(first, 'delete', { reason: '첫째' });
    await lifecycle(second, 'delete', { reason: '둘째' });
    const trash = (await send('GET', '/api/trash')).body as any[];
    const ids = trash.map((task) => task.id);
    assert.ok(ids.indexOf(second) < ids.indexOf(first), 'newest deletion first');
    const history = (await send('GET', '/api/lifecycle-history')).body as any[];
    const mine = history.filter((row) => row.task_id === first || row.task_id === second);
    assert.deepEqual(mine.map((row) => [row.task_id, row.action, row.reason]), [[second, 'delete', '둘째'], [first, 'delete', '첫째']]);
    assert.equal(JSON.stringify(history).includes('먼저 삭제'), false, 'the title is not copied');
  });

  it('a viewer gets 403 with the legacy message for both lists, and a POST to them is not a route', async () => {
    for (const path of ['/api/trash', '/api/lifecycle-history']) {
      const answer = await send('GET', path, undefined, 'viewer');
      assert.deepEqual([answer.status, answer.body], [403, { error: VIEWER_TRASH }], path);
    }
    assert.equal((await send('POST', '/api/trash', {})).status, 404);
  });
});
