import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InvalidImprovementError, validateImprovement } from '../../../../domain/ImprovementValue.ts';
import type { ImprovementHistoryEvent, ImprovementItem } from './ImprovementApi.ts';
import { loadImprovementHistory, saveImprovement, type ImprovementActions } from './improvementFlow.ts';
import { FakeImprovementApi } from './testing/fakeImprovementApi.ts';

class RecordingActions implements ImprovementActions {
  readonly calls: string[] = [];
  toast(message: string): void {
    this.calls.push('toast:' + message);
  }
  close(dialog: 'improvement'): void {
    this.calls.push('close:' + dialog);
  }
  render(): void {
    this.calls.push('render');
  }
}

const saved: ImprovementItem = {
  id: 'i1',
  title: '제목',
  stage: 'MVP 구축',
  source: '',
  feedback: 'f',
  action: '',
  result: '',
  status: '접수',
  revision: 4,
  created_at: '2026-11-09T03:00:00.000Z',
  updated_at: '2026-11-09T03:00:00.000Z',
};
const value = { title: '제목', source: '', stage: '본인 실사용', status: '접수', feedback: 'f', action: '', result: '' };

// Given a new record / When it is saved / Then the server gets no id or revision, the dialog closes, the toast shows, the list is read again
test('saving a new record sends only the value, then closes, toasts and re-renders in the legacy order', async () => {
  const api = new FakeImprovementApi();
  const actions = new RecordingActions();
  const ok = await saveImprovement(api, actions, undefined, value);
  assert.equal(ok, true);
  assert.deepEqual(api.log.argsOf('save'), [[{ value }]]);
  assert.equal(Object.hasOwn(api.log.argsOf('save')[0][0] as object, 'id'), false);
  assert.equal(Object.hasOwn(api.log.argsOf('save')[0][0] as object, 'revision'), false);
  assert.deepEqual(actions.calls, ['close:improvement', 'toast:개선 기록을 저장했습니다.', 'render']);
});

test('saving an existing record sends its id and the revision that was read', async () => {
  const api = new FakeImprovementApi();
  const actions = new RecordingActions();
  await saveImprovement(api, actions, saved, value);
  assert.deepEqual(api.log.argsOf('save'), [[{ id: 'i1', revision: 4, value }]]);
});

const message = (input: unknown): string => {
  try {
    validateImprovement(input);
  } catch (e) {
    if (e instanceof InvalidImprovementError) return e.message;
  }
  throw new Error('expected the domain to refuse');
};
const long = 'x'.repeat(5001);
const declared: Array<[string, string]> = [
  ['a field over 5000 characters', message({ ...value, feedback: long })],
  ['no title or feedback', message({ ...value, title: '' })],
  ['a stage or status outside the lists', message({ ...value, stage: '없음' })],
  ['검증 완료 without a result', message({ ...value, status: '검증 완료' })],
  ['a missing or zero revision', '개선 항목 버전을 확인하세요.'],
  ['an unknown record', '개선 항목을 찾을 수 없습니다.'],
  ['another screen saved first', '다른 화면에서 수정됐습니다. 다시 불러오세요.'],
];
for (const [what, text] of declared) {
  test(`when the server refuses with ${what}, the toast shows its message and the dialog stays open and is not re-rendered`, async () => {
    const api = new FakeImprovementApi();
    api.log.failNext('save', text);
    const actions = new RecordingActions();
    const ok = await saveImprovement(api, actions, saved, value);
    assert.equal(ok, false);
    assert.deepEqual(actions.calls, ['toast:' + text]);
    assert.equal(actions.calls.includes('close:improvement'), false);
    assert.equal(actions.calls.includes('render'), false);
  });
}

test('the declared messages are the five domain answers plus the two store answers', () => {
  assert.equal(declared.length, 7);
  assert.equal(new Set(declared.map(([, text]) => text)).size, 7);
});

test('a refusal on a new record sends the same body as the success would have', async () => {
  const api = new FakeImprovementApi();
  api.log.failNext('save', '검증 완료에는 검증 결과가 필요합니다.');
  await saveImprovement(api, new RecordingActions(), undefined, { ...value, status: '검증 완료' });
  assert.deepEqual(api.log.argsOf('save'), [[{ value: { ...value, status: '검증 완료' } }]]);
});

const events: ImprovementHistoryEvent[] = [{ at: '2026-11-09T03:00:00.000Z', actor: 'admin', before: {}, after: { title: 't' } }];

test('the history is read for the id of the record and returned without a toast', async () => {
  const read: string[] = [];
  const actions = new RecordingActions();
  const got = await loadImprovementHistory(async (id) => (read.push(id), events), actions, 'i1');
  assert.deepEqual(got, events);
  assert.deepEqual(read, ['i1']);
  assert.deepEqual(actions.calls, []);
});

test('when the history cannot be read the message is toasted and nothing is returned', async () => {
  const actions = new RecordingActions();
  const got = await loadImprovementHistory(async () => {
    throw new Error('개선 항목을 찾을 수 없습니다.');
  }, actions, 'i1');
  assert.equal(got, null);
  assert.deepEqual(actions.calls, ['toast:개선 항목을 찾을 수 없습니다.']);
});

test('the fake api reads the history of a record from its own events only', async () => {
  const api = new FakeImprovementApi();
  api.events.set('i1', events);
  const actions = new RecordingActions();
  assert.deepEqual(await loadImprovementHistory((id) => api.history(id), actions, 'i1'), events);
  assert.deepEqual(await loadImprovementHistory((id) => api.history(id), actions, 'i2'), []);
  assert.deepEqual(api.log.argsOf('history'), [['i1'], ['i2']]);
});
