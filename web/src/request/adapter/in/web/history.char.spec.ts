// R-005 in the user's words: the change history only grows, in the order things happened, stamped by the server, and the
// store itself refuses to edit or erase it. Runs the real SQL (PGlite) behind the guard pipeline.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';

const ADMIN = 'admin-secret-1';
const VIEWER = 'viewer-secret-2';
const basic = (user: string, password: string) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
type Sql = { exec(sql: string): Promise<unknown>; query<T>(sql: string): Promise<{ rows: T[] }> };

let container: Container;
let sql: Sql;
before(async () => {
  container = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: VIEWER }, { log: () => {} });
  sql = (await container.orbitFunctions() as unknown as { client: Sql }).client;
});
after(async () => container.stop());

async function send(method: string, path: string, body?: unknown, who: 'admin' | 'viewer' = 'admin'): Promise<{ status: number; body: any }> {
  const headers = new Headers({ Authorization: who === 'admin' ? basic('admin', ADMIN) : basic('viewer', VIEWER) });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await container.pipeline.handle(new Request('http://portal.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: response.status, body: await response.json() };
}
async function flow(): Promise<string> {
  const id = (await send('POST', '/api/tasks', { title: '이력 점검', requester: '홍길동', requested_at: '2020-01-01T00:00:00Z' })).body.id as string;
  await send('POST', `/api/tasks/${id}/status`, { status: '진행 중' });
  await send('POST', `/api/tasks/${id}/notes`, { note: '장비 준비' });
  await send('POST', `/api/tasks/${id}/status`, { status: '완료' });
  return id;
}
const rejected = async (statement: string): Promise<string> => {
  await sql.exec('RESET ROLE');
  try {
    await sql.exec(statement);
  } catch (error) {
    return (error as Error).message;
  } finally {
    await sql.exec('SET ROLE service_role');
  }
  throw new Error(`the store accepted: ${statement}`);
};

describe('R-005 the change history', () => {
  // R-005
  it('after register, status change and note the detail lists them in the order they happened, as register, status change and note', async () => {
    const id = await flow();
    const events = (await send('GET', `/api/tasks/${id}`)).body.events as Array<{ id: number; kind: string; detail: string; actor: string }>;
    assert.deepEqual([...new Set(events.map((e) => e.actor))], ['총무 담당자'], 'register, status change and note are fixed to the general-affairs actor');
    assert.deepEqual(events.map((e) => e.kind), ['등록', '상태 변경', '처리 메모', '상태 변경']);
    assert.deepEqual(events.map((e) => e.detail).slice(1), ['접수 → 진행 중', '장비 준비', '진행 중 → 완료']);
    const ids = events.map((e) => e.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => a - b), 'ordered by the store sequence');
    assert.equal(new Set(ids).size, ids.length);
  });
  // R-005
  it('the time of an entry is the server clock, not the requested time the user typed in', async () => {
    const id = await flow();
    const task = (await send('GET', `/api/tasks/${id}`)).body;
    assert.equal(task.requested_at.slice(0, 4), '2020');
    const now = Date.now();
    for (const event of task.events as Array<{ at: string }>) {
      assert.ok(Math.abs(now - Date.parse(event.at)) < 60_000, `entry time ${event.at} is near the server clock`);
    }
  });
  // R-005
  it('the viewer sees the same history, and a viewer cannot add to it', async () => {
    const id = await flow();
    const admin = (await send('GET', `/api/tasks/${id}`)).body.events;
    assert.deepEqual((await send('GET', `/api/tasks/${id}`, undefined, 'viewer')).body.events, admin);
    assert.equal((await send('POST', `/api/tasks/${id}/notes`, { note: '몰래' }, 'viewer')).status, 403);
    assert.equal((await send('GET', `/api/tasks/${id}`)).body.events.length, admin.length);
  });
  // R-005
  it('the store refuses to edit or erase an entry, even for its owner role, and the history stays whole', async () => {
    const id = await flow();
    const before = (await send('GET', `/api/tasks/${id}`)).body.events;
    assert.match(await rejected("update orbit_private.events set detail = 'tamper'"), /cannot be updated or deleted/);
    assert.match(await rejected('delete from orbit_private.events'), /cannot be updated or deleted/);
    assert.match(await rejected(`delete from orbit_private.events where task_id = '${id}'`), /cannot be updated or deleted/);
    assert.deepEqual((await send('GET', `/api/tasks/${id}`)).body.events, before);
  });
});
