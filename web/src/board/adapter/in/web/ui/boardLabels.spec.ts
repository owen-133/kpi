import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BoardTask } from '../../../../domain/BoardTask.ts';
import { groupBadgeLabel, emptyMessage, groupSummary, isOverdue, receiptText, rowMeta, rowStatus, summaryLine, collapsedSummary } from './boardLabels.ts';

const NOW = '2026-11-09T03:00:00.000Z';

function task(over: Partial<BoardTask> = {}): BoardTask {
  return { id: '1', title: '월간 소모품 점검', status: '접수', created_at: '2026-11-09T00:10:00Z', ...over };
}

test('the summary line counts groups and tasks and names the order of the grouping', () => {
  assert.deepEqual(summaryLine(5, 7, 'date', 'activity'), { counts: '5개 그룹 · 7건', order: '최신 날짜순 · 같은 날짜는 상태순 · 한국 날짜 기준 · 완료는 완료일, 미완료는 요청일' });
  assert.deepEqual(summaryLine(6, 7, 'category', 'activity'), { counts: '6개 그룹 · 7건', order: '접수 → 진행 중 → 대기 → 완료 순 · 한국 날짜 기준 · 완료는 완료일, 미완료는 요청일' });
  assert.deepEqual(summaryLine(1, 1, 'date', 'completed_at'), { counts: '1개 그룹 · 1건', order: '최신 날짜순 · 같은 날짜는 상태순 · 한국 날짜 기준' });
  assert.deepEqual(summaryLine(0, 0, 'channel', 'requested_at'), { counts: '0개 그룹 · 0건', order: '접수 → 진행 중 → 대기 → 완료 순 · 한국 날짜 기준' });
});

test('a group says how many tasks it holds and how many are still open', () => {
  assert.equal(groupSummary({ totalCount: 2, openCount: 1 }), '전체 2건 · 미완료 1건');
});

test('a collapsed group shows the status and title of its first task', () => {
  assert.equal(collapsedSummary(task({ status: '접수', title: '연습용 등록 건', is_test: true })), '접수 · 연습용 등록 건');
});

test('the group badge counts are the per-status counts in order', () => {
  assert.deepEqual(groupBadgeLabel([{ status: '접수', count: 1 }, { status: '완료', count: 2 }]), ['1', '2']);
});

test('the meta line keeps the dot after an empty department and channel', () => {
  assert.equal(rowMeta(task({ requester: '박민수', department: '총무팀', channel: '메신저' })), '박민수 · 총무팀 · 메신저 · 담당 미배정');
  assert.equal(rowMeta(task({ requester: '테스터', department: '', channel: '기타' })), '테스터 · 기타 · 담당 미배정');
  assert.equal(rowMeta(task({ requester: '김철수', assignee: '박지원' })), '김철수 ·  · 담당 박지원');
});

test('the status text adds the priority only when there is one', () => {
  assert.equal(rowStatus(task({ priority: '중' })), '접수 · 중');
  assert.equal(rowStatus(task({ priority: '' })), '접수');
  assert.equal(rowStatus(task({ priority: null })), '접수');
});

test('the receipt text is "처리 완료" for finished work and counts from the creation time otherwise', () => {
  assert.equal(receiptText(task({ status: '완료' }), NOW), '처리 완료');
  assert.equal(receiptText(task(), NOW), '접수 후 2시간 50분');
});

test('under a minute the receipt text counts seconds', () => {
  assert.equal(receiptText(task({ created_at: NOW }), NOW), '접수 후 0초');
  assert.equal(receiptText(task({ created_at: '2026-11-09T02:59:15.000Z' }), NOW), '접수 후 45초');
  assert.equal(receiptText(task({ created_at: '2026-11-09T02:59:00.000Z' }), NOW), '접수 후 1분');
});

test('a task whose creation time is missing or in the future has no receipt text', () => {
  assert.equal(receiptText(task({ created_at: null }), NOW), '');
  assert.equal(receiptText(task({ created_at: '2026-11-10T00:00:00Z' }), NOW), '');
});

test('overdue means a due day before today in Seoul on work that is not finished', () => {
  assert.equal(isOverdue(task({ due_date: '2026-11-05' }), NOW), true);
  assert.equal(isOverdue(task({ due_date: '2026-11-09' }), NOW), false);
  assert.equal(isOverdue(task({ due_date: '2026-11-05', status: '완료' }), NOW), false);
  assert.equal(isOverdue(task({ due_date: '' }), NOW), false);
  assert.equal(isOverdue(task({ due_date: null }), NOW), false);
});

test('the empty message depends on whether any task exists and who is looking', () => {
  assert.deepEqual(emptyMessage(0, 'admin', '새 업무 등록'), { title: '첫 업무를 기록해 보세요.', body: '오른쪽 위 새 업무 등록 버튼으로 구두·메신저 요청을 접수하세요.' });
  assert.deepEqual(emptyMessage(0, 'viewer', '새 업무 등록'), { title: '첫 업무를 기록해 보세요.', body: '담당자가 등록한 업무가 이곳에 표시됩니다.' });
  assert.deepEqual(emptyMessage(3, 'admin', '새 업무 등록'), { title: '조건에 맞는 업무가 없습니다.', body: '검색어나 상태 필터를 바꿔보세요.' });
  assert.deepEqual(emptyMessage(3, 'viewer', '새 업무 등록'), { title: '조건에 맞는 업무가 없습니다.', body: '검색어나 상태 필터를 바꿔보세요.' });
});
