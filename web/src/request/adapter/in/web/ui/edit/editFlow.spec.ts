import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TaskDetailView } from '../RequestApi.ts';
import { FakeRequestApi } from '../testing/fakeRequestApi.ts';
import { recordingEditActions } from './testing/recordingEditActions.ts';
import { editFormModel, loadEditTask, saveEdit, selectOptions, type EditDeps } from './editFlow.ts';

const task = (over: Partial<TaskDetailView> = {}): TaskDetailView => ({
  id: 't-1', title: '신규 입사자 노트북 준비', requester: '홍길동', department: '인사팀', channel: '메신저', category: '비품·자산', priority: '높음',
  requested_at: '2026-11-03T05:30:12.345Z', due_date: '2026-11-05', description: '노트북 1대 준비', status: '접수',
  created_at: '2026-11-03T05:30:12.345Z', updated_at: '2026-11-03T05:30:12.345Z', completed_at: null, events: [], ...over,
});

const form = (over: Record<string, string> = {}): Record<string, string> => ({
  title: '신규 입사자 노트북 2대 준비', requester: '홍길동', department: '인사팀', channel: '메신저', category: '비품·자산', priority: '높음',
  requested_at: '2026-11-03', due_date: '2026-11-05', description: '노트북 1대 준비', reason: '수량 정정', ...over,
});

function setup() {
  const api = new FakeRequestApi();
  const actions = recordingEditActions(api.log);
  const busy: boolean[] = [];
  const errors: string[] = [];
  const deps: EditDeps = { api, actions, setBusy: (on) => busy.push(on), showError: (m) => errors.push(m) };
  return { api, busy, errors, deps };
}

test('a saved edit sends the changes, then closes, refreshes, reopens the detail and only then toasts', async () => {
  const s = setup();
  assert.equal(await saveEdit(task(), form(), s.deps), 'saved');
  assert.deepEqual(s.api.log.names(), ['editTask', 'close', 'refresh', 'openDetail', 'toast']);
  assert.deepEqual(s.api.log.argsOf('close'), [['edit']]);
  assert.deepEqual(s.api.log.argsOf('openDetail'), [['t-1']]);
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무 정보를 수정했습니다.']]);
  assert.deepEqual(s.busy, [true, false]);
  assert.deepEqual(s.errors, []);
});

test('the body keeps the reason out of the values and sends the stored revision', async () => {
  const s = setup();
  await saveEdit(task({ edit_revision: 3 }), form(), s.deps);
  const [id, body] = s.api.log.argsOf('editTask')[0] as [string, { values: Record<string, string>; reason: string; revision: number }];
  assert.equal(id, 't-1');
  assert.equal(body.reason, '수량 정정');
  assert.equal(body.revision, 3);
  assert.ok(!('reason' in body.values));
  assert.deepEqual(Object.keys(body.values), ['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description']);
  assert.equal(body.values.title, '신규 입사자 노트북 2대 준비');
});

test('a task without a revision is edited at revision 0', async () => {
  const s = setup();
  await saveEdit(task(), form(), s.deps);
  assert.equal((s.api.log.argsOf('editTask')[0][1] as { revision: number }).revision, 0);
});

test('the same request day keeps the stored instant, another day becomes KST midnight', async () => {
  const same = setup();
  await saveEdit(task(), form({ requested_at: '2026-11-03' }), same.deps);
  assert.equal((same.api.log.argsOf('editTask')[0][1] as { values: { requested_at: string } }).values.requested_at, '2026-11-03T05:30:12.345Z');
  const moved = setup();
  await saveEdit(task(), form({ requested_at: '2026-11-04' }), moved.deps);
  assert.equal((moved.api.log.argsOf('editTask')[0][1] as { values: { requested_at: string } }).values.requested_at, '2026-11-03T15:00:00.000Z');
});

test('an answer of unchanged toasts the no-change text after the same close, refresh and reopen', async () => {
  const s = setup();
  s.api.editResult = { ok: true, unchanged: true };
  assert.equal(await saveEdit(task(), form(), s.deps), 'unchanged');
  assert.deepEqual(s.api.log.names(), ['editTask', 'close', 'refresh', 'openDetail', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['변경된 항목이 없습니다.']]);
});

test('a bad request date toasts the legacy text and calls nothing else', async () => {
  for (const day of ['', '2026-02-31', '2026-13-01', '11/03/2026', 'abc']) {
    const s = setup();
    assert.equal(await saveEdit(task(), form({ requested_at: day }), s.deps), 'bad-date', JSON.stringify(day));
    assert.deepEqual(s.api.log.names(), ['toast']);
    assert.deepEqual(s.api.log.argsOf('toast'), [['요청일을 확인하세요.']]);
    assert.deepEqual(s.busy, [], 'the save button is never disabled');
    assert.deepEqual(s.errors, []);
  }
});

test('a conflict answer is shown in the dialog error line; nothing closes, refreshes or toasts', async () => {
  const s = setup();
  s.api.log.failNext('editTask', '다른 화면에서 업무가 수정됐습니다. 상세를 다시 열어 확인하세요.');
  assert.equal(await saveEdit(task(), form(), s.deps), 'failed');
  assert.deepEqual(s.errors, ['다른 화면에서 업무가 수정됐습니다. 상세를 다시 열어 확인하세요.']);
  assert.deepEqual(s.api.log.names(), ['editTask']);
  assert.deepEqual(s.busy, [true, false]);
});

test('a failure after the save (refresh or reopening the detail) lands in the error line and gives no success toast', async () => {
  for (const step of ['refresh', 'openDetail'] as const) {
    const s = setup();
    s.api.log.failNext(step, step + ' failed');
    assert.equal(await saveEdit(task(), form(), s.deps), 'failed', step);
    assert.deepEqual(s.errors, [step + ' failed']);
    assert.ok(!s.api.log.names().includes('toast'), step);
    assert.deepEqual(s.busy, [true, false]);
  }
});

test('the failure of a first save does not stop a second attempt from saving', async () => {
  const s = setup();
  s.api.log.failNext('editTask', 'temporary');
  await saveEdit(task(), form(), s.deps);
  assert.equal(await saveEdit(task(), form(), s.deps), 'saved');
  assert.equal(s.api.log.argsOf('editTask').length, 2);
});

test('select options keep the stored value first, once, and show an empty one as 미지정', () => {
  assert.deepEqual(selectOptions('높음', ['중', '상', '하']), [
    { value: '높음', label: '높음' }, { value: '중', label: '중' }, { value: '상', label: '상' }, { value: '하', label: '하' },
  ]);
  assert.deepEqual(selectOptions('중', ['중', '상']).map((o) => o.value), ['중', '상']);
  assert.deepEqual(selectOptions('', ['중']), [{ value: '', label: '미지정' }, { value: '중', label: '중' }]);
  assert.deepEqual(selectOptions(undefined, ['중']), [{ value: '중', label: '중' }]);
  assert.deepEqual(selectOptions(null, ['중']), [{ value: '중', label: '중' }]);
});

test('the form model reads the request day in KST and lists the fixed category once', () => {
  const m = editFormModel(task({ requested_at: '2026-11-03T16:00:00.000Z' }), { channels: ['메신저'], categories: ['일반 총무', '고정업무'], priorities: ['중'] });
  assert.equal(m.requestedDay, '2026-11-04');
  assert.deepEqual(m.categories.map((o) => o.value), ['비품·자산', '일반 총무', '고정업무']);
  assert.equal(editFormModel(task({ requested_at: 'garbage' }), { channels: [], categories: [], priorities: [] }).requestedDay, '');
  assert.deepEqual(editFormModel(task(), { channels: [], categories: [], priorities: [] }).categories.map((o) => o.value), ['비품·자산', '고정업무']);
});

test('opening reads the task when it is not held; a failed read toasts and closes the dialog', async () => {
  const api = new FakeRequestApi();
  api.details.set('t-1', task());
  const actions = recordingEditActions(api.log);
  assert.equal((await loadEditTask(() => api.getTask('t-1'), actions))?.id, 't-1');
  assert.deepEqual(api.log.names(), ['getTask']);
  assert.equal(await loadEditTask(() => api.getTask('missing'), actions), null);
  assert.deepEqual(api.log.names(), ['getTask', 'getTask', 'toast', 'close']);
  assert.deepEqual(api.log.argsOf('toast'), [['업무를 찾을 수 없습니다.']]);
  assert.deepEqual(api.log.argsOf('close'), [['edit']]);
});
