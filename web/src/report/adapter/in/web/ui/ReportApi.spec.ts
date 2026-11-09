import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordingClient } from '../../../../../shared/adapter/in/web/ui/testing/recordingClient.ts';
import { createReportApi } from './ReportApi.ts';
import { emptyMetrics, FakeReportApi } from './testing/fakeReportApi.ts';

test('preview puts the month in the query, list is a GET and publish POSTs the three fields', async () => {
  const client = recordingClient();
  const api = createReportApi(client);
  await api.preview('2026-11');
  await api.list();
  await api.publish({ month: '2026-11', fingerprint: 'fp', draft: '초안' });
  assert.deepEqual(client.requests, [
    { path: 'report-preview?month=2026-11', body: undefined, hasBody: false },
    { path: 'reports', body: undefined, hasBody: false },
    { path: 'reports', body: { month: '2026-11', fingerprint: 'fp', draft: '초안' }, hasBody: true },
  ]);
});

test('the fake previews an empty month unless one is seeded, and records the publish', async () => {
  const fake = new FakeReportApi();
  assert.equal((await fake.preview('2026-10')).metrics.received, 0);
  fake.previews.set('2026-11', { metrics: { ...emptyMetrics('2026-11'), received: 4 }, draft: 'd', fingerprint: 'f' });
  assert.equal((await fake.preview('2026-11')).metrics.received, 4);
  await fake.publish({ month: '2026-11', fingerprint: 'f', draft: 'd' });
  assert.deepEqual(fake.log.names(), ['preview', 'preview', 'publish']);
});
