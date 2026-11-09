import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TaskSummary } from '../../../../../../request/adapter/in/web/ui/RequestApi.ts';
import { DEFAULT_SETTINGS } from '../../../../../../settings/domain/PortalSettings.ts';
import { PENDING_LIMIT, completion, kpiStrip, pendingTasks, statCards, syncStatusText, taskRow } from './overviewModel.ts';

const task = (over: Partial<TaskSummary> & { id: string }): TaskSummary => ({
  title: 't-' + over.id,
  requester: '김철수',
  department: '',
  channel: '구두',
  category: '',
  priority: '보통',
  requested_at: '2026-11-02T01:00:00.000Z',
  due_date: '',
  description: '',
  status: '접수',
  created_at: '2026-11-02T01:00:00.000Z',
  updated_at: '2026-11-02T01:00:00.000Z',
  completed_at: null,
  ...over,
});
const ids = (list: readonly TaskSummary[]): string[] => list.map((t) => t.id);

test('the pending list holds open real tasks only: finished and test tasks are left out', () => {
  const list = pendingTasks([task({ id: 'a' }), task({ id: 'done', status: '완료' }), task({ id: 'test', is_test: true }), task({ id: 'wait', status: '대기' })]);
  assert.deepEqual(ids(list), ['a', 'wait']);
});

test('the pending list is ordered by due date, tasks without a due date last, equal dates keep their order', () => {
  const list = pendingTasks([
    task({ id: 'none1' }),
    task({ id: 'late', due_date: '2026-11-13' }),
    task({ id: 'early', due_date: '2026-11-05' }),
    task({ id: 'none2' }),
    task({ id: 'late2', due_date: '2026-11-13' }),
  ]);
  assert.deepEqual(ids(list), ['early', 'late', 'late2', 'none1', 'none2']);
});

test('the pending list shows five rows: the sixth is cut, the fifth is kept', () => {
  assert.equal(PENDING_LIMIT, 5);
  const six = Array.from({ length: 6 }, (_, i) => task({ id: 'r' + i, due_date: `2026-11-0${i + 1}` }));
  assert.deepEqual(ids(pendingTasks(six)), ['r0', 'r1', 'r2', 'r3', 'r4']);
  assert.equal(pendingTasks(six.slice(0, 5)).length, 5);
  assert.deepEqual(pendingTasks([]), []);
});

test('the four stat cards count real tasks only, with the settings labels and the fixed captions', () => {
  const tasks = [
    task({ id: '1', status: '진행 중', due_date: '2026-11-05' }),
    task({ id: '2', status: '완료', due_date: '2026-11-01' }),
    task({ id: '3', status: '완료' }),
    task({ id: '4', status: '대기', due_date: '2026-11-12' }),
    task({ id: '5', is_test: true, status: '진행 중', due_date: '2026-10-01' }),
  ];
  const cards = statCards(tasks, DEFAULT_SETTINGS.texts, '2026-11-09');
  assert.deepEqual(
    cards.map((c) => [c.label, c.value, c.caption]),
    [
      ['전체 업무', 4, '실제 업무 기준 · 테스트 제외'],
      ['진행 중', 1, '현재 처리 중'],
      ['완료 업무', 2, '처리 완료'],
      ['기한 초과', 1, '미완료 업무 기준'],
    ],
  );
});

test('overdue means a due date before today on an unfinished task: today itself, no date and finished tasks are not overdue', () => {
  const tasks = [
    task({ id: 'today', due_date: '2026-11-09' }),
    task({ id: 'yesterday', due_date: '2026-11-08' }),
    task({ id: 'nodate' }),
    task({ id: 'doneLate', due_date: '2026-11-01', status: '완료' }),
  ];
  assert.equal(statCards(tasks, DEFAULT_SETTINGS.texts, '2026-11-09')[3].value, 1);
});

test('the completion share rounds over the real tasks and is 0 without any', () => {
  assert.deepEqual(completion([]), { percent: 0, real: 0, done: 0 });
  const tasks = [task({ id: '1', status: '완료' }), task({ id: '2' }), task({ id: '3' }), task({ id: 't', is_test: true, status: '완료' })];
  assert.deepEqual(completion(tasks), { percent: 33, real: 3, done: 1 });
  assert.equal(completion([task({ id: '1', status: '완료' }), task({ id: '2', status: '완료' }), task({ id: '3' })]).percent, 67);
});

test('a row names the requester, the department when there is one and the category, in one text', () => {
  assert.equal(taskRow(task({ id: '1', department: '인사팀', category: '비품·자산' }), '2026-11-09').subtitle, '김철수 · 인사팀 · 비품·자산');
  assert.equal(taskRow(task({ id: '2', category: '비품·자산' }), '2026-11-09').subtitle, '김철수 · 비품·자산');
  assert.equal(taskRow(task({ id: '3' }), '2026-11-09').subtitle, '김철수 · ', 'an empty category leaves the separator, as the legacy row did');
});

test('a row status badge is plain, done or wait', () => {
  const badge = (status: string) => taskRow(task({ id: 'x', status }), '2026-11-09').statusClass;
  assert.equal(badge('접수'), 'badge ');
  assert.equal(badge('진행 중'), 'badge ');
  assert.equal(badge('대기'), 'badge wait');
  assert.equal(badge('완료'), 'badge done');
});

test('the due cell is a time element, urgent only for an unfinished task due before today; no date gives the unset badge', () => {
  const due = (over: Partial<TaskSummary>) => taskRow(task({ id: 'x', ...over }), '2026-11-09').due;
  assert.deepEqual(due({ due_date: '2026-11-08' }), { kind: 'date', value: '2026-11-08', className: 'badge urgent' });
  assert.deepEqual(due({ due_date: '2026-11-09' }), { kind: 'date', value: '2026-11-09', className: 'badge ' });
  assert.deepEqual(due({ due_date: '2026-11-08', status: '완료' }), { kind: 'date', value: '2026-11-08', className: 'badge ' });
  assert.deepEqual(due({}), { kind: 'none' });
});

test('the KPI strip writes counts with 건, the rate with %, and a dash while a figure does not exist', () => {
  const empty = kpiStrip([], '2026-11-09T03:00:00.000Z');
  assert.deepEqual(empty, { excluded: '테스트 0건 제외 · 활성 대시보드 30초 갱신', received: '0건', completed: '0건', onTime: '—', average: '—' });
  const tasks = [
    task({ id: '1', requested_at: '2026-11-02T00:00:00.000Z', due_date: '2026-11-05', status: '완료', completed_at: '2026-11-04T06:00:00.000Z' }),
    task({ id: '2', is_test: true }),
  ];
  const strip = kpiStrip(tasks, '2026-11-09T03:00:00.000Z');
  assert.equal(strip.excluded, '테스트 1건 제외 · 활성 대시보드 30초 갱신');
  assert.equal(strip.received, '1건');
  assert.equal(strip.completed, '1건');
  assert.equal(strip.onTime, '100%');
  assert.equal(strip.average, '54.0시간');
});

test('the KPI strip counts the current KST month: a task from just before midnight KST belongs to the new month', () => {
  const t = task({ id: '1', requested_at: '2026-10-31T15:30:00.000Z' });
  assert.equal(kpiStrip([t], '2026-11-09T03:00:00.000Z').received, '1건');
  assert.equal(kpiStrip([t], '2026-10-20T03:00:00.000Z').received, '0건');
});

test('the sync status reads the time of the last refresh in KST, or a dash before the first one', () => {
  assert.equal(syncStatusText('2026-11-09T03:05:00.000Z'), '최근 갱신 2026. 11. 09. 오후 12:05');
  assert.equal(syncStatusText(''), '최근 갱신 —');
});
