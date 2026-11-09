import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ImprovementHistoryEvent, ImprovementItem } from './ImprovementApi.ts';
import {
  NEW_IMPROVEMENT_DEFAULTS,
  filterByStage,
  historyChangeText,
  historyMeta,
  improvementDialogTitle,
  improvementSubtitle,
} from './improvementView.ts';

const item = (over: Partial<ImprovementItem> = {}): ImprovementItem => ({
  id: 'i1',
  title: '제목',
  stage: 'MVP 구축',
  source: '총무팀',
  feedback: 'f',
  action: 'a',
  result: 'r',
  status: '접수',
  revision: 2,
  created_at: '2026-11-09T03:00:00.000Z',
  updated_at: '2026-11-09T03:00:00.000Z',
  ...over,
});

test('an empty stage keeps every record, a stage keeps only that stage in the given order', () => {
  const list = [item({ id: 'a', stage: 'MVP 구축' }), item({ id: 'b', stage: '정착 운영' }), item({ id: 'c', stage: 'MVP 구축' })];
  assert.deepEqual(filterByStage(list, '').map((x) => x.id), ['a', 'b', 'c']);
  assert.deepEqual(filterByStage(list, 'MVP 구축').map((x) => x.id), ['a', 'c']);
  assert.deepEqual(filterByStage(list, '본인 실사용'), []);
});

test('the row line joins stage, source, update time in Seoul and version with a middle dot', () => {
  assert.equal(improvementSubtitle(item()), 'MVP 구축 · 총무팀 · 2026. 11. 9. 오후 12:00:00 · v2');
});

test('a record without a source shows 본인', () => {
  assert.match(improvementSubtitle(item({ source: '' })), /^MVP 구축 · 본인 · /);
});

test('the dialog title tells a new record from an existing one', () => {
  assert.equal(improvementDialogTitle(undefined), '새 개선 기록');
  assert.equal(improvementDialogTitle(item()), '개선 기록');
});

test('a new record starts at 본인 실사용 and 접수', () => {
  assert.deepEqual(NEW_IMPROVEMENT_DEFAULTS, { stage: '본인 실사용', status: '접수' });
});

const event = (before: ImprovementHistoryEvent['before'], after: ImprovementHistoryEvent['after']): ImprovementHistoryEvent => ({
  at: '2026-11-09T03:00:00.000Z',
  actor: 'admin',
  before,
  after,
});

test('a first save lists every field from nothing, an empty text shown as a dash, in field order', () => {
  const text = historyChangeText(event({}, { title: 't', stage: 'MVP 구축', source: '', feedback: 'f', action: 'a', result: 'r', status: '접수' }));
  assert.equal(text, 'title: — → t\nstage: — → MVP 구축\nsource: — → —\nfeedback: — → f\naction: — → a\nresult: — → r\nstatus: — → 접수');
});

test('a later save lists only the changed fields; a field that is the same on both sides is skipped', () => {
  const text = historyChangeText(event({ title: 't', result: 'old', status: '개선 중' }, { title: 't', result: '새 결과', status: '검증 완료' }));
  assert.equal(text, 'result: old → 새 결과\nstatus: 개선 중 → 검증 완료');
});

test('a save that changed nothing has no text, and keys outside the seven fields are ignored', () => {
  assert.equal(historyChangeText(event({ title: 't' }, { title: 't' })), '');
  assert.equal(historyChangeText({ at: 'x', actor: 'a', before: { extra: '1' } as never, after: { extra: '2' } as never }), '');
});

test('the history line shows the time in Seoul and the actor', () => {
  assert.equal(historyMeta(event({}, {})), '2026. 11. 9. 오후 12:00:00 · admin');
});
