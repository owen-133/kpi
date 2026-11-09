import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ASSIGNEE_MAX_LENGTH, ASSIGNEE_RANGE_MESSAGE, AssigneeName, InvalidAssigneeError } from './AssigneeName.ts';

describe('AssigneeName [R-020]', () => {
  it('keeps the trimmed text of a name of 1, 99 and 100 characters', () => {
    for (const length of [1, 99, ASSIGNEE_MAX_LENGTH]) {
      assert.equal(AssigneeName.from('가'.repeat(length)).value, '가'.repeat(length), `length ${length}`);
    }
  });

  it('rejects an empty name and a name of 101 characters with the range message', () => {
    for (const raw of ['', '가'.repeat(ASSIGNEE_MAX_LENGTH + 1)]) {
      assert.throws(() => AssigneeName.from(raw), (e: unknown) => e instanceof InvalidAssigneeError && e.message === ASSIGNEE_RANGE_MESSAGE);
    }
    assert.equal(ASSIGNEE_RANGE_MESSAGE, '담당자를 1~100자로 입력하세요.');
  });

  it('trims before counting: whitespace-only is empty, 100 characters padded with blanks is accepted, 101 padded is rejected', () => {
    for (const blank of ['   ', '\n\t ', ' ', '﻿']) {
      assert.throws(() => AssigneeName.from(blank), InvalidAssigneeError, JSON.stringify(blank));
    }
    assert.equal(AssigneeName.from('  ' + '나'.repeat(100) + '  ').value, '나'.repeat(100));
    assert.throws(() => AssigneeName.from(' ' + '나'.repeat(101) + ' '), InvalidAssigneeError);
    assert.equal(AssigneeName.from('  김담당 ').value, '김담당');
  });

  it('counts UTF-16 units: 50 emoji (100 units) are accepted and 51 are rejected', () => {
    assert.equal(AssigneeName.from('😀'.repeat(50)).value.length, 100);
    assert.throws(() => AssigneeName.from('😀'.repeat(51)), InvalidAssigneeError);
  });

  it('treats a missing, null or falsy value as empty and turns a number into its text', () => {
    for (const raw of [undefined, null, false, 0]) assert.throws(() => AssigneeName.from(raw), InvalidAssigneeError, String(raw));
    assert.equal(AssigneeName.from(12345).value, '12345');
    assert.equal(AssigneeName.from(true).value, 'true');
  });
});
