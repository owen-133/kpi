import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TaskSummary } from '../RequestApi.ts';
import { FakeRequestApi } from '../testing/fakeRequestApi.ts';
import { recordingTrashActions, scriptedPrompt } from './testing/recordingTrashActions.ts';
import { loadTrash, openDeletedTask, runTrashAction, showDeletionHistory, type TrashDeps } from './trashFlow.ts';

const task = (over: Partial<TaskSummary> = {}): TaskSummary => ({
  id: 'abcdef12-0000', title: '중복 등록 업무', requester: '강서준', department: '총무팀', channel: '메신저', category: '총무', priority: '중',
  requested_at: '2026-11-04T00:00:00.000Z', due_date: '', description: '', status: '접수', created_at: '2026-11-04T00:00:00.000Z',
  updated_at: '2026-11-04T00:00:00.000Z', completed_at: null, deleted_at: '2026-11-05T01:00:00.000Z', ...over,
});

function setup(answers: Array<string | null> = []) {
  const api = new FakeRequestApi();
  api.trash = [task()];
  const actions = recordingTrashActions(api.log);
  const script = scriptedPrompt(answers);
  const busy: boolean[] = [];
  const shown: TaskSummary[][] = [];
  const deps: TrashDeps = {
    api,
    reads: { trash: () => api.listTrash(), history: () => api.lifecycleHistory() },
    actions,
    prompt: script.prompt,
    setBusy: (on) => busy.push(on),
    show: (list) => shown.push(list),
  };
  return { api, actions, script, busy, shown, deps };
}

test('restoring asks for a reason, restores, refreshes, reloads the trash and only then toasts', async () => {
  const s = setup(['정정 요청']);
  const outcome = await runTrashAction('restore', task(), s.deps);
  assert.equal(outcome, 'done');
  assert.deepEqual(s.script.asked, [{ message: '복원 사유를 입력하세요.', defaultValue: '업무 복원' }]);
  assert.deepEqual(s.api.log.argsOf('restoreTask'), [['abcdef12-0000', '정정 요청']]);
  assert.deepEqual(s.api.log.names(), ['restoreTask', 'refresh', 'listTrash', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무를 복원했습니다.']]);
  assert.deepEqual(s.busy, [true]);
  assert.equal(s.shown.length, 1);
});

test('a cancelled restore reason calls nothing and leaves the row enabled', async () => {
  const s = setup([null]);
  assert.equal(await runTrashAction('restore', task(), s.deps), 'cancelled');
  assert.deepEqual(s.api.log.names(), []);
  assert.deepEqual(s.busy, []);
  assert.equal(s.shown.length, 0);
});

test('an empty restore reason is still sent (the server decides)', async () => {
  const s = setup(['']);
  await runTrashAction('restore', task(), s.deps);
  assert.deepEqual(s.api.log.argsOf('restoreTask'), [['abcdef12-0000', '']]);
});

test('purging asks for the exact title first, then the reason, and sends both', async () => {
  const s = setup(['중복 등록 업무', '정리']);
  assert.equal(await runTrashAction('purge', task(), s.deps), 'done');
  assert.deepEqual(s.script.asked, [
    { message: '영구 삭제하면 복구할 수 없습니다. 확인하려면 아래 업무 제목을 정확히 입력하세요.\n중복 등록 업무', defaultValue: undefined },
    { message: '영구 삭제 사유를 입력하세요.', defaultValue: '테스트 데이터 영구 삭제' },
  ]);
  assert.deepEqual(s.api.log.argsOf('purgeTask'), [['abcdef12-0000', '정리', '중복 등록 업무']]);
  assert.deepEqual(s.api.log.names(), ['purgeTask', 'refresh', 'listTrash', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무와 처리 이력을 영구 삭제했습니다.']]);
});

test('a title that differs by one character is refused with a toast and nothing is called', async () => {
  for (const typed of ['중복 등록 업무 ', '중복 등록 업', '', '중복  등록 업무']) {
    const s = setup([typed]);
    assert.equal(await runTrashAction('purge', task(), s.deps), 'mismatch', JSON.stringify(typed));
    assert.deepEqual(s.api.log.names(), ['toast']);
    assert.deepEqual(s.api.log.argsOf('toast'), [['업무 제목이 일치하지 않습니다.']]);
    assert.equal(s.script.asked.length, 1, 'the reason is not asked after a mismatch');
    assert.deepEqual(s.busy, []);
  }
});

test('a cancelled title prompt is silent: no toast, no call', async () => {
  const s = setup([null]);
  assert.equal(await runTrashAction('purge', task(), s.deps), 'cancelled');
  assert.deepEqual(s.api.log.names(), []);
});

test('a cancelled purge reason after the right title calls nothing', async () => {
  const s = setup(['중복 등록 업무', null]);
  assert.equal(await runTrashAction('purge', task(), s.deps), 'cancelled');
  assert.deepEqual(s.api.log.names(), []);
  assert.equal(s.script.asked.length, 2);
});

test('a server refusal toasts its message and re-enables the row without refreshing', async () => {
  const s = setup(['사유']);
  s.api.log.failNext('restoreTask', '업무를 찾을 수 없습니다.');
  assert.equal(await runTrashAction('restore', task(), s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['restoreTask', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무를 찾을 수 없습니다.']]);
  assert.deepEqual(s.busy, [true, false]);
  assert.equal(s.shown.length, 0);
});

test('a failing refresh after the purge also toasts and re-enables, without reloading or the success toast', async () => {
  const s = setup(['중복 등록 업무', '사유']);
  const failing = recordingTrashActions(s.api.log, { refresh: async () => { throw new Error('목록 실패'); } });
  assert.equal(await runTrashAction('purge', task(), { ...s.deps, actions: failing }), 'failed');
  assert.deepEqual(s.api.log.names(), ['purgeTask', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['목록 실패']]);
  assert.deepEqual(s.busy, [true, false]);
});

test('a failing reload of the trash toasts the error and not the success text', async () => {
  const s = setup(['사유']);
  s.api.log.failNext('listTrash', '휴지통 실패');
  assert.equal(await runTrashAction('restore', task(), s.deps), 'failed');
  assert.deepEqual(s.api.log.argsOf('toast'), [['휴지통 실패']]);
});

test('opening the trash lists the deleted tasks and does not toast or close', async () => {
  const s = setup();
  const list = await loadTrash(s.deps.reads, s.actions);
  assert.deepEqual(list?.map((t) => t.id), ['abcdef12-0000']);
  assert.deepEqual(s.api.log.names(), ['listTrash']);
});

test('a failed read of the trash toasts the message and closes the dialog that never showed anything', async () => {
  const s = setup();
  s.api.log.failNext('listTrash', '로그인이 필요합니다.');
  assert.equal(await loadTrash(s.deps.reads, s.actions), null);
  assert.deepEqual(s.api.log.names(), ['listTrash', 'toast', 'close']);
  assert.deepEqual(s.api.log.argsOf('close'), [['trash']]);
});

test('the deletion history is read on demand and a failure toasts without closing', async () => {
  const s = setup();
  s.api.history = [{ at: '2026-11-05T01:00:00.000Z', actor: 'admin', action: 'delete', task_id: 'abcdef12-0000', reason: '중복 등록' }];
  assert.equal((await showDeletionHistory(s.deps.reads, s.actions))?.length, 1);
  s.api.log.failNext('lifecycleHistory', '이력 실패');
  assert.equal(await showDeletionHistory(s.deps.reads, s.actions), null);
  assert.deepEqual(s.api.log.names(), ['lifecycleHistory', 'lifecycleHistory', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['이력 실패']]);
});

test('clicking a trash row opens that task detail; a failure becomes a toast', async () => {
  const s = setup();
  await openDeletedTask(s.actions, 'abcdef12-0000');
  assert.deepEqual(s.api.log.names(), ['openDetail']);
  const failing = recordingTrashActions(s.api.log, { openDetail: async () => { throw new Error('업무를 찾을 수 없습니다.'); } });
  await openDeletedTask(failing, 'x');
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무를 찾을 수 없습니다.']]);
});
