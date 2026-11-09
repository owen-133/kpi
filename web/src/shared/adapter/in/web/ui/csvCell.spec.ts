import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvCell } from './csvCell.ts';

test('a null or undefined cell is an empty quoted cell', () => {
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
});

test('quotes are doubled and other text is quoted as is', () => {
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell('a,b\nc'), '"a,b\nc"');
  assert.equal(csvCell(12), '"12"');
});

for (const lead of ['=', '+', '@', '-']) {
  test(`a cell starting with ${lead} gets an apostrophe in front`, () => {
    assert.equal(csvCell(lead + 'SUM(A1)'), `"'${lead}SUM(A1)"`);
  });
}

// must-reject: whitespace in front of the formula character does not hide it
const PREFIXES: Array<[string, string]> = [
  ['a space', ' '],
  ['a tab', '\t'],
  ['CR and LF', '\r\n'],
  ['a no-break space', ' '],
  ['an ideographic space', '　'],
  ['a line separator', ' '],
  ['a mix of spaces', '  \t\r\n '],
];
for (const [name, prefix] of PREFIXES) {
  test(`a formula after ${name} gets the apostrophe in front of the whitespace`, () => {
    assert.equal(csvCell(prefix + '=1+1'), `"'${prefix}=1+1"`);
    assert.equal(csvCell(prefix + '-1'), `"'${prefix}-1"`);
  });
}

// must-allow: text that is not a formula stays as typed
test('whitespace without a formula character, and formula characters that are not first, are left alone', () => {
  assert.equal(csvCell('  hello'), '"  hello"');
  assert.equal(csvCell('\t\r\n'), '"\t\r\n"');
  assert.equal(csvCell('a=b'), '"a=b"');
  assert.equal(csvCell('가-나'), '"가-나"');
  assert.equal(csvCell(' a=1'), '" a=1"');
});

test('quotes are doubled after the apostrophe guard', () => {
  assert.equal(csvCell('=A"B'), `"'=A""B"`);
});
