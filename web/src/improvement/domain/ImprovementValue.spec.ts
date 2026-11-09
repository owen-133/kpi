// R-025
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEditableRevision, InvalidImprovementError, validateImprovement } from './ImprovementValue.ts';

const valid = { title: '기한 누락', stage: 'MVP 구축', source: '팀장 시연', feedback: '기한 확인 어려움', action: '지표 추가', result: '', status: '접수' };
const REQUIRED = '개선 제목과 피드백을 입력하세요.';
const rejected = (value: unknown, message: string) =>
  assert.throws(() => validateImprovement(value), (e) => e instanceof InvalidImprovementError && e.message === message, JSON.stringify(value)?.slice(0, 60));

test('[R-025] a valid value is trimmed, unknown keys are dropped and all seven fields are present', () => {
  const result = validateImprovement({ ...valid, title: '  저장 시험  ', unknown: '버려짐' });
  assert.deepEqual(result, { ...valid, title: '저장 시험' });
});

test('[R-025] title and feedback are required; blank counts as empty (legacy messages)', () => {
  for (const key of ['title', 'feedback']) for (const blank of ['', '   ', undefined, null, 0, false]) rejected({ ...valid, [key]: blank }, REQUIRED);
});

test('[R-025] a missing, null, text or array value reads as empty fields', () => {
  for (const value of [undefined, null, '문자열', [], 5, true]) rejected(value, REQUIRED);
});

test('[R-025] stage and status must be on their lists; each list member passes', () => {
  rejected({ ...valid, stage: '알 수 없음' }, '단계와 상태를 확인하세요.');
  rejected({ ...valid, status: '알 수 없음' }, '단계와 상태를 확인하세요.');
  for (const stage of ['MVP 구축', '본인 실사용', '정착 운영']) validateImprovement({ ...valid, stage });
  for (const status of ['접수', '개선 중']) validateImprovement({ ...valid, status });
});

test('[R-025] 검증 완료 needs a non-blank result, other statuses do not', () => {
  rejected({ ...valid, status: '검증 완료', result: '' }, '검증 완료에는 검증 결과가 필요합니다.');
  rejected({ ...valid, status: '검증 완료', result: '   ' }, '검증 완료에는 검증 결과가 필요합니다.');
  assert.equal(validateImprovement({ ...valid, status: '검증 완료', result: '확인함' }).result, '확인함');
});

test('[R-025] each field allows 5000 characters counted after trimming; 5001 fails and is checked before the other rules', () => {
  for (const key of ['title', 'stage', 'source', 'feedback', 'action', 'result', 'status']) {
    rejected({ ...valid, [key]: 'a'.repeat(5001) }, '개선 내용은 항목별 5000자 이하로 입력하세요.');
  }
  assert.equal(validateImprovement({ ...valid, action: 'a'.repeat(5000) }).action.length, 5000);
  assert.equal(validateImprovement({ ...valid, action: ` ${'a'.repeat(5000)}  ` }).action.length, 5000);
  rejected({ ...valid, action: ` ${'a'.repeat(5001)}  ` }, '개선 내용은 항목별 5000자 이하로 입력하세요.');
  rejected({ ...valid, title: '', action: 'a'.repeat(5001) }, '개선 내용은 항목별 5000자 이하로 입력하세요.');
});

test('[R-025] the revision of an existing entry must be an integer from 1: -1, 0, 1.5, "1", null and undefined fail', () => {
  assertEditableRevision(1);
  assertEditableRevision(7);
  for (const bad of [-1, 0, 1.5, '1', '0', null, undefined, Number.NaN, [1], true]) {
    assert.throws(() => assertEditableRevision(bad), (e) => e instanceof InvalidImprovementError && e.message === '개선 항목 버전을 확인하세요.', String(bad));
  }
});
