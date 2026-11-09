import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BoardTask } from '../../../../domain/BoardTask.ts';
import { boardReducer, groupKey, initialBoardState, visibleGroups } from './boardState.ts';

const NOW = '2026-11-09T03:00:00.000Z';

function task(id: string, over: Partial<BoardTask> = {}): BoardTask {
  return { id, title: `업무 ${id}`, status: '접수', created_at: '2026-11-08T00:00:00Z', requested_at: '2026-11-08T00:00:00Z', ...over };
}

test('the board starts on every status, grouped by date, with the processing-day basis and nothing collapsed', () => {
  const s = initialBoardState(NOW);
  assert.deepEqual(
    { status: s.status, query: s.query, groupBy: s.groupBy, dateField: s.dateField, from: s.from, to: s.to, compact: s.compact },
    { status: '전체', query: '', groupBy: 'date', dateField: 'activity', from: '', to: '', compact: false },
  );
  assert.deepEqual([s.collapsed, s.historyOpen, s.now], [[], [], NOW]);
});

test('status, search, grouping, basis and range actions each change only their own field', () => {
  let s = initialBoardState(NOW);
  s = boardReducer(s, { type: 'status', status: '완료' });
  s = boardReducer(s, { type: 'query', query: '정산' });
  s = boardReducer(s, { type: 'groupBy', groupBy: 'category' });
  s = boardReducer(s, { type: 'dateField', dateField: 'created_at' });
  s = boardReducer(s, { type: 'from', day: '2026-11-03' });
  s = boardReducer(s, { type: 'to', day: '2026-11-05' });
  assert.deepEqual(
    { status: s.status, query: s.query, groupBy: s.groupBy, dateField: s.dateField, from: s.from, to: s.to },
    { status: '완료', query: '정산', groupBy: 'category', dateField: 'created_at', from: '2026-11-03', to: '2026-11-05' },
  );
});

test('resetting the range clears both days and keeps the date basis', () => {
  let s = initialBoardState(NOW);
  s = boardReducer(s, { type: 'dateField', dateField: 'completed_at' });
  s = boardReducer(s, { type: 'from', day: '2026-11-03' });
  s = boardReducer(s, { type: 'to', day: '2026-11-05' });
  s = boardReducer(s, { type: 'resetRange' });
  assert.deepEqual([s.from, s.to, s.dateField], ['', '', 'completed_at']);
});

test('the compact switch flips every time and a group collapses and expands again', () => {
  let s = initialBoardState(NOW);
  s = boardReducer(s, { type: 'toggleCompact' });
  assert.equal(s.compact, true);
  s = boardReducer(s, { type: 'toggleCompact' });
  assert.equal(s.compact, false);
  const key = groupKey('date', '2026-11-09 (월)');
  s = boardReducer(s, { type: 'toggleGroup', key });
  assert.deepEqual(s.collapsed, [key]);
  s = boardReducer(s, { type: 'toggleGroup', key });
  assert.deepEqual(s.collapsed, []);
});

test('the completed history of a group opens on its own, apart from the collapsed state', () => {
  let s = initialBoardState(NOW);
  const a = groupKey('date', '가');
  const b = groupKey('date', '나');
  s = boardReducer(s, { type: 'toggleHistory', key: a });
  s = boardReducer(s, { type: 'toggleHistory', key: b });
  assert.deepEqual(s.historyOpen, [a, b]);
  s = boardReducer(s, { type: 'toggleHistory', key: a });
  assert.deepEqual([s.historyOpen, s.collapsed], [[b], []]);
});

test('group keys differ between groupings so a collapsed name does not carry over', () => {
  assert.notEqual(groupKey('date', '기타'), groupKey('category', '기타'));
});

test('a refresh stamps the new time and keeps the filters', () => {
  let s = initialBoardState(NOW);
  s = boardReducer(s, { type: 'query', query: 'x' });
  s = boardReducer(s, { type: 'clock', now: '2026-11-09T04:00:00.000Z' });
  assert.deepEqual([s.now, s.query], ['2026-11-09T04:00:00.000Z', 'x']);
});

test('visible groups follow the state: status and search narrow, the range keeps the days inside', () => {
  const tasks = [
    task('1', { title: '노트북 준비', status: '진행 중', requested_at: '2026-11-03T01:00:00Z' }),
    task('2', { title: '토너 교체', status: '완료', completed_at: '2026-11-05T05:00:00Z', requested_at: '2026-11-02T00:00:00Z' }),
    task('3', { title: '정산', status: '접수', requested_at: '2026-11-09T01:00:00Z' }),
  ];
  const base = initialBoardState(NOW);
  assert.equal(visibleGroups(tasks, base).length, 3);
  assert.equal(visibleGroups(tasks, boardReducer(base, { type: 'status', status: '완료' })).length, 1);
  assert.equal(visibleGroups(tasks, boardReducer(base, { type: 'query', query: '노트북' })).length, 1);
  const ranged = boardReducer(boardReducer(base, { type: 'from', day: '2026-11-03' }), { type: 'to', day: '2026-11-05' });
  assert.deepEqual(visibleGroups(tasks, ranged).map((g) => g.date), ['2026-11-05', '2026-11-03']);
});

test('an unusable start day yields no groups instead of an error', () => {
  const s = boardReducer(initialBoardState(NOW), { type: 'from', day: '2026-13-45' });
  assert.deepEqual(visibleGroups([task('1')], s), []);
});
