import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completionPercent, eventText, formatDateTime, formatFileSize, formatHours, formatPercent, formatWhen, todayKst } from './format.ts';

test('formatDateTime shows the KST minute in ko-KR style and a dash for a missing value', () => {
  assert.equal(formatDateTime('2026-11-09T09:13:00Z'), '2026. 11. 09. 오후 06:13');
  assert.equal(formatDateTime(''), '—');
  assert.equal(formatDateTime(null), '—');
  assert.equal(formatDateTime(undefined), '—');
});

test('formatDateTime rolls to the next KST day at 15:00 UTC', () => {
  assert.equal(formatDateTime('2026-11-09T14:59:00Z'), '2026. 11. 09. 오후 11:59');
  assert.equal(formatDateTime('2026-11-09T15:00:00Z'), '2026. 11. 10. 오전 12:00');
});

test('formatDateTime keeps the legacy output for text the Date constructor cannot read', () => {
  assert.equal(formatDateTime('not a date'), 'Invalid Date');
});

test('formatWhen shows the KST date with seconds', () => {
  assert.equal(formatWhen('2026-11-09T09:13:07Z'), '2026. 11. 9. 오후 6:13:07');
  assert.equal(formatWhen('2026-12-31T15:00:00Z'), '2027. 1. 1. 오전 12:00:00');
});

test('todayKst is the KST calendar day, rolling over at 15:00 UTC', () => {
  assert.equal(todayKst(new Date('2026-11-09T14:59:59.999Z')), '2026-11-09');
  assert.equal(todayKst(new Date('2026-11-09T15:00:00.000Z')), '2026-11-10');
  assert.equal(todayKst(new Date('2026-12-31T15:00:00Z')), '2027-01-01');
  assert.equal(todayKst(new Date('2026-02-28T15:00:00Z')), '2026-03-01');
  assert.equal(todayKst(new Date('2024-02-28T15:00:00Z')), '2024-02-29');
});

test('formatPercent and formatHours print a dash for no data and keep zero', () => {
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent(0), '0%');
  assert.equal(formatPercent(66.7), '66.7%');
  assert.equal(formatHours(null), '—');
  assert.equal(formatHours(0), '0.0시간');
  assert.equal(formatHours(2.25), '2.3시간');
  assert.equal(formatHours(12.04), '12.0시간');
});

test('formatFileSize rounds up to whole kilobytes', () => {
  assert.equal(formatFileSize(1), '1KB');
  assert.equal(formatFileSize(1024), '1KB');
  assert.equal(formatFileSize(1025), '2KB');
  assert.equal(formatFileSize(1048576), '1024KB');
});

test('completionPercent counts real tasks only and rounds at the half', () => {
  assert.equal(completionPercent([]), 0);
  assert.equal(completionPercent([{ status: '완료', is_test: true }]), 0);
  assert.equal(completionPercent([{ status: '완료' }, { status: '접수' }]), 50);
  assert.equal(completionPercent([{ status: '완료' }, { status: '접수' }, { status: '접수' }]), 33);
  assert.equal(completionPercent([{ status: '완료' }, { status: '완료' }, { status: '접수' }]), 67);
  assert.equal(completionPercent([{ status: '완료' }, { status: '접수', is_test: true }]), 100);
  // 1 of 8 = 12.5 -> 13 (Math.round rounds the half up)
  assert.equal(completionPercent([{ status: '완료' }, ...Array.from({ length: 7 }, () => ({ status: '접수' }))]), 13);
});

test('eventText: a registration event has a fixed sentence and ignores its detail', () => {
  assert.equal(eventText({ kind: '등록', detail: 'whatever' }), '업무가 접수되었습니다.');
});

test('eventText: other kinds show their detail as is', () => {
  assert.equal(eventText({ kind: '메모', detail: '처리 완료' }), '처리 완료');
  assert.equal(eventText({ kind: '상태 변경', detail: '접수 → 진행 중' }), '접수 → 진행 중');
});

test('eventText: an edit event lists the reason and each change with Korean field names', () => {
  const detail = JSON.stringify({
    reason: '오기 정정',
    changes: {
      title: { before: 'A', after: 'B' },
      due_date: { before: '', after: '2026-11-30' },
      requested_at: { before: '2026-11-09T09:13:07Z', after: '2026-11-10T15:00:00Z' },
      unknown_key: { before: null, after: 'x' },
    },
  });
  assert.equal(
    eventText({ kind: '업무 정보 수정', detail }),
    '수정 사유: 오기 정정\n' +
      '업무명: A → B\n' +
      '처리 기한: 미지정 → 2026-11-30\n' +
      '요청받은 시각: 2026. 11. 9. 오후 6:13:07 → 2026. 11. 11. 오전 12:00:00\n' +
      'unknown_key: 미지정 → x',
  );
});

test('eventText: an edit event whose detail is not the expected JSON falls back to the raw detail', () => {
  assert.equal(eventText({ kind: '업무 정보 수정', detail: '{broken' }), '{broken');
  assert.equal(eventText({ kind: '업무 정보 수정', detail: '{"reason":"x"}' }), '{"reason":"x"}');
  assert.equal(eventText({ kind: '업무 정보 수정', detail: 'null' }), 'null');
});
