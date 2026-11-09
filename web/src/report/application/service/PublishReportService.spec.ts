// R-023
import test from 'node:test';
import assert from 'node:assert/strict';
import { PreviewReportService } from './PreviewReportService.ts';
import { PublishReportService } from './PublishReportService.ts';
import { StaleFingerprintError } from '../port/in/StaleFingerprintError.ts';
import { DraftTooLongError, FutureMonthError, InvalidMonthError } from '../../domain/ReportErrors.ts';
import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import { FakeOrbit, FixedRuntime } from '../../testing/fakes.ts';

const NOW = '2026-11-09T01:00:00.000Z';

async function given(now = NOW) {
  const orbit = new FakeOrbit();
  orbit.tasks = [{ id: 't1', requested_at: '2026-11-03T01:00:00Z', status: '접수', category: '일반 총무' }];
  const runtime = new FixedRuntime(now);
  const preview = new PreviewReportService(async () => orbit, runtime);
  const publish = new PublishReportService(async () => orbit, runtime);
  const { fingerprint } = await preview.preview('2026-11');
  return { orbit, runtime, preview, publish, fingerprint };
}

test('Given a fresh fingerprint, When publishing the current month, Then the trimmed draft, metrics and method are saved', async () => {
  const { orbit, publish, fingerprint } = await given();
  const result = await publish.publish({ month: '2026-11', fingerprint, draft: '  검토한 문안  ' });
  assert.deepEqual(result, { id: 'new-report' });
  const [saved] = orbit.saved();
  assert.equal(saved.name, 'orbit_kpi');
  const payload = saved.args.payload as { month: string; value: { draft: string; method: string; metrics: { month: string; received: number } } };
  assert.equal(payload.month, '2026-11');
  assert.equal(payload.value.draft, '검토한 문안');
  assert.equal(payload.value.method, '담당자 검토 발행 · 규칙 기반 집계');
  assert.equal(payload.value.metrics.month, '2026-11');
  assert.equal(payload.value.metrics.received, 1);
});

test('Given a previous month, When publishing, Then it is saved (the future-month rule is the pair)', async () => {
  const { orbit, publish, fingerprint } = await given();
  await publish.publish({ month: '2026-10', fingerprint, draft: 'x' });
  assert.equal(orbit.saved().length, 1);
});

test('Given a wrong or missing fingerprint, When publishing a future or malformed month, Then 409 comes first and nothing is saved', async () => {
  const { orbit, publish } = await given();
  for (const command of [
    { month: '2026-12', fingerprint: '0'.repeat(64), draft: 'x' },
    { month: '2026-13', fingerprint: '0'.repeat(64), draft: 'x' },
    { month: '', fingerprint: undefined, draft: 'x' },
    { month: '2026-11', fingerprint: undefined, draft: 'x' },
  ]) {
    await assert.rejects(publish.publish(command), (e) => e instanceof StaleFingerprintError && e.message === '집계 후 업무가 변경됐습니다. 새로 집계하고 발행하세요.');
  }
  assert.equal(orbit.saved().length, 0);
});

test('Given a fresh fingerprint, When the month is malformed, empty or absent, Then InvalidMonthError and nothing is saved', async () => {
  const { orbit, publish, fingerprint } = await given();
  for (const month of ['2026-13', '', undefined, null, 202611, '2026-1']) {
    await assert.rejects(publish.publish({ month, fingerprint, draft: 'x' }), InvalidMonthError, String(month));
  }
  assert.equal(orbit.saved().length, 0);
});

test('Given a fresh fingerprint, When publishing next month or 9999-12, Then FutureMonthError and nothing is saved', async () => {
  const { orbit, publish, fingerprint } = await given();
  for (const month of ['2026-12', '2027-01', '9999-12']) await assert.rejects(publish.publish({ month, fingerprint, draft: 'x' }), FutureMonthError, month);
  assert.equal(orbit.saved().length, 0);
});

test('Given the draft limit, When 20000 and 20001 characters are published, Then 20000 is saved and 20001 is refused', async () => {
  const { orbit, publish, fingerprint } = await given();
  await publish.publish({ month: '2026-11', fingerprint, draft: '가'.repeat(20000) });
  await assert.rejects(publish.publish({ month: '2026-11', fingerprint, draft: '가'.repeat(20001) }), DraftTooLongError);
  assert.equal(orbit.saved().length, 1);
});

test('Given no draft, When publishing, Then the rule-based draft is saved; given blanks only, Then an empty text is saved', async () => {
  const { orbit, publish, fingerprint } = await given();
  await publish.publish({ month: '2026-11', fingerprint, draft: undefined });
  await publish.publish({ month: '2026-11', fingerprint, draft: '   ' });
  const drafts = orbit.saved().map((c) => (c.args.payload as { value: { draft: string } }).value.draft);
  assert.ok(drafts[0].startsWith('2026-11 총무 업무 처리현황'));
  assert.equal(drafts[1], '');
});

test('Given the same month, When published twice, Then two saves are made (the database stacks them)', async () => {
  const { orbit, publish, fingerprint } = await given();
  await publish.publish({ month: '2026-11', fingerprint, draft: '첫 판' });
  await publish.publish({ month: '2026-11', fingerprint, draft: '둘째 판' });
  assert.equal(orbit.saved().length, 2);
});

test('Given a fingerprint taken before KST midnight, When publishing after it, Then it is stale; before it, still fresh', async () => {
  const { orbit, runtime, publish, fingerprint } = await given('2026-11-09T14:59:59.999Z');
  await publish.publish({ month: '2026-11', fingerprint, draft: 'x' });
  runtime.now = '2026-11-09T15:00:00.000Z';
  await assert.rejects(publish.publish({ month: '2026-11', fingerprint, draft: 'x' }), StaleFingerprintError);
  assert.equal(orbit.saved().length, 1);
});

test('Given a task changed after the preview, When publishing the old fingerprint, Then it is stale', async () => {
  const { orbit, publish, fingerprint } = await given();
  orbit.tasks = [{ id: 't1', requested_at: '2026-11-03T01:00:00Z', status: '완료', category: '일반 총무' }];
  await assert.rejects(publish.publish({ month: '2026-11', fingerprint, draft: 'x' }), StaleFingerprintError);
});

test('Given extras rows, When the snapshot is read, Then the extras win and a test task is left out of the figures', async () => {
  const { orbit, preview } = await given();
  orbit.extras = [{ task_id: 't1', is_test: true, assignee: 'a' }];
  const result = await preview.preview('2026-11');
  assert.equal(result.metrics.received, 0);
  assert.equal(result.metrics.excludedTests, 1);
});

test('Given the database fails while saving, When publishing, Then the error reaches the caller unchanged', async () => {
  const { orbit, publish, fingerprint } = await given();
  orbit.failWith = new OrbitFunctionError('boom', '08006');
  await assert.rejects(publish.publish({ month: '2026-11', fingerprint, draft: 'x' }), (e) => e === orbit.failWith);
});

test('Given a month query, When absent or malformed, Then the preview throws InvalidMonthError; a future month previews', async () => {
  const { preview } = await given();
  await assert.rejects(preview.preview(null), InvalidMonthError);
  await assert.rejects(preview.preview('2026-1x'), InvalidMonthError);
  assert.equal((await preview.preview('9999-12')).metrics.received, 0);
});
