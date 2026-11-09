// R-012 end to end: the CSV a user downloads is built from the list the portal serves, whatever the board filter shows.
// The list is read through the pipeline over the real SQL; trash and test data are set the way the user sets them.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createContainer } from '../../../../../config/container.ts';
import type { Container } from '../../../../../config/container.ts';
import { buildTasksCsv, tasksCsvFilename } from './tasksCsv.ts';
import type { TaskSummary } from './RequestApi.ts';

const ADMIN = 'admin-secret-1';
const auth = { Authorization: 'Basic ' + Buffer.from(`admin:${ADMIN}`).toString('base64'), 'Content-Type': 'application/json' };
let container: Container;
before(() => {
  container = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: 'viewer-secret-2' }, { log: () => {} });
});
after(async () => container.stop());

async function send(method: string, path: string, body?: unknown): Promise<any> {
  const response = await container.pipeline.handle(new Request('http://portal.test' + path, { method, headers: auth, body: body === undefined ? undefined : JSON.stringify(body) }));
  return response.json();
}
const register = async (over: Record<string, unknown>): Promise<string> =>
  (await send('POST', '/api/tasks', { requester: '홍길동', requested_at: '2026-11-09T09:13:07Z', ...over })).id;

describe('R-012 CSV download', () => {
  // R-012
  it('has the nine columns, a byte order mark, one row per request outside the trash, the test-data request included, and ignores any filter', async () => {
    await register({ title: '프린터 수리', department: '총무팀', channel: '메신저', category: '시설·환경' });
    const done = await register({ title: '완료 업무' });
    const testing = await register({ title: '테스트 업무' });
    const trashed = await register({ title: '휴지통 업무' });
    await send('POST', `/api/tasks/${done}/status`, { status: '완료' });
    await send('POST', `/api/tasks/${testing}/test-data`, { is_test: true });
    await send('POST', `/api/tasks/${trashed}/delete`, { reason: '정리' });
    const tasks = (await send('GET', '/api/tasks')) as TaskSummary[];
    const csv = buildTasksCsv(tasks);
    assert.ok(csv.startsWith('﻿'), 'UTF-8 byte order mark first');
    const rows = csv.slice(1).split('\r\n');
    assert.equal(rows[0], '"업무","요청자","부서","접수 경로","분류","상태","요청일","등록 시각","완료 시각"');
    const titles = rows.slice(1).map((row) => row.split('","')[0].replace(/^"/, ''));
    assert.deepEqual(titles.sort(), ['완료 업무', '테스트 업무', '프린터 수리'], 'trash is out, test data is in, status does not filter');
    const mine = rows.find((row) => row.startsWith('"프린터 수리"')) as string;
    assert.ok(mine.startsWith('"프린터 수리","홍길동","총무팀","메신저","시설·환경","접수","2026-11-09"'));
    assert.equal(tasks.length, 3);
  });
  // R-012
  it('a title that starts like a formula is stored as typed and written to the file with a leading apostrophe', async () => {
    await register({ title: '=HYPERLINK("http://x")' });
    const tasks = (await send('GET', '/api/tasks')) as TaskSummary[];
    assert.ok(tasks.some((task) => task.title === '=HYPERLINK("http://x")'), 'the stored title is untouched');
    assert.ok(buildTasksCsv(tasks).includes('"\'=HYPERLINK(""http://x"")"'));
  });
  // R-012
  it('the file is named 총무업무_<KST day>.csv', () => {
    assert.equal(tasksCsvFilename('2026-11-10'), '총무업무_2026-11-10.csv');
  });
});
