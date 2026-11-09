import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IMPROVEMENT_CSV_FILENAME, improvementCsv } from './improvementCsv.ts';
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

// The cell rule itself (quotes, null, every lead character, whitespace prefixes) is specified in shared/adapter/in/web/ui/csvCell.spec.ts.
test('the ledger guards a formula start in every text column, also behind whitespace, and writes the revision as text', () => {
  const csv = improvementCsv([item({ title: '=1+1', feedback: ' @x', action: '\t-1', result: 'a"b', revision: 12 })]);
  assert.equal(csv.split('\r\n')[1].split(',').slice(0, 7).join(','), `"'=1+1","MVP 구축","",\"' @x\",\"'\t-1\","a""b","검증 완료"`);
  assert.ok(csv.endsWith(',"12"'));
});
