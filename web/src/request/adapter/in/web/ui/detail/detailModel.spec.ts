import assert from 'node:assert/strict';
import { test } from 'node:test';
import { badgeClass, detailMeta, extensionKind, isEditable, STATUSES, timelineEvents } from './detailModel.ts';
import type { TaskDetailView } from '../RequestApi.ts';

const detail = (over: Partial<TaskDetailView> = {}): TaskDetailView => ({
  id: 't1', title: '신규 입사자 노트북 준비', requester: '홍길동', department: '인사팀', channel: '메신저', category: '비품·자산', priority: '높음',
  requested_at: '2026-11-02T15:00:00.000Z', due_date: '2026-11-05', description: '노트북 1대 준비', status: '진행 중',
  created_at: '2026-11-03T01:00:00.000Z', updated_at: '2026-11-03T01:00:00.000Z', completed_at: null, events: [], ...over,
});

test('the statuses are the four of the legacy form in order', () => {
  assert.deepEqual([...STATUSES], ['접수', '진행 중', '대기', '완료']);
});

test('the meta rows keep the legacy labels and order, with the KST request day', () => {
  assert.deepEqual(detailMeta(detail()), [
    ['요청자', '홍길동'],
    ['부서', '인사팀'],
    ['접수 경로', '메신저'],
    ['분류 · 우선순위', '비품·자산 · 높음'],
    ['요청일', '2026-11-03'],
    ['시스템 등록 시각', '2026. 11. 03. 오전 10:00'],
    ['처리 기한', '2026-11-05'],
    ['완료 시각', '—'],
  ]);
});

test('empty department, request time and due date show a dash; a completion time is formatted', () => {
  const rows = detailMeta(detail({ department: '', requested_at: '', due_date: '', completed_at: '2026-11-04T03:30:00.000Z' }));
  assert.deepEqual(rows.map(([, v]) => v), ['홍길동', '—', '메신저', '비품·자산 · 높음', '—', '2026. 11. 03. 오전 10:00', '—', '2026. 11. 04. 오후 12:30']);
});

test('only an admin can change a task that is not deleted', () => {
  assert.equal(isEditable('admin', detail()), true);
  assert.equal(isEditable('viewer', detail()), false);
  assert.equal(isEditable('admin', detail({ deleted_at: '2026-11-05T00:00:00.000Z' })), false);
  assert.equal(isEditable('admin', detail({ deleted_at: null })), true);
});

test('the badge class has done and wait only for those two statuses', () => {
  assert.equal(badgeClass('완료'), 'badge done');
  assert.equal(badgeClass('대기'), 'badge wait');
  assert.equal(badgeClass('접수'), 'badge ');
  assert.equal(badgeClass('진행 중'), 'badge ');
});

test('the timeline shows the newest event first and does not reorder the detail', () => {
  const events = [
    { at: 'a', actor: 'x', kind: '등록', detail: '' },
    { at: 'b', actor: 'x', kind: '상태 변경', detail: '접수 → 진행 중' },
  ];
  assert.deepEqual(timelineEvents(events).map((e) => e.at), ['b', 'a']);
  assert.deepEqual(events.map((e) => e.at), ['a', 'b']);
});

test('the extensions block follows the legacy order: deleted before missing tables before the tools', () => {
  const kpi = { available: true, files: [] };
  assert.equal(extensionKind(detail({ deleted_at: '2026-11-05T00:00:00.000Z', kpi })), 'deleted');
  assert.equal(extensionKind(detail({ kpi: { available: false, files: [] } })), 'unavailable');
  assert.equal(extensionKind(detail()), 'unavailable');
  assert.equal(extensionKind(detail({ kpi })), 'tools');
});
