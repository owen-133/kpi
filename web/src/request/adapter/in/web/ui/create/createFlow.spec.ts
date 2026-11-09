import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FakeRequestApi } from '../testing/fakeRequestApi.ts';
import { NEW_TASK_TOAST, newTaskBody, submitNewTask, type CreateActions } from './createFlow.ts';

const filled = (over: Record<string, string> = {}): FormData => {
  const form = new FormData();
  const values: Record<string, string> = {
    title: '프로젝터 램프 교체', requester: '오지후', department: '개발팀', channel: '이메일', category: '시설·환경',
    requested_at: '2026-11-09', due_date: '2026-11-20', priority: '상', description: '회의실 프로젝터 램프', ...over,
  };
  for (const [key, value] of Object.entries(values)) form.append(key, value);
  return form;
};

function setup() {
  const api = new FakeRequestApi();
  api.nextId = 'task-77';
  const busy: boolean[] = [];
  const actions: CreateActions = {
    toast: (message) => api.log.record('toast', [message]),
    refresh: async () => api.log.record('refresh', []),
    close: (dialog) => api.log.record('close', [dialog]),
    openDetail: async (id) => api.log.record('openDetail', [id]),
  };
  return { api, actions, busy, deps: { api, actions, setBusy: (on: boolean) => busy.push(on) } };
}

test('the request date becomes KST midnight as a UTC timestamp and every other field is sent as typed', () => {
  assert.deepEqual(newTaskBody(filled()), {
    title: '프로젝터 램프 교체', requester: '오지후', department: '개발팀', channel: '이메일', category: '시설·환경',
    requested_at: '2026-11-08T15:00:00.000Z', due_date: '2026-11-20', priority: '상', description: '회의실 프로젝터 램프',
  });
});

test('empty optional fields are sent as empty text, not dropped', () => {
  const body = newTaskBody(filled({ department: '', due_date: '', description: '' }));
  assert.deepEqual([body.department, body.due_date, body.description], ['', '', '']);
});

test('a request date that is not a real day throws the legacy message before anything is sent', () => {
  assert.throws(() => newTaskBody(filled({ requested_at: '2026-02-31' })), { message: '요청일을 확인하세요.' });
});

test('registering posts, closes, refreshes, opens the new task and only then toasts', async () => {
  const s = setup();
  assert.equal(await submitNewTask(filled(), s.deps), 'created');
  assert.deepEqual(s.api.log.names(), ['createTask', 'close', 'refresh', 'openDetail', 'toast']);
  assert.deepEqual(s.api.log.argsOf('close'), [['create']]);
  assert.deepEqual(s.api.log.argsOf('openDetail'), [['task-77']]);
  assert.deepEqual(s.api.log.argsOf('toast'), [[NEW_TASK_TOAST]]);
  assert.equal(NEW_TASK_TOAST, '새 업무가 등록되었습니다.');
  assert.deepEqual(s.busy, [true, false]);
});

test('a bad request date toasts, sends nothing and frees the button', async () => {
  const s = setup();
  assert.equal(await submitNewTask(filled({ requested_at: '' }), s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['요청일을 확인하세요.']]);
  assert.deepEqual(s.busy, [true, false]);
});

test('a refused post toasts the server message and neither closes, refreshes nor opens a detail', async () => {
  const s = setup();
  s.api.log.failNext('createTask', '요청자를 입력하세요.');
  assert.equal(await submitNewTask(filled(), s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['createTask', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['요청자를 입력하세요.']]);
  assert.deepEqual(s.busy, [true, false]);
});

test('a failed refresh toasts its message, skips the detail and the success toast (the dialog is already closed)', async () => {
  const s = setup();
  s.api.log.failNext('refresh', '목록을 읽지 못했습니다.');
  assert.equal(await submitNewTask(filled(), s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['createTask', 'close', 'refresh', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['목록을 읽지 못했습니다.']]);
});

test('a failed detail read toasts its message instead of the success toast', async () => {
  const s = setup();
  s.api.log.failNext('openDetail', '업무를 찾을 수 없습니다.');
  assert.equal(await submitNewTask(filled(), s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['createTask', 'close', 'refresh', 'openDetail', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무를 찾을 수 없습니다.']]);
});
