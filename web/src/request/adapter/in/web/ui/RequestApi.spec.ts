import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordingClient } from '../../../../../shared/adapter/in/web/ui/testing/recordingClient.ts';
import { createRequestApi } from './RequestApi.ts';
import { FakeRequestApi } from './testing/fakeRequestApi.ts';
import type { TaskDetailView } from './RequestApi.ts';

const edit = {
  values: {
    title: 't', requester: 'r', department: '', channel: 'c', category: 'k', priority: 'p',
    requested_at: '2026-11-09T00:00:00.000Z', due_date: '', description: '',
  },
  reason: '정정',
  revision: 2,
};

test('every request call uses the legacy path, method and body', async () => {
  const client = recordingClient();
  const api = createRequestApi(client);
  await api.listTasks();
  await api.getTask('abc');
  await api.createTask({ title: 't', requester: 'r', requested_at: '2026-11-09T00:00:00.000Z' });
  await api.changeStatus('abc', { status: '완료', reason: '' });
  await api.addNote('abc', '메모');
  await api.editTask('abc', edit);
  await api.deleteTask('abc', '정리');
  await api.restoreTask('abc', '복원');
  await api.purgeTask('abc', '삭제', '제목');
  await api.listTrash();
  await api.lifecycleHistory();
  assert.deepEqual(client.requests, [
    { path: 'tasks', body: undefined, hasBody: false },
    { path: 'tasks/abc', body: undefined, hasBody: false },
    { path: 'tasks', body: { title: 't', requester: 'r', requested_at: '2026-11-09T00:00:00.000Z' }, hasBody: true },
    { path: 'tasks/abc/status', body: { status: '완료', reason: '' }, hasBody: true },
    { path: 'tasks/abc/notes', body: { note: '메모' }, hasBody: true },
    { path: 'tasks/abc/edit', body: edit, hasBody: true },
    { path: 'tasks/abc/delete', body: { reason: '정리' }, hasBody: true },
    { path: 'tasks/abc/restore', body: { reason: '복원', confirmation: '' }, hasBody: true },
    { path: 'tasks/abc/purge', body: { reason: '삭제', confirmation: '제목' }, hasBody: true },
    { path: 'trash', body: undefined, hasBody: false },
    { path: 'lifecycle-history', body: undefined, hasBody: false },
  ]);
});

test('the fake answers copies, records every call and fails an unknown task like the server', async () => {
  const fake = new FakeRequestApi();
  const detail = { id: 'a', title: 'x', events: [] } as unknown as TaskDetailView;
  fake.details.set('a', detail);
  const got = await fake.getTask('a');
  assert.deepEqual(got, detail);
  assert.notEqual(got, detail);
  await assert.rejects(fake.getTask('zzz'), { message: '업무를 찾을 수 없습니다.' });
  await fake.purgeTask('a', 'r', 'c');
  assert.deepEqual(fake.log.names(), ['getTask', 'getTask', 'purgeTask']);
  assert.deepEqual(fake.log.argsOf('purgeTask'), [['a', 'r', 'c']]);
});
