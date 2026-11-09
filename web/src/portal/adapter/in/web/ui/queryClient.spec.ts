import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notifyManager } from '@tanstack/react-query';
import { createQueryClient } from './queryClient.ts';
import { queryKeys } from './queryKeys.ts';

test('query defaults are the D7 ones: never stale, no retry, no automatic refetch of any kind', () => {
  const q = createQueryClient().getDefaultOptions().queries;
  assert.equal(q?.staleTime, Infinity);
  assert.equal(q?.retry, false);
  assert.equal(q?.refetchOnWindowFocus, false);
  assert.equal(q?.refetchOnReconnect, false);
  assert.equal(q?.refetchOnMount, false);
  assert.equal(q?.refetchInterval, false);
});

test('screen-bound reads are dropped when the screen unmounts (gcTime 0)', () => {
  assert.equal(createQueryClient().getDefaultOptions().queries?.gcTime, 0);
});

test('session, settings and tasks live as long as the app', () => {
  const client = createQueryClient();
  for (const key of [queryKeys.session, queryKeys.settings, queryKeys.tasks]) {
    assert.equal(client.getQueryDefaults(key).gcTime, Infinity);
  }
  assert.equal(client.getQueryDefaults(queryKeys.trash).gcTime, undefined);
});

test('writes do not retry', () => {
  assert.equal(createQueryClient().getDefaultOptions().mutations?.retry, false);
});

test('every call returns a fresh client with an empty cache', () => {
  const a = createQueryClient();
  a.setQueryData(queryKeys.tasks, [1]);
  assert.equal(createQueryClient().getQueryData(queryKeys.tasks), undefined);
  assert.notEqual(a, createQueryClient());
});

test('observers are notified from the microtask queue, so a screen follows an answer while page timers are frozen', async () => {
  createQueryClient();
  let notified = false;
  notifyManager.schedule(() => {
    notified = true;
  });
  await Promise.resolve();
  assert.equal(notified, true, 'no setTimeout(0) between an answer and the redraw');
});
