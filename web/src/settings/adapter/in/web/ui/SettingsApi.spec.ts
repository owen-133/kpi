import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordingClient } from '../../../../../shared/adapter/in/web/ui/testing/recordingClient.ts';
import { createSettingsApi } from './SettingsApi.ts';
import { FakeSettingsApi } from './testing/fakeSettingsApi.ts';

test('get and history are GETs; save POSTs values with the revision under the same path as get', async () => {
  const client = recordingClient();
  const api = createSettingsApi(client);
  await api.get();
  await api.history();
  await api.save({ values: { showBanner: false }, revision: 3 });
  assert.deepEqual(client.requests, [
    { path: 'settings', body: undefined, hasBody: false },
    { path: 'settings/history', body: undefined, hasBody: false },
    { path: 'settings', body: { values: { showBanner: false }, revision: 3 }, hasBody: true },
  ]);
});

test('the fake keeps what was saved with the next revision, and a queued failure keeps the stored settings', async () => {
  const fake = new FakeSettingsApi();
  fake.log.failNext('save', '다른 화면에서 설정이 바뀌었습니다.');
  await assert.rejects(fake.save({ values: { a: 1 }, revision: 0 }), { message: '다른 화면에서 설정이 바뀌었습니다.' });
  assert.deepEqual((await fake.get()).values, {});
  const saved = await fake.save({ values: { a: 1 }, revision: 0 });
  assert.equal(saved.revision, 1);
  assert.deepEqual((await fake.get()).values, { a: 1 });
  assert.deepEqual(fake.log.names(), ['save', 'get', 'save', 'get']);
});
