// R-011
import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesQuery } from './taskSearch.ts';
import type { BoardTask } from './BoardTask.ts';

const task: BoardTask = {
  id: 'x',
  title: 'Laptop Setup',
  requester: '김담당',
  department: '개발팀',
  description: '신규 입사 장비',
  assignee: '박지원',
  category: '비품',
  channel: '메신저',
  status: '접수',
};

test('[R-011] the query is looked up in title, requester, department, description and assignee', () => {
  for (const query of ['Laptop', '김담당', '개발팀', '입사 장비', '박지원']) {
    assert.equal(matchesQuery(task, query), true, query);
  }
});

test('[R-011] the query is case-insensitive and trimmed', () => {
  assert.equal(matchesQuery(task, 'laptop SETUP'), true);
  assert.equal(matchesQuery(task, '  laptop  '), true);
});

test('[R-011] a blank query matches every task', () => {
  assert.equal(matchesQuery(task, ''), true);
  assert.equal(matchesQuery(task, '   '), true);
  assert.equal(matchesQuery(task, undefined), true);
});

test('[R-011] category, channel and dates are not searched', () => {
  assert.equal(matchesQuery(task, '비품'), false);
  assert.equal(matchesQuery(task, '메신저'), false);
  assert.equal(matchesQuery({ ...task, requested_at: '2026-11-05T00:00:00Z' }, '2026-11-05'), false);
});

test('[R-011] missing optional fields never match and never throw', () => {
  const sparse: BoardTask = { id: 'y', title: '제목' };
  assert.equal(matchesQuery(sparse, '박지원'), false);
  assert.equal(matchesQuery(sparse, 'undefined'), false);
  assert.equal(matchesQuery(sparse, 'null'), false);
  assert.equal(matchesQuery(sparse, '제목'), true);
});

test('[R-011] regex characters in the query are plain text', () => {
  assert.equal(matchesQuery({ ...task, title: 'a.b (c)' }, '.b ('), true);
  assert.equal(matchesQuery({ ...task, title: 'axb' }, 'a.b'), false);
});
