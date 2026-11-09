// R-011
// R-021
// R-033
// R-034
// Cases derived from the observed screen in test/behavior/board.facts.json (admin/populated).
// The seven tasks below are a reconstruction from that screen: each field is what the screen shows,
// the rest is chosen only so the observed groups come out the same.
import test from 'node:test';
import assert from 'node:assert/strict';
import { groupTasks, splitCompleted } from './groupTasks.ts';
import { countByStatus } from './statusCounts.ts';
import { assigneeLabel, dueLabel, displayTitle } from './taskLabels.ts';
import type { BoardTask } from './BoardTask.ts';

const T = (id: string, title: string, rest: Partial<BoardTask>): BoardTask => ({ id, title, ...rest });
const monthly = T('monthly', '월간 소모품 점검', { requester: '박민수', department: '총무팀', channel: '메신저', category: '고정업무', priority: '중', status: '접수', due_date: '2026-11-13', requested_at: '2026-11-08T15:00:00Z', created_at: '2026-11-08T15:00:00Z' });
const purifier = T('purifier', '사무실 정수기 점검', { requester: '정하윤', department: '경영지원팀', channel: '이메일', category: '시설·환경', priority: '하', status: '대기', due_date: '2026-11-12', requested_at: '2026-11-05T15:00:00Z', created_at: '2026-11-05T15:00:00Z' });
const rehearsal = T('rehearsal', '연습용 등록 건', { requester: '테스터', department: '', channel: '기타', category: '기타', priority: '하', status: '접수', is_test: true, requested_at: '2026-11-04T15:00:00Z', created_at: '2026-11-04T15:00:00Z' });
const minimal = T('minimal', '최소 입력', { requester: '김철수', department: '', channel: '', category: '', status: '접수', requested_at: '2026-11-02T15:00:00Z', created_at: '2026-11-02T15:00:00Z' });
const laptop = T('laptop', '신규 입사자 노트북 준비', { requester: '홍길동', department: '인사팀', channel: '메신저', category: '비품·자산', priority: '높음', status: '진행 중', assignee: '박지원', due_date: '2026-11-05', requested_at: '2026-11-02T15:00:00Z', created_at: '2026-11-02T15:00:00Z' });
const purchase = T('purchase', '구매 정산', { requester: '최예산', department: '총무팀', channel: '구두', category: '구매·지출', status: '완료', requested_at: '2026-11-01T15:00:00Z', completed_at: '2026-11-07T15:00:00Z', created_at: '2026-11-01T15:00:00Z' });
const repair = T('repair', '시설 정산', { requester: '한도윤', department: '경영지원팀', channel: '전화', category: '시설·환경', status: '완료', requested_at: '2026-10-31T15:00:00Z', completed_at: '2026-11-04T15:00:00Z', created_at: '2026-10-31T15:00:00Z' });
// newest first, as the screen lists them
const all = [monthly, purifier, rehearsal, minimal, laptop, purchase, repair];

const heading = (name: string) => name;
const names = (groups: ReturnType<typeof groupTasks>) => groups.map((g) => heading(g.name));

test('[R-011] status counts cover every task regardless of search or filter', () => {
  assert.deepEqual(countByStatus(all), { all: 7, byStatus: { 접수: 3, '진행 중': 1, 대기: 1, 완료: 2 } });
  assert.deepEqual(countByStatus([]), { all: 0, byStatus: { 접수: 0, '진행 중': 0, 대기: 0, 완료: 0 } });
  assert.equal(countByStatus([T('x', 't', { status: '처리불가' })]).all, 1);
  assert.deepEqual(Object.values(countByStatus([T('x', 't', { status: '처리불가' })]).byStatus), [0, 0, 0, 0]);
});

test('[R-034] the default day board lists five groups newest first, 미완료 work on its request day', () => {
  const groups = groupTasks(all, { groupBy: 'date' });
  assert.deepEqual(names(groups), ['2026-11-09 (월)', '2026-11-08 (일)', '2026-11-06 (금)', '2026-11-05 (목)', '2026-11-03 (화)']);
  assert.equal(groups.flatMap((g) => g.tasks).length, 7);
  assert.deepEqual(groups.map((g) => [g.totalCount, g.openCount]), [[1, 1], [1, 0], [1, 1], [2, 1], [2, 2]]);
});

test('[R-011] inside one day the status order shows 접수 before 진행 중', () => {
  const last = groupTasks(all, { groupBy: 'date' })[4];
  assert.deepEqual(last.tasks.map((t) => t.id), ['minimal', 'laptop']);
});

test('[R-034] 완료 work folds under its completion day and open work stays visible', () => {
  const day = groupTasks(all, { groupBy: 'date' })[3];
  assert.equal(day.date, '2026-11-05');
  const { open, completed } = splitCompleted(day);
  assert.deepEqual(open.map((t) => t.id), ['rehearsal']);
  assert.deepEqual(completed.map((t) => t.id), ['repair']);
});

test('[R-011] the status filter shows one status and keeps only the days that have it', () => {
  assert.deepEqual(names(groupTasks(all, { groupBy: 'date', status: '접수' })), ['2026-11-09 (월)', '2026-11-05 (목)', '2026-11-03 (화)']);
  assert.deepEqual(names(groupTasks(all, { groupBy: 'date', status: '진행 중' })), ['2026-11-03 (화)']);
  assert.deepEqual(names(groupTasks(all, { groupBy: 'date', status: '대기' })), ['2026-11-06 (금)']);
  assert.deepEqual(names(groupTasks(all, { groupBy: 'date', status: '완료' })), ['2026-11-08 (일)', '2026-11-05 (목)']);
});

test('[R-011] searching a title word, a requester name, a missing word and a date text', () => {
  assert.deepEqual(names(groupTasks(all, { groupBy: 'date', query: '노트북' })), ['2026-11-03 (화)']);
  assert.deepEqual(names(groupTasks(all, { groupBy: 'date', query: '김철수' })), ['2026-11-03 (화)']);
  assert.deepEqual(groupTasks(all, { groupBy: 'date', query: '비어있는검색어' }), []);
  assert.deepEqual(groupTasks(all, { groupBy: 'date', query: '2026-11-05' }), []);
  assert.deepEqual(names(groupTasks(all, { groupBy: 'date', query: '정산', status: '완료' })), ['2026-11-08 (일)', '2026-11-05 (목)']);
});

test('[R-011] grouping by category orders six groups by representative status, then name', () => {
  assert.deepEqual(names(groupTasks(all, { groupBy: 'category' })), ['고정업무', '기타', '미분류', '비품·자산', '시설·환경', '구매·지출']);
  const facility = groupTasks(all, { groupBy: 'category' })[4];
  assert.deepEqual([facility.totalCount, facility.openCount], [2, 1]);
});

test('[R-011] grouping by department puts 미분류 first among the 접수 groups', () => {
  const groups = groupTasks(all, { groupBy: 'department' });
  assert.deepEqual(names(groups), ['미분류', '총무팀', '인사팀', '경영지원팀']);
  assert.deepEqual(groups[0].tasks.map((t) => t.id), ['rehearsal', 'minimal']);
  assert.deepEqual(groups[1].tasks.map((t) => t.id), ['monthly', 'purchase']);
});

test('[R-011] grouping by channel orders 기타, 메신저, 미분류, 이메일, 구두, 전화', () => {
  const groups = groupTasks(all, { groupBy: 'channel' });
  assert.deepEqual(names(groups), ['기타', '메신저', '미분류', '이메일', '구두', '전화']);
  assert.deepEqual(groups[1].tasks.map((t) => t.id), ['monthly', 'laptop']);
});

test('[R-033] the request-day basis makes six groups and the creation-day basis the same six', () => {
  const requested = groupTasks(all, { groupBy: 'date', dateField: 'requested_at' });
  assert.deepEqual(names(requested), ['2026-11-09 (월)', '2026-11-06 (금)', '2026-11-05 (목)', '2026-11-03 (화)', '2026-11-02 (월)', '2026-11-01 (일)']);
  assert.equal(requested.length, 6);
  assert.equal(requested.flatMap((g) => g.tasks).length, 7);
  assert.deepEqual(names(groupTasks(all, { groupBy: 'date', dateField: 'created_at' })), names(requested));
});

test('[R-033] the completion-day basis gives two days and one 미완료 group of five', () => {
  const groups = groupTasks(all, { groupBy: 'date', dateField: 'completed_at' });
  assert.deepEqual(names(groups), ['2026-11-08 (일)', '2026-11-05 (목)', '미완료']);
  assert.equal(groups[2].totalCount, 5);
  assert.equal(groups[2].openCount, 5);
  assert.deepEqual(groups[2].statusCounts, [{ status: '접수', count: 3 }, { status: '진행 중', count: 1 }, { status: '대기', count: 1 }]);
});

test('[R-033] a start date keeps five tasks in four days, an end date before it keeps the older two', () => {
  const from = groupTasks(all, { groupBy: 'date', from: '2026-11-05' });
  assert.equal(from.length, 4);
  assert.equal(from.flatMap((g) => g.tasks).length, 5);
  const to = groupTasks(all, { groupBy: 'date', from: '2026-11-05', to: '2026-11-04' });
  assert.deepEqual(to, []);
  const before = groupTasks(all, { groupBy: 'date', to: '2026-11-04' });
  assert.equal(before.length, 1);
  assert.equal(before[0].tasks.length, 2);
});

test('[R-033] the completion basis with a one-day range keeps only that completion day', () => {
  const groups = groupTasks(all, { groupBy: 'date', dateField: 'completed_at', from: '2026-11-08', to: '2026-11-08' });
  assert.deepEqual(names(groups), ['2026-11-08 (일)']);
});

test('[R-021] a test task shows a [테스트] mark before its title and a real task does not', () => {
  assert.equal(displayTitle(rehearsal), '[테스트] 연습용 등록 건');
  assert.equal(displayTitle(monthly), '월간 소모품 점검');
  assert.equal(displayTitle(T('x', 't', { is_test: false })), 't');
});

test('[R-011] row labels show the assignee or 미배정 and the due date or 미지정', () => {
  assert.equal(assigneeLabel(laptop), '담당 박지원');
  assert.equal(assigneeLabel(monthly), '담당 미배정');
  assert.equal(assigneeLabel(T('x', 't', { assignee: '  ' })), '담당 미배정');
  assert.equal(dueLabel(monthly), '기한 2026-11-13');
  assert.equal(dueLabel(rehearsal), '기한 미지정');
  assert.equal(dueLabel(T('x', 't', { due_date: '' })), '기한 미지정');
});
