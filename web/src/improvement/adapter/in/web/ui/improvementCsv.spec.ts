import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IMPROVEMENT_CSV_FILENAME, improvementCsv, improvementCsvCell } from './improvementCsv.ts';
import type { ImprovementItem } from './ImprovementApi.ts';

const item = (over: Partial<ImprovementItem> = {}): ImprovementItem => ({
  id: 'i1',
  title: '제목',
  stage: 'MVP 구축',
  source: '',
  feedback: '피드백',
  action: '조치',
  result: '결과',
  status: '검증 완료',
  revision: 3,
  created_at: '2026-11-09T03:00:00.000Z',
  updated_at: '2026-11-09T04:00:00.000Z',
  ...over,
});

test('the file is named like the legacy download', () => {
  assert.equal(IMPROVEMENT_CSV_FILENAME, '개선이력관리대장.csv');
});

test('without records only the quoted header row is written', () => {
  assert.equal(improvementCsv([]), '"제목","단계","출처","피드백","개선내용","검증결과","상태","등록","수정","버전"');
});

test('rows follow the header column order, every cell quoted, joined by CRLF, empty text kept as an empty cell', () => {
  const csv = improvementCsv([item(), item({ title: '둘째', revision: 1 })]);
  assert.deepEqual(csv.split('\r\n').slice(1), [
    '"제목","MVP 구축","","피드백","조치","결과","검증 완료","2026-11-09T03:00:00.000Z","2026-11-09T04:00:00.000Z","3"',
    '"둘째","MVP 구축","","피드백","조치","결과","검증 완료","2026-11-09T03:00:00.000Z","2026-11-09T04:00:00.000Z","1"',
  ]);
});

test('a null or undefined cell is empty', () => {
  assert.equal(improvementCsvCell(null), '""');
  assert.equal(improvementCsvCell(undefined), '""');
});

test('quotes are doubled', () => {
  assert.equal(improvementCsvCell('a"b'), '"a""b"');
});

// The improvement rule also guards a formula start behind leading whitespace; the task CSV rule does not (UI-DESIGN D13).
for (const lead of ['=', '+', '@', '-']) {
  test(`a cell starting with ${lead} gets an apostrophe in front`, () => {
    assert.equal(improvementCsvCell(lead + 'SUM(A1)'), `"'${lead}SUM(A1)"`);
  });
  test(`a cell starting with spaces then ${lead} gets an apostrophe in front of the whitespace`, () => {
    assert.equal(improvementCsvCell('  \t' + lead + 'x'), `"'  \t${lead}x"`);
  });
}

test('text that only contains a formula character later or plain text is left alone', () => {
  assert.equal(improvementCsvCell('a=b'), '"a=b"');
  assert.equal(improvementCsvCell('  hello'), '"  hello"');
  assert.equal(improvementCsvCell('가-나'), '"가-나"');
});

test('a quote inside a guarded cell is doubled after the apostrophe is put in front', () => {
  assert.equal(improvementCsvCell('=A"B'), `"'=A""B"`);
});

test('a number such as the revision is written as text', () => {
  assert.equal(improvementCsvCell(12), '"12"');
});
