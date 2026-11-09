import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTasksCsv, tasksCsvFilename } from './tasksCsv.ts';
import type { TaskSummary } from './RequestApi.ts';

const HEADER = '"업무","요청자","부서","접수 경로","분류","상태","요청일","등록 시각","완료 시각"';

function task(over: Record<string, unknown> = {}): TaskSummary {
  return {
    id: '1',
    title: '프린터 수리',
    requester: '홍길동',
    department: '총무팀',
    channel: '메신저',
    category: '시설·환경',
    priority: '보통',
    status: '접수',
    requested_at: '2026-11-09T09:13:07Z',
    created_at: '2026-11-09T09:14:00Z',
    updated_at: '2026-11-09T09:14:00Z',
    due_date: '',
    description: '',
    completed_at: null,
    ...over,
  } as TaskSummary;
}

test('no tasks gives the byte order mark and the header only, without a trailing line break', () => {
  assert.equal(buildTasksCsv([]), '﻿' + HEADER);
});

test('rows are CRLF separated, every cell quoted, requested_at is the KST day and the other times stay raw', () => {
  const csv = buildTasksCsv([task(), task({ title: '두번째', completed_at: '2026-11-10T01:00:00Z', status: '완료' })]);
  assert.equal(
    csv,
    '﻿' +
      HEADER +
      '\r\n"프린터 수리","홍길동","총무팀","메신저","시설·환경","접수","2026-11-09","2026-11-09T09:14:00Z",""' +
      '\r\n"두번째","홍길동","총무팀","메신저","시설·환경","완료","2026-11-09","2026-11-09T09:14:00Z","2026-11-10T01:00:00Z"',
  );
});

test('requested_at rolls into the next KST day at 15:00 UTC and is empty when unreadable', () => {
  const rows = buildTasksCsv([
    task({ requested_at: '2026-11-09T14:59:59Z' }),
    task({ requested_at: '2026-11-09T15:00:00Z' }),
    task({ requested_at: 'garbage' }),
    task({ requested_at: null }),
  ]).split('\r\n');
  const day = (row: string) => row.split(',')[6];
  assert.deepEqual(rows.slice(1).map(day), ['"2026-11-09"', '"2026-11-10"', '""', '""']);
});

test('a cell starting with = + @ or - gets a leading apostrophe inside the quotes', () => {
  for (const lead of ['=', '+', '@', '-']) {
    const csv = buildTasksCsv([task({ title: `${lead}SUM(A1)` })]);
    assert.ok(csv.includes(`"'${lead}SUM(A1)"`), `lead ${lead}`);
  }
});

test('a formula character that is not first is left alone', () => {
  const csv = buildTasksCsv([task({ title: 'a=1+2@x-y' })]);
  assert.ok(csv.includes('"a=1+2@x-y"'));
});

test('the task rule looks at the first character only: a leading space or tab is NOT guarded here', () => {
  // The improvement history export uses a different rule (/^[\s]*[=+@-]/); the two must stay separate.
  assert.ok(buildTasksCsv([task({ title: ' =1' })]).includes('" =1"'));
  assert.ok(buildTasksCsv([task({ title: '\t=1' })]).includes('"\t=1"'));
});

test('double quotes are doubled after the apostrophe guard, and commas and line breaks stay inside the quotes', () => {
  const csv = buildTasksCsv([task({ title: '=say "hi", ok\nnext' })]);
  assert.ok(csv.includes('"\'=say ""hi"", ok\nnext"'));
});

test('missing values print as empty quoted cells', () => {
  const csv = buildTasksCsv([task({ department: undefined, channel: null })]);
  assert.ok(csv.includes('"홍길동","","","시설·환경"'));
});

test('the file name carries the KST day', () => {
  assert.equal(tasksCsvFilename('2026-11-10'), '총무업무_2026-11-10.csv');
});
