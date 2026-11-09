import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordingClient } from '../../../../../shared/adapter/in/web/ui/testing/recordingClient.ts';
import { createAttachmentApi } from './AttachmentApi.ts';
import { FakeAttachmentApi } from './testing/fakeAttachmentApi.ts';

test('upload POSTs name and content; remove POSTs an empty object so it is not read as a GET', async () => {
  const client = recordingClient();
  const api = createAttachmentApi(client);
  await api.upload('t1', { name: '견적.pdf', content: 'QUJD' });
  await api.remove('t1', 'f9');
  assert.deepEqual(client.requests, [
    { path: 'tasks/t1/files', body: { name: '견적.pdf', content: 'QUJD' }, hasBody: true },
    { path: 'tasks/t1/files/f9', body: {}, hasBody: true },
  ]);
});

test('the download link is the plain /api path and asks nothing of the server', () => {
  const client = recordingClient();
  assert.equal(createAttachmentApi(client).downloadUrl('t1', 'f9'), '/api/tasks/t1/files/f9');
  assert.equal(client.requests.length, 0);
  assert.equal(new FakeAttachmentApi().downloadUrl('t1', 'f9'), '/api/tasks/t1/files/f9');
});

test('the fake hands out the configured file id and records the upload', async () => {
  const fake = new FakeAttachmentApi();
  fake.nextFileId = 'f1';
  assert.deepEqual(await fake.upload('t', { name: 'a', content: 'b' }), { id: 'f1' });
  assert.deepEqual(fake.log.argsOf('upload'), [['t', { name: 'a', content: 'b' }]]);
});
