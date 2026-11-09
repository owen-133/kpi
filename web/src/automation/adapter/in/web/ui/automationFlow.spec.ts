import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APPLIED_TOAST, EMPTY_TEXT_TOAST, applySuggestion, findSuggestions } from './automationFlow.ts';
import { FakeAutomationApi } from './testing/fakeAutomationApi.ts';

function setup() {
  const api = new FakeAutomationApi();
  const busy: boolean[] = [];
  const deps = { api, toast: (message: string) => api.log.record('toast', [message]), setBusy: (on: boolean) => busy.push(on) };
  return { api, busy, deps };
}

test('an empty title and description toast once and call nothing', async () => {
  const s = setup();
  assert.equal(await findSuggestions({ title: '', description: '' }, s.deps), null);
  assert.deepEqual(s.api.log.names(), ['toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [[EMPTY_TEXT_TOAST]]);
  assert.equal(EMPTY_TEXT_TOAST, '업무 제목이나 요청 내용을 먼저 입력하세요.');
  assert.deepEqual(s.busy, []);
});

test('blanks only count as empty', async () => {
  const s = setup();
  assert.equal(await findSuggestions({ title: '  ', description: '\n' }, s.deps), null);
  assert.deepEqual(s.api.log.names(), ['toast']);
});

test('a title alone is enough and the text sent is title, one space, description, untrimmed', async () => {
  const s = setup();
  s.api.suggestion = { classification: { category: '비품·자산', method: '키워드 규칙', reason: '매칭' }, similar: [], method: '' };
  const found = await findSuggestions({ title: '노트북 준비', description: '' }, s.deps);
  assert.equal(found?.classification.category, '비품·자산');
  assert.deepEqual(s.api.log.argsOf('suggest'), [['노트북 준비 ']]);
  assert.deepEqual(s.api.log.names(), ['suggest']);
  assert.deepEqual(s.busy, [true, false]);
});

test('a description alone is enough', async () => {
  const s = setup();
  await findSuggestions({ title: '', description: '토너' }, s.deps);
  assert.deepEqual(s.api.log.argsOf('suggest'), [[' 토너']]);
});

test('a refused call toasts the message, returns nothing and frees the button', async () => {
  const s = setup();
  s.api.log.failNext('suggest', '로그인이 필요합니다.');
  assert.equal(await findSuggestions({ title: '토너', description: '' }, s.deps), null);
  assert.deepEqual(s.api.log.names(), ['suggest', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['로그인이 필요합니다.']]);
  assert.deepEqual(s.busy, [true, false]);
});

test('accepting a suggestion sets the category first, then toasts', () => {
  const log: string[] = [];
  applySuggestion('비품·자산', (category) => log.push('set ' + category), (message) => log.push('toast ' + message));
  assert.deepEqual(log, ['set 비품·자산', 'toast ' + APPLIED_TOAST]);
  assert.equal(APPLIED_TOAST, '추천 분류를 적용했습니다.');
});
