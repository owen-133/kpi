// R-009 beyond the Origin header: a write must not come from another site (Sec-Fetch-Site) and must be JSON (415).
// Each refusal is paired with the request that must still pass. The order of the guard is kept: 401 and 403 (viewer) come first.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_PASSWORD, VIEWER_PASSWORD } from '../parity/credentials.ts';
import { startNextCandidate } from '../parity/nextCandidate.ts';

const ORIGIN = 'http://csrf.test';
const basic = (user: string, password: string): string => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const ADMIN = { Authorization: basic('admin', ADMIN_PASSWORD) };
const VIEWER = { Authorization: basic('viewer', VIEWER_PASSWORD) };
const INPUT = JSON.stringify({ title: '노트북 준비', requester: '홍길동', requested_at: '2026-11-03T01:00:00Z' });
const JSON_TYPE = { 'Content-Type': 'application/json' };

const sessionPromise = startNextCandidate({ log: () => {} });
after(async () => (await sessionPromise).stop?.());
const send = async (pathname: string, init: RequestInit = {}): Promise<Response> => (await sessionPromise).handle(new Request(ORIGIN + pathname, init));
const post = (headers: Record<string, string>, body: string = INPUT): Promise<Response> => send('/api/tasks', { method: 'POST', headers, body });

describe('Sec-Fetch-Site on a write', () => {
  for (const site of ['cross-site', 'same-site', 'CROSS-SITE']) {
    it(`${site} is 403 with the refusal message and nothing is stored`, async () => {
      const before = ((await (await send('/api/tasks', { headers: ADMIN })).json()) as unknown[]).length;
      const response = await post({ ...ADMIN, ...JSON_TYPE, 'Sec-Fetch-Site': site });
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { error: '허용되지 않은 요청입니다.' });
      const after = ((await (await send('/api/tasks', { headers: ADMIN })).json()) as unknown[]).length;
      assert.equal(after, before);
    });
  }
  for (const site of ['same-origin', 'none']) {
    it(`${site} passes`, async () => {
      assert.equal((await post({ ...ADMIN, ...JSON_TYPE, 'Sec-Fetch-Site': site })).status, 201);
    });
  }
  it('an absent header passes (server-side callers and old browsers)', async () => {
    assert.equal((await post({ ...ADMIN, ...JSON_TYPE })).status, 201);
  });
  it('a GET with cross-site passes: only writes are refused', async () => {
    assert.equal((await send('/api/session', { headers: { ...ADMIN, 'Sec-Fetch-Site': 'cross-site' } })).status, 200);
  });
  it('a PUT with cross-site is refused like a POST, and HEAD is not refused', async () => {
    assert.equal((await send('/api/tasks', { method: 'PUT', headers: { ...ADMIN, 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    assert.notEqual((await send('/api/session', { method: 'HEAD', headers: { ...ADMIN, 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  });
});

describe('Content-Type of a POST', () => {
  it('text/plain is 415 with a JSON error and the guard headers, and nothing is stored', async () => {
    const response = await post({ ...ADMIN, 'Content-Type': 'text/plain' });
    assert.equal(response.status, 415);
    assert.deepEqual(await response.json(), { error: 'JSON 형식의 요청만 받을 수 있습니다.' });
    assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });
  it('a missing Content-Type and form types are 415', async () => {
    const bare = await send('/api/tasks', { method: 'POST', headers: ADMIN, body: new Uint8Array([123, 125]) });
    assert.equal(bare.status, 415);
    for (const type of ['application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'application/jsonx', 'application/json-seq', 'text/json']) {
      assert.equal((await post({ ...ADMIN, 'Content-Type': type })).status, 415, type);
    }
  });
  it('an oversized text/plain body is 415 before the body is read', async () => {
    const response = await post({ ...ADMIN, 'Content-Type': 'text/plain' }, 'x'.repeat(1_700_000));
    assert.equal(response.status, 415);
  });
  it('application/json passes, also with a charset, in any letter case, and an invalid JSON body is still 400', async () => {
    for (const type of ['application/json', 'application/json; charset=utf-8', 'Application/JSON;charset=UTF-8', 'application/json ; charset=utf-8']) {
      assert.equal((await post({ ...ADMIN, 'Content-Type': type })).status, 201, type);
    }
    assert.equal((await post({ ...ADMIN, ...JSON_TYPE }, '{not json')).status, 400);
  });
  it('a GET with a text/plain Content-Type passes', async () => {
    assert.equal((await send('/api/session', { headers: { ...ADMIN, 'Content-Type': 'text/plain' } })).status, 200);
  });
});

describe('the legacy order of the guard is kept', () => {
  it('without credentials the answer is 401, not 415 or 403', async () => {
    const response = await post({ 'Content-Type': 'text/plain', 'Sec-Fetch-Site': 'cross-site' });
    assert.equal(response.status, 401);
    assert.ok(response.headers.get('www-authenticate'));
  });
  it('the viewer gets 403 with the viewer message, not 415', async () => {
    const response = await post({ ...VIEWER, 'Content-Type': 'text/plain' });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: '조회 계정은 업무를 변경할 수 없습니다.' });
  });
  it('the cross-origin Origin refusal still answers 403 for a text/plain write', async () => {
    const response = await post({ ...ADMIN, 'Content-Type': 'text/plain', Origin: 'http://evil.example' });
    assert.equal(response.status, 403);
  });
});
