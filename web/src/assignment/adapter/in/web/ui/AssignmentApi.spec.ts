import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordingClient } from '../../../../../shared/adapter/in/web/ui/testing/recordingClient.ts';
import { createAssignmentApi } from './AssignmentApi.ts';
import { FakeAssignmentApi } from './testing/fakeAssignmentApi.ts';

test('assign and test-data POST the legacy bodies, including a false test flag', async () => {
  const client = recordingClient();
  const api = createAssignmentApi(client);
  await api.assign('t1', '김총무');
  await api.markTestData('t1', true);
  await api.markTestData('t1', false);
  assert.deepEqual(client.requests, [
    { path: 'tasks/t1/assign', body: { assignee: '김총무' }, hasBody: true },
    { path: 'tasks/t1/test-data', body: { is_test: true }, hasBody: true },
    { path: 'tasks/t1/test-data', body: { is_test: false }, hasBody: true },
  ]);
});

test('the fake records arguments in order', async () => {
  const fake = new FakeAssignmentApi();
  await fake.assign('t', 'a');
  await fake.markTestData('t', false);
  assert.deepEqual(fake.log.calls, [
    { method: 'assign', args: ['t', 'a'] },
    { method: 'markTestData', args: ['t', false] },
  ]);
});
