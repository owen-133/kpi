// R-011
import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUS_ORDER, compareStatus, statusRank, taskState } from './taskStatus.ts';

test('[R-011] 완료 task is idle', () => {
  assert.equal(taskState('완료'), 'idle');
});

test('[R-011] each known status has its own state and the order is 접수, 진행 중, 대기, 완료', () => {
  assert.deepEqual([...STATUS_ORDER], ['접수', '진행 중', '대기', '완료']);
  assert.deepEqual(STATUS_ORDER.map(taskState), ['waiting', 'working', 'blocked', 'idle']);
  assert.deepEqual(STATUS_ORDER.map(statusRank), [0, 1, 2, 3]);
});

test('[R-011] an unknown, empty or missing status sorts after 완료 and counts as idle', () => {
  for (const status of ['처리불가', '', undefined, null]) {
    assert.equal(statusRank(status), 4, `rank of ${String(status)}`);
    assert.equal(taskState(status), 'idle');
  }
  assert.ok(compareStatus('완료', '처리불가') < 0);
  assert.equal(compareStatus('처리불가', '??'), 0);
});

test('[R-011] compareStatus puts 접수 before 진행 중 and equal statuses tie', () => {
  assert.ok(compareStatus('접수', '진행 중') < 0);
  assert.ok(compareStatus('대기', '접수') > 0);
  assert.equal(compareStatus('대기', '대기'), 0);
});

test('[R-011] status names are matched exactly, not by prefix or case', () => {
  assert.equal(statusRank('진행중'), 4);
  assert.equal(statusRank(' 접수'), 4);
});
