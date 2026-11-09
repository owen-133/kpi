// One working day across the contexts, in the order a user does it: assign, attach, finish, mark as test data, publish
// the month, record an improvement, get suggestions, then delete the request for good. Covers R-015 R-020 R-021 R-022
// R-023 R-025 R-026 R-027 R-030 together through the guard pipeline over the real SQL (PGlite).
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from './container.ts';
import type { Container } from './container.ts';

const ADMIN = 'test-admin';
const VIEWER = 'test-viewer';
const basic = (user: string, password: string) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const kstDay = (): string => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
type Sql = { exec(sql: string): Promise<unknown>; query<T>(sql: string): Promise<{ rows: T[] }> };

let container: Container;
before(() => {
  container = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: VIEWER }, { log: () => {} });
});
after(async () => container.stop());

async function req(path: string, body?: unknown, viewer = false): Promise<{ status: number; headers: Headers; data: any }> {
  const headers = new Headers({ Authorization: viewer ? basic('viewer', VIEWER) : basic('admin', ADMIN), 'Content-Type': 'application/json' });
  const response = await container.pipeline.handle(
    new Request('http://portal.test/api/' + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) }),
  );
  const isJson = response.headers.get('content-type')?.includes('json');
  return { status: response.status, headers: response.headers, data: isJson ? await response.json() : await response.text() };
}

describe('assignment, files, test data, report, improvement, suggestions and deletion in one flow', () => {
  // R-015 R-020 R-021 R-022 R-023 R-025 R-026 R-027 R-030
  it('each step answers as the legacy portal did and the published report survives the purge of its request', async () => {
    const month = kstDay().slice(0, 7);
    const now = new Date().toISOString();
    const created = await req('tasks', { title: '신규 입사자 노트북', requester: '직원', category: '비품·자산', requested_at: now, due_date: kstDay() });
    const id = created.data.id as string;
    const path = `tasks/${id}`;

    // R-020: the viewer cannot assign; the first assignment time stays when the assignee changes; the list carries the assignee
    assert.equal((await req(`${path}/assign`, { assignee: '총무 담당' }, true)).status, 403);
    assert.equal((await req(`${path}/assign`, { assignee: '총무 담당' })).status, 200);
    const first = (await req(path)).data.kpi.assigned_at;
    assert.ok(first);
    await req(`${path}/assign`, { assignee: '다른 담당' });
    assert.equal((await req(path)).data.kpi.assigned_at, first);
    assert.equal((await req('tasks')).data[0].assignee, '다른 담당');

    // R-015: a script file is refused; a text file is stored; the viewer downloads it as an attachment but cannot delete it
    assert.equal((await req(`${path}/files`, { name: '위험.html', content: 'YWJj' })).status, 400);
    const file = (await req(`${path}/files`, { name: '요청.txt', content: Buffer.from('요청 근거').toString('base64') })).data;
    const downloaded = await req(`${path}/files/${file.id}`, undefined, true);
    assert.equal(downloaded.data, '요청 근거');
    assert.match(downloaded.headers.get('content-disposition') ?? '', /attachment/);
    assert.equal((await req(`${path}/files/${file.id}`, {}, true)).status, 403);

    // R-022: finishing counts into the month's figures; R-021: marking it as test data takes it out again
    await req(`${path}/status`, { status: '완료' });
    let preview = (await req(`report-preview?month=${month}`)).data;
    assert.equal(preview.metrics.completed, 1);
    assert.equal(preview.metrics.completionRate, 100);
    await req(`${path}/test-data`, { is_test: true });
    assert.equal((await req(`report-preview?month=${month}`)).data.metrics.completed, 0);

    // R-023: a fingerprint from another state is a 409; the viewer cannot publish; the right one publishes and the viewer reads it
    assert.equal((await req('reports', { month, fingerprint: preview.fingerprint, draft: '초안' })).status, 409);
    await req(`${path}/test-data`, { is_test: false });
    preview = (await req(`report-preview?month=${month}`)).data;
    assert.equal((await req('reports', { month, fingerprint: preview.fingerprint }, true)).status, 403);
    assert.equal((await req('reports', { month, fingerprint: preview.fingerprint, draft: '검토한 월간 보고서' })).status, 201);
    assert.equal((await req('reports', undefined, true)).data[0].metrics.completed, 1);

    // R-025: the viewer cannot save an improvement; a second save with the current revision is 201, with the stale one 409; two history rows
    const improvement = { title: '기한 누락 개선', stage: '본인 실사용', source: '팀장 시연', feedback: '기한 확인 어려움', action: '지표 추가', result: '', status: '개선 중' };
    assert.equal((await req('improvements', { value: improvement }, true)).status, 403);
    const saved = (await req('improvements', { value: improvement })).data;
    const revised = { ...improvement, status: '검증 완료', result: '기한 미지정 지표 확인' };
    assert.equal((await req('improvements', { id: saved.id, revision: 1, value: revised })).status, 201);
    assert.equal((await req('improvements', { id: saved.id, revision: 1, value: revised })).status, 409);
    assert.equal((await req(`improvements/${saved.id}/history`)).data.length, 2);

    // R-030: the suggestion classifies by rule and finds the similar request
    const suggestions = (await req('automation', { text: '신규 입사자 노트북' })).data;
    assert.equal(suggestions.classification.category, '비품·자산');
    assert.equal(suggestions.similar[0].id, id);

    // R-026 R-027: delete, then purge with the exact title; the file goes with the request, the published report stays
    await req(`${path}/delete`, { reason: '테스트 정리' });
    assert.equal((await req(`${path}/purge`, { reason: '테스트 정리', confirmation: '신규 입사자 노트북' })).status, 200);
    assert.equal((await req(`${path}/files/${file.id}`)).status, 404);
    const sql = ((await container.orbitFunctions()) as unknown as { client: Sql }).client;
    await sql.exec('RESET ROLE');
    try {
      assert.equal((await sql.query<{ n: number }>('select count(*)::int as n from orbit_private.task_files')).rows[0].n, 0);
      for (const table of ['monthly_reports', 'improvement_events']) {
        await assert.rejects(sql.exec(`delete from orbit_private.${table}`), /cannot be updated or deleted/, table);
      }
    } finally {
      await sql.exec('SET ROLE service_role');
    }
    assert.equal((await req('reports')).data[0].metrics.completed, 1, 'the published figures are a snapshot');
  });
});
