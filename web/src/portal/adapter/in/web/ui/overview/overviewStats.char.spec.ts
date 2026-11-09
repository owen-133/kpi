// R-013 end to end: the numbers on top of the dashboard, computed from the list the portal really serves.
// A request is registered through the pipeline over the real SQL; trash and test data are set the way the user sets them.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createContainer } from '../../../../../../config/container.ts';
import type { Container } from '../../../../../../config/container.ts';
import type { TaskSummary } from '../../../../../../request/adapter/in/web/ui/RequestApi.ts';
import { DEFAULT_SETTINGS } from '../../../../../../settings/domain/PortalSettings.ts';
import { kpiStrip, statCards } from './overviewModel.ts';

const ADMIN = 'admin-secret-1';
const VIEWER = 'viewer-secret-2';
const auth = { Authorization: 'Basic ' + Buffer.from(`admin:${ADMIN}`).toString('base64') };
const kstDay = (offsetDays: number): string => new Date(Date.now() + 9 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

let container: Container;
before(() => {
  container = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: VIEWER }, { log: () => {} });
});
after(async () => container.stop());

async function send(method: string, path: string, body?: unknown): Promise<any> {
  const response = await container.pipeline.handle(
    new Request('http://portal.test' + path, { method, headers: { ...auth, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) }),
  );
  return response.json();
}
async function register(title: string, over: Record<string, unknown> = {}): Promise<string> {
  const requestedAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
  return (await send('POST', '/api/tasks', { title, requester: '홍길동', requested_at: requestedAt, ...over })).id;
}
const setStatus = (id: string, status: string, reason?: string) => send('POST', `/api/tasks/${id}/status`, { status, ...(reason ? { reason } : {}) });
const list = async (): Promise<TaskSummary[]> => send('GET', '/api/tasks');

describe('R-013 accumulated figures and elapsed time', () => {
  // R-013
  it('the four cards count real tasks only: trash and test data are out, in-progress and done are the current status, overdue is a past due date on an unfinished task', async () => {
    const received = await register('접수 그대로', { due_date: kstDay(5) });
    const progress = await register('진행 중 업무', { due_date: kstDay(-3) });
    const today = await register('오늘이 기한', { due_date: kstDay(0) });
    const late = await register('기한 지난 완료', { due_date: kstDay(-5) });
    const trashed = await register('휴지통 업무', { due_date: kstDay(-9) });
    const testing = await register('테스트 업무', { due_date: kstDay(-9) });
    await setStatus(progress, '진행 중');
    await setStatus(late, '완료');
    await send('POST', `/api/tasks/${trashed}/delete`, { reason: '정리' });
    await send('POST', `/api/tasks/${testing}/test-data`, { is_test: true });
    const tasks = await list();
    assert.deepEqual(tasks.map((t) => t.id).sort(), [received, progress, today, late, testing].sort(), 'the trashed request is not in the list');
    const cards = statCards(tasks, DEFAULT_SETTINGS.texts, kstDay(0));
    assert.deepEqual(cards.map((c) => c.value), [4, 1, 1, 1], 'total = received, progress, today, late (test and trash are out); overdue = only the in-progress one past its due date');
  });
  // R-013
  it('reopening a finished request leaves it out of the average and the completed count until it is finished again', async () => {
    const id = await register('재개 업무');
    await setStatus(id, '완료');
    const only = async (): Promise<TaskSummary[]> => (await list()).filter((t) => t.id === id);
    const finished = kpiStrip(await only(), new Date().toISOString());
    assert.equal(finished.completed, '1건');
    await setStatus(id, '진행 중', '추가 요청');
    const reopened = (await only())[0];
    assert.equal(reopened?.completed_at, null, 'the completion time is cleared');
    assert.equal(kpiStrip([reopened as TaskSummary], new Date().toISOString()).completed, '0건');
    assert.equal(kpiStrip([reopened as TaskSummary], new Date().toISOString()).average, '—');
  });
  // R-013
  it('the average elapsed time is calendar hours from the requested time to the completion time, waiting and weekends included, test data left out', async () => {
    const id = await register('걸린 시간');
    const flagged = await register('테스트로 걸린 시간');
    await setStatus(id, '완료');
    await setStatus(flagged, '완료');
    await send('POST', `/api/tasks/${flagged}/test-data`, { is_test: true });
    const tasks = await list();
    const mine = tasks.find((t) => t.id === id) as TaskSummary;
    const hours = (Date.parse(mine.completed_at as string) - Date.parse(mine.requested_at)) / 3_600_000;
    const strip = kpiStrip(tasks.filter((t) => t.id === id || t.id === flagged), new Date().toISOString());
    assert.equal(strip.average, `${hours.toFixed(1)}시간`);
    assert.match(strip.excluded, /^테스트 1건 제외/);
  });
});
