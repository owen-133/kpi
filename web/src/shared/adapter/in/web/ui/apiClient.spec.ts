import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiClient } from './apiClient.ts';

type Seen = { url: string; init: RequestInit | undefined };

function setup(respond: () => Response | Promise<Response>) {
  const seen: Seen[] = [];
  let reloads = 0;
  const fetchFake = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), init });
    return respond();
  }) as typeof fetch;
  const client = createApiClient({ fetch: fetchFake, reload: () => { reloads += 1; } });
  return { client, seen, reloads: () => reloads };
}

const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });

test('a call without a body is a plain GET under /api/ and returns the parsed JSON', async () => {
  const t = setup(() => json(200, [{ id: 'a' }]));
  assert.deepEqual(await t.client.request('tasks'), [{ id: 'a' }]);
  assert.equal(t.seen[0].url, '/api/tasks');
  assert.deepEqual(t.seen[0].init, {});
});

test('a truthy body is POSTed as JSON with the legacy content type', async () => {
  const t = setup(() => json(201, { id: 'x' }));
  await t.client.request('tasks', { title: '한글' });
  assert.equal(t.seen[0].url, '/api/tasks');
  assert.deepEqual(t.seen[0].init, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '한글' }),
  });
});

test('an empty object body still POSTs because {} is truthy', async () => {
  const t = setup(() => json(200, { ok: true }));
  await t.client.request('tasks/1/files/2', {});
  assert.equal(t.seen[0].init?.method, 'POST');
  assert.equal(t.seen[0].init?.body, '{}');
});

for (const falsy of [undefined, null, '', 0, false]) {
  test(`a falsy body (${JSON.stringify(falsy) ?? 'undefined'}) stays a GET`, async () => {
    const t = setup(() => json(200, {}));
    await t.client.request('settings', falsy);
    assert.deepEqual(t.seen[0].init, {});
  });
}

test('a 401 reloads the page once and throws the login message without reading the body', async () => {
  const t = setup(() => new Response('<html>not json</html>', { status: 401 }));
  await assert.rejects(t.client.request('tasks'), { message: '로그인이 필요합니다.' });
  assert.equal(t.reloads(), 1);
});

test('a failed answer throws the server error message', async () => {
  const t = setup(() => json(400, { error: '요청일을 확인하세요.' }));
  await assert.rejects(t.client.request('tasks', { a: 1 }), { message: '요청일을 확인하세요.' });
  assert.equal(t.reloads(), 0);
});

test('a failed answer without an error text throws the generic message', async () => {
  for (const body of [{}, { error: '' }, { error: null }]) {
    const t = setup(() => json(500, body));
    await assert.rejects(t.client.request('tasks'), { message: '요청에 실패했습니다.' });
  }
});

test('a successful answer that is not JSON rejects with the JSON parser error, like the legacy helper', async () => {
  const t = setup(() => new Response('oops', { status: 200 }));
  await assert.rejects(t.client.request('tasks'), SyntaxError);
});

test('a failed answer that is not JSON rejects with the JSON parser error, not the generic message', async () => {
  const t = setup(() => new Response('Bad Gateway', { status: 502 }));
  await assert.rejects(t.client.request('tasks'), SyntaxError);
});

test('a network failure of fetch itself propagates untouched', async () => {
  const boom = new TypeError('network down');
  const client = createApiClient({ fetch: (async () => { throw boom; }) as typeof fetch, reload: () => {} });
  await assert.rejects(client.request('tasks'), (e) => e === boom);
});

test('a 2xx answer is returned even when it carries an error field', async () => {
  const t = setup(() => json(200, { error: 'ignored', ok: true }));
  assert.deepEqual(await t.client.request('x'), { error: 'ignored', ok: true });
});
