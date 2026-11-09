import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Sha256SecretComparator } from './Sha256SecretComparator.ts';

describe('Sha256SecretComparator', () => {
  const comparator = new Sha256SecretComparator();
  it('compares equal and different secrets, also with different lengths and non-ASCII text', () => {
    assert.equal(comparator.equal('비밀-1', '비밀-1'), true);
    assert.equal(comparator.equal('abc', 'abcd'), false);
    assert.equal(comparator.equal('', ''), true);
    assert.equal(comparator.equal('a'.repeat(5000), 'a'), false);
  });
});
