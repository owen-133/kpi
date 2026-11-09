import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FakeAssignmentApi } from './testing/fakeAssignmentApi.ts';
import { assignTo, TEST_TO_REAL_CONFIRM, REAL_TO_TEST_CONFIRM, toggleTestData, type AssignmentDeps } from './assignmentFlow.ts';

function setup(confirmAnswers: boolean[] = []) {
  const api = new FakeAssignmentApi();
  const asked: string[] = [];
  const busy: boolean[] = [];
  const queue = [...confirmAnswers];
  const deps: AssignmentDeps = {
    api,
    toast: (message) => api.log.record('toast', [message]),
    reload: async () => api.log.record('reload', []),
    confirm: (message) => {
      asked.push(message);
      if (queue.length === 0) throw new Error('unexpected confirm: ' + message);
      return queue.shift() as boolean;
    },
    setBusy: (on) => busy.push(on),
  };
  return { api, asked, busy, deps };
}

test('flagging a real task as test data asks first, then saves, reloads the detail and only then toasts', async () => {
  const s = setup([true]);
  assert.equal(await toggleTestData('t1', false, s.deps), 'done');
  assert.deepEqual(s.asked, [REAL_TO_TEST_CONFIRM]);
  assert.equal(REAL_TO_TEST_CONFIRM, '테스트 업무로 변경해 지표에서 제외할까요?');
  assert.deepEqual(s.api.log.argsOf('markTestData'), [['t1', true]]);
  assert.deepEqual(s.api.log.names(), ['markTestData', 'reload', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['데이터 구분을 변경했습니다.']]);
});

test('turning test data back into a real task sends false after the other question', async () => {
  const s = setup([true]);
  await toggleTestData('t1', true, s.deps);
  assert.deepEqual(s.asked, [TEST_TO_REAL_CONFIRM]);
  assert.equal(TEST_TO_REAL_CONFIRM, '실제 업무로 변경해 지표에 포함할까요?');
  assert.deepEqual(s.api.log.argsOf('markTestData'), [['t1', false]]);
});

test('a declined confirmation calls nothing: no save, no reload, no toast', async () => {
  const s = setup([false]);
  assert.equal(await toggleTestData('t1', false, s.deps), 'cancelled');
  assert.deepEqual(s.api.log.names(), []);
});

test('a failed save toasts the server message and does not reload', async () => {
  const s = setup([true]);
  s.api.log.failNext('markTestData', '권한이 없습니다.');
  assert.equal(await toggleTestData('t1', false, s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['markTestData', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['권한이 없습니다.']]);
});

test('assigning sends the typed name untouched, reloads, toasts, and leaves the button disabled for the redraw', async () => {
  const s = setup();
  assert.equal(await assignTo('t1', ' 박지원 ', s.deps), 'done');
  assert.deepEqual(s.api.log.argsOf('assign'), [['t1', ' 박지원 ']]);
  assert.deepEqual(s.api.log.names(), ['assign', 'reload', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['담당자를 배정했습니다.']]);
  assert.deepEqual(s.busy, [true]);
});

test('a failed assignment toasts the message, does not reload and enables the button again', async () => {
  const s = setup();
  s.api.log.failNext('assign', '담당자 이름이 너무 깁니다.');
  assert.equal(await assignTo('t1', 'x', s.deps), 'failed');
  assert.deepEqual(s.api.log.names(), ['assign', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['담당자 이름이 너무 깁니다.']]);
  assert.deepEqual(s.busy, [true, false]);
});

test('a failed reload after a good assignment is toasted like any other failure', async () => {
  const s = setup();
  const deps: AssignmentDeps = {
    ...s.deps,
    reload: async () => {
      throw new Error('업무를 찾을 수 없습니다.');
    },
  };
  assert.equal(await assignTo('t1', 'x', deps), 'failed');
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무를 찾을 수 없습니다.']]);
  assert.deepEqual(s.busy, [true, false]);
});
