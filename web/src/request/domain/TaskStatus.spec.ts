// R-002 R-003
import test from 'node:test';
import assert from 'node:assert/strict';
import { TASK_STATUSES, isReopening, isTaskStatus } from './TaskStatus.ts';

test('the four legacy statuses are listed in board order', () => {
  assert.deepEqual([...TASK_STATUSES], ['접수', '진행 중', '대기', '완료']);
});

test('isTaskStatus accepts exactly the listed texts and nothing else', () => {
  for (const status of TASK_STATUSES) assert.equal(isTaskStatus(status), true, status);
  for (const bad of ['없는상태', '', ' 완료', '완료 ', '진행중', undefined, null, 0, ['완료'], { 0: '완료' }]) {
    assert.equal(isTaskStatus(bad), false, String(bad));
  }
});

test('reopening is leaving 완료 for another status', () => {
  assert.equal(isReopening('완료', '진행 중'), true);
  assert.equal(isReopening('완료', '대기'), true);
  assert.equal(isReopening('완료', '접수'), true);
});

test('staying on 완료, finishing a task and moving between open statuses are not reopening', () => {
  assert.equal(isReopening('완료', '완료'), false);
  assert.equal(isReopening('진행 중', '완료'), false);
  assert.equal(isReopening('접수', '진행 중'), false);
  assert.equal(isReopening('대기', '진행 중'), false);
});
