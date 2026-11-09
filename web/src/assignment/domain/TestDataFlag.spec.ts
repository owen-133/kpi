import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidTestDataFlagError, TEST_DATA_FLAG_MESSAGE, parseTestDataFlag } from './TestDataFlag.ts';

describe('TestDataFlag [R-021]', () => {
  it('accepts exactly the two booleans', () => {
    assert.equal(parseTestDataFlag(true), true);
    assert.equal(parseTestDataFlag(false), false);
  });

  it('rejects every non-boolean with the check message', () => {
    for (const raw of [undefined, null, 'true', 'false', 1, 0, [true], {}]) {
      assert.throws(() => parseTestDataFlag(raw), (e: unknown) => e instanceof InvalidTestDataFlagError && e.message === TEST_DATA_FLAG_MESSAGE, JSON.stringify(raw));
    }
    assert.equal(TEST_DATA_FLAG_MESSAGE, '데이터 구분을 확인하세요.');
  });
});
