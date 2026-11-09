import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordingClient } from '../../../../../shared/adapter/in/web/ui/testing/recordingClient.ts';
import { createPortalApi } from './PortalApi.ts';
import { FakePortalApi } from './testing/fakePortalApi.ts';

test('session asks GET session', async () => {
  const client = recordingClient(() => ({ role: 'viewer', shared: false }));
  assert.deepEqual(await createPortalApi(client).session(), { role: 'viewer', shared: false });
  assert.deepEqual(client.requests, [{ path: 'session', body: undefined, hasBody: false }]);
});

test('the fake records the call and answers a copy of its session', async () => {
  const fake = new FakePortalApi();
  fake.sessionView = { role: 'viewer', shared: true };
  const a = await fake.session();
  assert.deepEqual(a, { role: 'viewer', shared: true });
  assert.notEqual(a, fake.sessionView);
  assert.deepEqual(fake.log.names(), ['session']);
});
