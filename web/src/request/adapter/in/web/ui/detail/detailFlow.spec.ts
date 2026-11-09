import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FakeRequestApi } from '../testing/fakeRequestApi.ts';
import type { TaskDetailView } from '../RequestApi.ts';
import { recordingDetailActions } from './testing/recordingDetailActions.ts';
import { DELETE_DEFAULT_REASON, DELETE_PROMPT, deleteTask, editTask, readDetail, recordNote, recordStatus, type DetailDeps } from './detailFlow.ts';

const detail = { id: 't1', title: '신규 입사자 노트북 준비', events: [] } as unknown as TaskDetailView;

function setup(promptAnswers: Array<string | null> = []) {
  const api = new FakeRequestApi();
  api.details.set('t1', detail);
  const actions = recordingDetailActions(api.log);
  const asked: Array<{ message: string; defaultValue?: string }> = [];
  const busy: boolean[] = [];
  const queue = [...promptAnswers];
  const deps: DetailDeps = {
    api,
    actions,
    prompt: (message, defaultValue) => {
      asked.push({ message, defaultValue });
      if (queue.length === 0) throw new Error('unexpected prompt: ' + message);
      return queue.shift() as string | null;
    },
    setBusy: (on) => busy.push(on),
  };
  return { api, actions, asked, busy, deps };
}

test('a status change posts the form, closes the detail, refreshes the list and only then toasts', async () => {
  const s = setup();
  assert.equal(await recordStatus('t1', { status: '대기' }, s.deps), 'done');
  assert.deepEqual(s.api.log.argsOf('changeStatus'), [['t1', { status: '대기' }]]);
  assert.deepEqual(s.api.log.names(), ['changeStatus', 'close', 'refresh', 'toast']);
  assert.deepEqual(s.api.log.argsOf('close'), [['detail']]);
  assert.deepEqual(s.api.log.argsOf('toast'), [['상태 변경이 기록되었습니다.']]);
  assert.deepEqual(s.busy, [true, false]);
});

test('the reopen reason is sent along when the form has the field, even when empty', async () => {
  const s = setup();
  await recordStatus('t1', { status: '진행 중', reason: '' }, s.deps);
  assert.deepEqual(s.api.log.argsOf('changeStatus'), [['t1', { status: '진행 중', reason: '' }]]);
});

test('a refused status change toasts the message, keeps the detail open and does not refresh', async () => {
  const s = setup();
  s.api.log.failNext('changeStatus', '완료 업무를 다시 열려면 사유가 필요합니다.');
  assert.equal(await recordStatus('t1', { status: '진행 중', reason: '' }, s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['changeStatus', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['완료 업무를 다시 열려면 사유가 필요합니다.']]);
  assert.deepEqual(s.busy, [true, false]);
});

test('a note is posted, then the detail is read again, then the toast', async () => {
  const s = setup();
  assert.equal(await recordNote('t1', '장비 준비 완료', s.deps), 'done');
  assert.deepEqual(s.api.log.argsOf('addNote'), [['t1', '장비 준비 완료']]);
  assert.deepEqual(s.api.log.names(), ['addNote', 'openDetail', 'toast']);
  assert.deepEqual(s.api.log.argsOf('openDetail'), [['t1']]);
  assert.deepEqual(s.api.log.argsOf('toast'), [['처리 메모를 기록했습니다.']]);
  assert.equal(s.api.log.names().includes('close'), false);
});

test('a refused note toasts the message and does not read the detail again', async () => {
  const s = setup();
  s.api.log.failNext('addNote', '메모가 너무 깁니다.');
  assert.equal(await recordNote('t1', 'x', s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['addNote', 'toast']);
  assert.deepEqual(s.busy, [true, false]);
});

test('deleting asks for a reason with the legacy prompt and default, then deletes, closes, refreshes and toasts', async () => {
  const s = setup(['잘못 등록']);
  assert.equal(await deleteTask('t1', s.deps), 'done');
  assert.deepEqual(s.asked, [{ message: DELETE_PROMPT, defaultValue: DELETE_DEFAULT_REASON }]);
  assert.equal(DELETE_PROMPT, '업무를 휴지통으로 이동합니다. 삭제 사유를 입력하세요.');
  assert.equal(DELETE_DEFAULT_REASON, '테스트 업무 정리');
  assert.deepEqual(s.api.log.argsOf('deleteTask'), [['t1', '잘못 등록']]);
  assert.deepEqual(s.api.log.names(), ['deleteTask', 'close', 'refresh', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무를 휴지통으로 이동했습니다.']]);
});

test('a cancelled delete prompt calls nothing, but an empty reason is still sent', async () => {
  const cancelled = setup([null]);
  assert.equal(await deleteTask('t1', cancelled.deps), 'cancelled');
  assert.deepEqual(cancelled.api.log.names(), []);
  const empty = setup(['']);
  await deleteTask('t1', empty.deps);
  assert.deepEqual(empty.api.log.argsOf('deleteTask'), [['t1', '']]);
});

test('a refused delete toasts the message and neither closes nor refreshes', async () => {
  const s = setup(['x']);
  s.api.log.failNext('deleteTask', '이미 삭제된 업무입니다.');
  assert.equal(await deleteTask('t1', s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['deleteTask', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['이미 삭제된 업무입니다.']]);
});

test('the edit button opens the edit dialog for this task and calls no API', () => {
  const s = setup();
  editTask('t1', s.actions);
  assert.deepEqual(s.api.log.names(), ['open']);
  assert.deepEqual(s.api.log.argsOf('open'), [['edit', { taskId: 't1' }]]);
});

test('reading the detail returns it and calls neither toast nor close', async () => {
  const s = setup();
  assert.deepEqual(await readDetail(() => s.api.getTask('t1'), s.actions), detail);
  assert.deepEqual(s.api.log.names(), ['getTask']);
});

test('a failed read toasts and closes the dialog so nothing stays open', async () => {
  const s = setup();
  assert.equal(await readDetail(() => s.api.getTask('missing'), s.actions), null);
  assert.deepEqual(s.api.log.names(), ['getTask', 'toast', 'close']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무를 찾을 수 없습니다.']]);
  assert.deepEqual(s.api.log.argsOf('close'), [['detail']]);
});
