// R-031 R-026 R-027
// Boundary validation of edit / delete / restore / purge: the first failing stage supplies the Korean message, in the
// order of the legacy server.js (fields -> required -> reason and revision).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIFECYCLE_MESSAGES, parseEdit, parseLifecycle } from './lifecycleSchemas.ts';

const FIELD = '수정 항목을 확인하세요.';
const REQUIRED = '업무명·요청자·요청 시각·기한을 확인하세요.';
const REASON = '수정 사유와 버전을 확인하세요.';
const LIFECYCLE_REASON = '사유를 1~1000자로 입력하세요.';
const values = { title: '제목', requester: '요청자', department: '', channel: '', category: '', priority: '', requested_at: '2026-11-03T01:00:00Z', due_date: '', description: '' };
const edit = (over: Record<string, unknown> = {}) => ({ values, revision: 0, reason: '사유', ...over });
const message = (result: ReturnType<typeof parseEdit>) => (result.ok ? 'ok' : result.message);

test('the message table is the legacy wording', () => {
  assert.deepEqual({ ...LIFECYCLE_MESSAGES }, { editField: FIELD, editRequired: REQUIRED, editReason: REASON, lifecycleReason: LIFECYCLE_REASON });
});

test('a valid edit parses to trimmed values, the integer revision and the trimmed reason', () => {
  const result = parseEdit(edit({ values: { ...values, title: '  제목  ', description: ' x ' }, reason: '  정정 사유  ', revision: 4 }));
  assert.ok(result.ok);
  assert.deepEqual(result.value, { values: { ...values, title: '제목', description: 'x' }, revision: 4, reason: '정정 사유' });
});

test('stage 1: a missing, non-string, null or 10001-character field is refused with the field message; 10000 passes', () => {
  const without = (key: string) => {
    const copy: Record<string, unknown> = { ...values };
    delete copy[key];
    return copy;
  };
  const refused: Array<[string, unknown]> = [
    ['department missing', without('department')],
    ['priority a number', { ...values, priority: 3 }],
    ['channel null', { ...values, channel: null }],
    ['description 10001', { ...values, description: 'a'.repeat(10001) }],
    ['description 10001 only after trim would shrink', { ...values, description: ' ' + 'a'.repeat(10000) }],
    ['values absent', undefined],
    ['values null', null],
    ['values a string', 'title'],
    ['values an array', []],
  ];
  for (const [name, bad] of refused) assert.equal(message(parseEdit(edit({ values: bad }))), FIELD, name);
  assert.equal(message(parseEdit(edit({ values: { ...values, description: 'a'.repeat(10000) } }))), 'ok', '10000');
  assert.equal(message(parseEdit({ revision: 0, reason: 'x' })), FIELD, 'no values key at all');
});

test('stage 1 wins over stage 2 and 3 (field message first)', () => {
  assert.equal(message(parseEdit(edit({ values: { ...values, title: '', priority: 3 }, reason: '', revision: -1 }))), FIELD);
});

test('stage 2: empty or blank title/requester, unparseable or empty requested_at and non-calendar due dates are refused; empty due date and department pass', () => {
  const refused: Array<[string, Record<string, unknown>]> = [
    ['empty title', { title: '' }],
    ['blank title', { title: '   ' }],
    ['empty requester', { requester: '' }],
    ['blank requester', { requester: ' \t ' }],
    ['unparseable requested_at', { requested_at: '어제' }],
    ['empty requested_at', { requested_at: '' }],
    ['due 2026-02-30', { due_date: '2026-02-30' }],
    ['due 2026-02-31', { due_date: '2026-02-31' }],
    ['due wrong format', { due_date: '2026/11/03' }],
    ['due unpadded', { due_date: '2026-1-5' }],
  ];
  for (const [name, over] of refused) assert.equal(message(parseEdit(edit({ values: { ...values, ...over } }))), REQUIRED, name);
  for (const [name, over] of [['empty due date', { due_date: '' }], ['real day', { due_date: '2028-02-29' }], ['empty department', { department: '' }]] as const) {
    assert.equal(message(parseEdit(edit({ values: { ...values, ...over } }))), 'ok', name);
  }
});

test('stage 2 wins over stage 3', () => {
  assert.equal(message(parseEdit(edit({ values: { ...values, title: '' }, reason: '', revision: -1 }))), REQUIRED);
});

test('stage 3: reason must be 1..1000 characters after trimming and revision a non-negative integer', () => {
  const refusedReasons: unknown[] = ['', '   ', 'a'.repeat(1001), undefined, null, false, 0];
  for (const reason of refusedReasons) assert.equal(message(parseEdit(edit({ reason }))), REASON, `reason ${JSON.stringify(reason)}`);
  assert.equal(message(parseEdit(edit({ reason: ' ' + 'a'.repeat(1000) + ' ' }))), 'ok', '1000 after trim');
  assert.equal(message(parseEdit(edit({ reason: 'a' }))), 'ok', '1');
  for (const revision of [-1, 1.5, '0', null, undefined, true, [], NaN]) assert.equal(message(parseEdit(edit({ revision }))), REASON, `revision ${JSON.stringify(revision)}`);
  const noRevision = edit();
  delete (noRevision as Record<string, unknown>).revision;
  assert.equal(message(parseEdit(noRevision)), REASON, 'revision missing');
  assert.equal(message(parseEdit(edit({ revision: 0 }))), 'ok', 'revision 0');
  assert.equal(message(parseEdit(edit({ revision: 2.0 }))), 'ok', '2.0 is the integer 2');
});

test('lifecycle: reason is trimmed text of 1..1000 characters, the confirmation passes through untrimmed as text', () => {
  const ok = parseLifecycle({ reason: '  사유  ', confirmation: '  제목  ' });
  assert.ok(ok.ok);
  assert.deepEqual(ok.value, { reason: '사유', confirmation: '  제목  ' });
  for (const reason of ['', '   ', 'a'.repeat(1001), undefined, null, false, 0]) {
    const result = parseLifecycle({ reason });
    assert.ok(!result.ok, JSON.stringify(reason));
    assert.equal(result.message, LIFECYCLE_REASON);
  }
  for (const reason of ['a', 'a'.repeat(1000), ' ' + 'a'.repeat(1000)]) assert.ok(parseLifecycle({ reason }).ok, `reason of ${reason.length}`);
});

test('lifecycle: a number becomes its text, falsy and missing confirmations become the empty text, like String(x || "")', () => {
  const cases: Array<[unknown, string]> = [[undefined, ''], [null, ''], [false, ''], [0, ''], ['', ''], [123, '123'], ['a b', 'a b']];
  for (const [confirmation, expected] of cases) {
    const result = parseLifecycle({ reason: 'r', confirmation });
    assert.ok(result.ok);
    assert.equal(result.value.confirmation, expected, JSON.stringify(confirmation) ?? 'undefined');
  }
});
