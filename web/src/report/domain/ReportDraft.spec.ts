// R-023
import test from 'node:test';
import assert from 'node:assert/strict';
import { REPORT_DRAFT_LIMIT, resolveReportDraft } from './ReportDraft.ts';
import { DraftTooLongError } from './ReportErrors.ts';

const fallback = () => 'RULE';

test('[R-023] the limit is 20000 after trimming: 20000 passes, 20001 fails with the legacy message', () => {
  assert.equal(REPORT_DRAFT_LIMIT, 20000);
  assert.equal(resolveReportDraft('가'.repeat(20000), fallback).length, 20000);
  assert.throws(() => resolveReportDraft('가'.repeat(20001), fallback), (e) => e instanceof DraftTooLongError && e.message === '보고서는 20000자 이하로 입력하세요.');
});

test('[R-023] surrounding blanks are removed before counting (20003 characters with blanks pass)', () => {
  assert.equal(resolveReportDraft(` ${'가'.repeat(20000)}  `, fallback).length, 20000);
  assert.throws(() => resolveReportDraft(` ${'가'.repeat(20001)} `, fallback), DraftTooLongError);
});

test('[R-023] a missing, empty, null or zero draft falls back to the rule-based text', () => {
  for (const given of [undefined, null, '', 0, false]) assert.equal(resolveReportDraft(given, fallback), 'RULE');
});

test('[R-023] a whitespace-only draft is truthy, so it is published as an empty text (observed legacy behavior)', () => {
  assert.equal(resolveReportDraft('   ', fallback), '');
  assert.equal(resolveReportDraft('\n\t', fallback), '');
});

test('[R-023] a non-text draft is converted with String()', () => {
  assert.equal(resolveReportDraft(12 as unknown, fallback), '12');
  assert.equal(resolveReportDraft(['a', 'b'], fallback), 'a,b');
});

test('[R-023] the limit counts UTF-16 code units: 10001 emoji are 20002 units and fail', () => {
  assert.equal(resolveReportDraft('😀'.repeat(10000), fallback).length, 20000);
  assert.throws(() => resolveReportDraft('😀'.repeat(10001), fallback), DraftTooLongError);
});

test('[R-023] the rule-based text is not built when a draft is given', () => {
  let built = 0;
  resolveReportDraft('given', () => {
    built += 1;
    return 'x';
  });
  assert.equal(built, 0);
});
