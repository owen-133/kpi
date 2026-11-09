// R-011
// R-033
// R-034
import test from 'node:test';
import assert from 'node:assert/strict';
import { groupTasks, InvalidBoardFilterError, representativeState, isUrgent, splitCompleted } from './groupTasks.ts';
import { taskState } from './taskStatus.ts';
import type { BoardTask } from './BoardTask.ts';

const tasks: BoardTask[] = [
  { id: '1', title: '노트북 준비', requester: '김담당', department: '개발팀', description: '신규 입사', category: '비품', status: '완료', created_at: '2026-11-01' },
  { id: '2', title: '회의실 수리', requester: '박담당', department: '인사팀', description: '조명 교체', category: '시설', status: '진행 중', created_at: '2026-11-02' },
  { id: '3', title: '마우스 구매', requester: '김담당', department: '개발팀', description: '장비 교체', category: '비품', status: '접수', created_at: '2026-11-03' },
];

const ids = (list: readonly BoardTask[]) => list.map((t) => t.id);

// ---- ported from test/board-model.test.js ----------------------------------------------------

test('[R-011] groups by category by default with the 접수 task first and keeps completed records', () => {
  const g = groupTasks(tasks);
  assert.equal(g[0].name, '비품');
  assert.equal(representativeState(g[0]), 'waiting');
  assert.deepEqual(ids(g[0].tasks), ['3', '1']);
  assert.equal(taskState('완료'), 'idle');
});

test('[R-011] search and status apply together and the board regroups by department', () => {
  const g = groupTasks(tasks, { query: '교체', status: '진행 중', groupBy: 'department' });
  assert.equal(g.length, 1);
  assert.equal(g[0].name, '인사팀');
  assert.equal(g[0].tasks[0].id, '2');
  assert.deepEqual(groupTasks(tasks, { query: '없는 내용' }), []);
});

// ---- ported from test/date-workflow.test.js --------------------------------------------------

const dateBase = { title: '날짜 검증', requester: '담당자', description: '', status: '접수', category: '일반', created_at: '2026-11-01T00:00:00Z' };
const dateTasks: BoardTask[] = [
  { ...dateBase, id: 'a', requested_at: '2026-11-01T14:59:00Z', completed_at: null },
  { ...dateBase, id: 'b', requested_at: '2026-11-01T15:00:00Z', completed_at: '2026-11-03T00:00:00Z', status: '완료' },
];

test('[R-033] date groups separate KST boundary, range and the 미완료 group', () => {
  const groups = groupTasks(dateTasks, { groupBy: 'date', dateField: 'requested_at' });
  assert.equal(groups[0].date, '2026-11-02');
  assert.equal(groups[1].date, '2026-11-01');
  assert.equal(groupTasks(dateTasks, { groupBy: 'date', from: '2026-11-03', to: '2026-11-01' }).length, 0);
  assert.equal(groupTasks(dateTasks, { groupBy: 'date', dateField: 'requested_at', from: '2026-11-02', to: '2026-11-02' })[0].tasks[0].id, 'b');
  const completed = groupTasks(dateTasks, { groupBy: 'date', dateField: 'completed_at' });
  assert.equal(completed[1].name, '미완료');
  assert.equal(groupTasks(dateTasks, { groupBy: 'date', from: '2030-01-01' }).length, 0);
});

const reopenBase: BoardTask = { id: 'done', title: '시설 확인', status: '완료', created_at: '2026-11-04T00:00:00Z', requested_at: '2026-11-04T15:00:00Z', completed_at: '2026-11-05T15:00:00Z' };
const activity = { groupBy: 'date', dateField: 'activity' } as const;

test('[R-034] a completed task moves to its KST completion day and a reopened one returns to its request day', () => {
  assert.equal(groupTasks([reopenBase], activity)[0].date, '2026-11-06');
  assert.equal(groupTasks([reopenBase], { ...activity, from: '2026-11-06', to: '2026-11-06' }).length, 1);
  assert.equal(groupTasks([reopenBase], { ...activity, to: '2026-11-05' }).length, 0);
  assert.equal(groupTasks([{ ...reopenBase, completed_at: '2026-11-05T14:59:59Z' }], activity)[0].date, '2026-11-05');
  assert.equal(groupTasks([{ ...reopenBase, status: '진행 중' }], activity)[0].date, '2026-11-05');
  assert.equal(groupTasks([{ ...reopenBase, completed_at: null }], activity)[0].name, '완료일 미상');
  assert.equal(groupTasks([reopenBase], { ...activity, dateField: 'requested_at' })[0].date, '2026-11-05');
  assert.equal(groupTasks([reopenBase], { ...activity, dateField: 'created_at' })[0].date, '2026-11-04');
  assert.deepEqual(groupTasks([], activity), []);
});

// ---- cases from test/board-ui.test.js that are pure board rules --------------------------------

test('[R-011] searching the description finds the task and the 완료 task folds under its department', () => {
  const ui: BoardTask[] = [{ id: 'n', title: '테스트 노트북 준비', requester: '홍길동', department: '인사팀', category: '비품·자산', description: '신규 입사자 장비 세팅', status: '완료' }];
  const groups = groupTasks(ui, { query: '신규 입사자', groupBy: 'department' });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, '인사팀');
  assert.deepEqual(ids(splitCompleted(groups[0]).completed), ['n']);
  assert.deepEqual(splitCompleted(groups[0]).open, []);
  assert.deepEqual(groupTasks(ui, { query: '해당없음' }), []);
});

// ---- edge cases --------------------------------------------------------------------------------

test('[R-011] an empty list gives no groups for every grouping', () => {
  for (const groupBy of ['category', 'department', 'channel', 'date'] as const) {
    assert.deepEqual(groupTasks([], { groupBy }), []);
  }
});

test('[R-011] groups sort by representative status, then by Korean name', () => {
  const list: BoardTask[] = [
    { id: 'a', title: 't', status: '완료', category: '구매·지출' },
    { id: 'b', title: 't', status: '접수', category: '미분류X' },
    { id: 'c', title: 't', status: '접수', category: '기타' },
    { id: 'd', title: 't', status: '대기', category: '시설·환경' },
    { id: 'e', title: 't', status: '진행 중', category: '비품·자산' },
    { id: 'f', title: 't', status: '접수', category: '고정업무' },
  ];
  assert.deepEqual(groupTasks(list).map((g) => g.name), ['고정업무', '기타', '미분류X', '비품·자산', '시설·환경', '구매·지출']);
});

test('[R-011] tasks with an empty or blank group value go to 미분류', () => {
  const list: BoardTask[] = [
    { id: 'a', title: 't', status: '접수', category: '', department: '   ' },
    { id: 'b', title: 't', status: '접수' },
  ];
  assert.deepEqual(groupTasks(list).map((g) => [g.name, ids(g.tasks)]), [['미분류', ['a', 'b']]]);
  assert.deepEqual(groupTasks(list, { groupBy: 'department' }).map((g) => g.name), ['미분류']);
  assert.deepEqual(groupTasks(list, { groupBy: 'channel' }).map((g) => g.name), ['미분류']);
});

test('[R-011] group values are trimmed so padded names share one group', () => {
  const list: BoardTask[] = [{ id: 'a', title: 't', department: '총무팀 ' }, { id: 'b', title: 't', department: '총무팀' }];
  assert.equal(groupTasks(list, { groupBy: 'department' }).length, 1);
});

test('[R-011] inside a group the status order wins, then the nearer due date, then input order', () => {
  const list: BoardTask[] = [
    { id: 'done', title: 't', status: '완료', category: 'c', due_date: '2026-01-01' },
    { id: 'late', title: 't', status: '접수', category: 'c', due_date: '2026-12-01' },
    { id: 'none1', title: 't', status: '접수', category: 'c' },
    { id: 'soon', title: 't', status: '접수', category: 'c', due_date: '2026-11-01' },
    { id: 'none2', title: 't', status: '접수', category: 'c', due_date: '' },
    { id: 'wip', title: 't', status: '진행 중', category: 'c', due_date: '2020-01-01' },
    { id: 'odd', title: 't', status: '처리불가', category: 'c' },
  ];
  assert.deepEqual(ids(groupTasks(list)[0].tasks), ['soon', 'late', 'none1', 'none2', 'wip', 'done', 'odd']);
});

test('[R-011] grouping never reorders or changes the caller input', () => {
  const copy = tasks.map((t) => ({ ...t }));
  groupTasks(tasks, { groupBy: 'department' });
  assert.deepEqual(tasks, copy);
  assert.deepEqual(ids(tasks), ['1', '2', '3']);
});

test('[R-011] group counts and the unfinished count follow the tasks', () => {
  const g = groupTasks(tasks)[0];
  assert.equal(g.totalCount, 2);
  assert.equal(g.openCount, 1);
  assert.deepEqual(g.statusCounts, [{ status: '접수', count: 1 }, { status: '완료', count: 1 }]);
});

test('[R-011] an unknown status is kept in the group and is not counted as open work for urgency', () => {
  const g = groupTasks([{ id: 'x', title: 't', status: '처리불가', category: 'c' }])[0];
  assert.equal(representativeState(g), 'idle');
  assert.equal(isUrgent(g), false);
  assert.equal(g.totalCount, 1);
});

test('[R-011] the status filter matches exactly; 전체, empty and missing mean no filter', () => {
  assert.equal(groupTasks(tasks, { status: '전체' }).flatMap((g) => g.tasks).length, 3);
  assert.equal(groupTasks(tasks, { status: '' }).flatMap((g) => g.tasks).length, 3);
  assert.equal(groupTasks(tasks, { status: undefined }).flatMap((g) => g.tasks).length, 3);
  assert.deepEqual(groupTasks(tasks, { status: '없는상태' }), []);
  assert.deepEqual(ids(groupTasks(tasks, { status: '접수' })[0].tasks), ['3']);
});

test('[R-011] representative state follows the first status, and only 접수 is urgent', () => {
  const byName = (name: string) => groupTasks(tasks, { groupBy: 'category' }).find((g) => g.name === name)!;
  assert.equal(representativeState(byName('시설')), 'working');
  assert.equal(isUrgent(byName('시설')), false);
  assert.equal(isUrgent(byName('비품')), true);
  const onlyDone = groupTasks(tasks, { status: '완료' })[0];
  assert.equal(representativeState(onlyDone), 'idle');
  const blocked = groupTasks([{ id: 'w', title: 't', status: '대기', category: 'c' }])[0];
  assert.equal(representativeState(blocked), 'blocked');
});

test('[R-033] the date range is inclusive at both ends and from after to gives nothing', () => {
  const day = (id: string, requested_at: string): BoardTask => ({ id, title: 't', status: '접수', requested_at });
  const list = [day('d1', '2026-11-01T00:00:00Z'), day('d2', '2026-11-02T00:00:00Z'), day('d3', '2026-11-03T00:00:00Z')];
  const range = (from?: string, to?: string) => groupTasks(list, { groupBy: 'date', dateField: 'requested_at', from, to }).map((g) => g.date);
  assert.deepEqual(range('2026-11-02', '2026-11-02'), ['2026-11-02']);
  assert.deepEqual(range('2026-11-02'), ['2026-11-03', '2026-11-02']);
  assert.deepEqual(range(undefined, '2026-11-02'), ['2026-11-02', '2026-11-01']);
  assert.deepEqual(range('2026-11-03', '2026-11-02'), []);
  assert.deepEqual(range('', ''), ['2026-11-03', '2026-11-02', '2026-11-01']);
});

test('[R-033] a malformed range day fails loudly instead of showing everything', () => {
  assert.throws(() => groupTasks(tasks, { groupBy: 'date', from: '2026-02-31' }), InvalidBoardFilterError);
  assert.throws(() => groupTasks(tasks, { groupBy: 'date', to: '11/05' }), InvalidBoardFilterError);
});

test('[R-033] a task without a usable date sits in its own last group and a range hides it', () => {
  const list: BoardTask[] = [
    { id: 'u', title: 't', status: '접수', requested_at: null },
    { id: 'v', title: 't', status: '접수', requested_at: 'garbage' },
    { id: 'w', title: 't', status: '접수', requested_at: '2026-11-01T00:00:00Z' },
  ];
  const groups = groupTasks(list, { groupBy: 'date', dateField: 'requested_at' });
  assert.deepEqual(groups.map((g) => g.name), ['2026-11-01 (일)', '요청일 미상']);
  assert.equal(groups[1].date, null);
  assert.deepEqual(ids(groups[1].tasks), ['u', 'v']);
  assert.deepEqual(groupTasks(list, { groupBy: 'date', dateField: 'requested_at', from: '2000-01-01' }).map((g) => g.name), ['2026-11-01 (일)']);
});

test('[R-033] the activity day names follow the date field and 미완료 comes last', () => {
  const list: BoardTask[] = [
    { id: 'a', title: 't', status: '접수', requested_at: '2026-11-04T15:00:00Z', completed_at: null },
    { id: 'b', title: 't', status: '완료', requested_at: '2026-11-01T00:00:00Z', completed_at: '2026-11-08T00:00:00Z' },
  ];
  assert.deepEqual(groupTasks(list, { groupBy: 'date', dateField: 'completed_at' }).map((g) => g.name), ['2026-11-08 (일)', '미완료']);
  assert.deepEqual(groupTasks(list, { groupBy: 'date' }).map((g) => g.name), ['2026-11-08 (일)', '2026-11-05 (목)']);
  assert.deepEqual(groupTasks(list, { groupBy: 'date', dateField: 'created_at' }).map((g) => g.name), ['등록일 미상']);
});

test('[R-033] a date group sorts its tasks by status then due date like any other group', () => {
  const list: BoardTask[] = [
    { id: 'w', title: 't', status: '진행 중', requested_at: '2026-11-03T00:00:00Z' },
    { id: 'r', title: 't', status: '접수', requested_at: '2026-11-03T05:00:00Z' },
  ];
  assert.deepEqual(ids(groupTasks(list, { groupBy: 'date' })[0].tasks), ['r', 'w']);
});

test('[R-034] a completed task with a missing completion time is 완료일 미상 and a range hides it', () => {
  const lost = { ...reopenBase, completed_at: 'broken' };
  assert.equal(groupTasks([lost], activity)[0].name, '완료일 미상');
  assert.deepEqual(groupTasks([lost], { ...activity, from: '2000-01-01' }), []);
});

test('[R-034] a completed task reopened with a stale completion time shows on its request day', () => {
  const reopened = { ...reopenBase, status: '대기' };
  assert.equal(groupTasks([reopened], activity)[0].date, '2026-11-05');
  assert.equal(groupTasks([reopened], { ...activity, from: '2026-11-06' }).length, 0);
});

test('[R-011] splitCompleted separates 완료 from open work without losing a task', () => {
  const g = groupTasks(tasks)[0];
  const { open, completed } = splitCompleted(g);
  assert.deepEqual(ids(open), ['3']);
  assert.deepEqual(ids(completed), ['1']);
  assert.equal(open.length + completed.length, g.totalCount);
});
