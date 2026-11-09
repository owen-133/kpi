import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordingClient } from '../../../../../shared/adapter/in/web/ui/testing/recordingClient.ts';
import { createImprovementApi } from './ImprovementApi.ts';
import { FakeImprovementApi } from './testing/fakeImprovementApi.ts';

test('list, history and save use the legacy paths and bodies', async () => {
  const client = recordingClient();
  const api = createImprovementApi(client);
  await api.list();
  await api.history('i1');
  await api.save({ id: 'i1', revision: 2, value: { title: 't' } });
  assert.deepEqual(client.requests, [
    { path: 'improvements', body: undefined, hasBody: false },
    { path: 'improvements/i1/history', body: undefined, hasBody: false },
    { path: 'improvements', body: { id: 'i1', revision: 2, value: { title: 't' } }, hasBody: true },
  ]);
});

test('a new entry sends no id or revision key once serialized', async () => {
  const client = recordingClient();
  await createImprovementApi(client).save({ value: { title: 't' } });
  assert.equal(JSON.stringify(client.requests[0].body), '{"value":{"title":"t"}}');
});

test('the fake keeps the id of an edit, hands out a new one for a new entry and answers no history for an unknown id', async () => {
  const fake = new FakeImprovementApi();
  assert.deepEqual(await fake.save({ id: 'i1', revision: 1, value: {} }), { id: 'i1' });
  assert.deepEqual(await fake.save({ value: {} }), { id: 'new-improvement' });
  assert.deepEqual(await fake.history('none'), []);
});
