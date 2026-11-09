// R-015: the ten-file limit and the history rows of uploading and deleting, through the guard pipeline over the real SQL.
// Same inputs as the legacy characterization (a delete is a POST on the file path); the history actor is the cloud database's `admin`.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';

const ADMIN = 'admin-secret-1';
const VIEWER = 'viewer-secret-2';
const basic = (user: string, password: string) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const LIMIT_MESSAGE = /10/;
let container: Container;
before(() => {
  container = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: VIEWER }, { log: () => {} });
});
after(async () => container.stop());

async function send(method: string, path: string, body?: unknown, viewer = false): Promise<{ status: number; body: any }> {
  const headers = new Headers({ Authorization: viewer ? basic('viewer', VIEWER) : basic('admin', ADMIN), 'Content-Type': 'application/json' });
  const response = await container.pipeline.handle(new Request('http://portal.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: response.status, body: await response.json() };
}
const newTask = async (title: string): Promise<string> => (await send('POST', '/api/tasks', { title, requester: '홍길동', requested_at: '2026-11-03T01:00:00Z' })).body.id;
const upload = (id: string, name: string, viewer = false) => send('POST', `/api/tasks/${id}/files`, { name, content: 'QQ==' }, viewer);
const detail = async (id: string): Promise<{ events: Array<{ kind: string; detail: string; actor: string }>; kpi: { files: Array<{ id: string; name: string }> } }> => (await send('GET', `/api/tasks/${id}`)).body;

describe('R-015 attachments: the limit and the history', () => {
  // R-015
  it('the 10th file is 201 and the 11th is 400 with the limit message; another task is not affected', async () => {
    const id = await newTask('열 개 업무');
    const other = await newTask('다른 업무');
    for (let i = 1; i <= 10; i++) assert.equal((await upload(id, `f${i}.txt`)).status, 201, `file ${i}`);
    const eleventh = await upload(id, 'f11.txt');
    assert.equal(eleventh.status, 400);
    assert.match(eleventh.body.error, LIMIT_MESSAGE);
    assert.equal((await detail(id)).kpi.files.length, 10);
    assert.equal((await upload(other, 'f1.txt')).status, 201);
  });
  // R-015
  it('deleting one frees a slot, and the refused 11th attempt left no history row', async () => {
    const id = await newTask('지우고 다시');
    for (let i = 1; i <= 10; i++) await upload(id, `f${i}.txt`);
    await upload(id, 'rejected.txt');
    let task = await detail(id);
    assert.equal(task.events.some((e) => e.detail === 'rejected.txt'), false);
    assert.equal((await send('POST', `/api/tasks/${id}/files/${task.kpi.files[0].id}`, {})).status, 200);
    assert.equal((await upload(id, 'again.txt')).status, 201);
    task = await detail(id);
    assert.equal(task.kpi.files.length, 10);
  });
  // R-015
  it('uploading adds a "첨부파일 등록" row with the file name and deleting adds a "첨부파일 삭제" row, in that order', async () => {
    const id = await newTask('이력 업무');
    const added = await upload(id, '견적서.pdf');
    assert.deepEqual((await detail(id)).events.slice(-1).map((e) => [e.kind, e.detail, e.actor]), [['첨부파일 등록', '견적서.pdf', 'admin']]);
    await send('POST', `/api/tasks/${id}/files/${added.body.id}`, {});
    assert.deepEqual((await detail(id)).events.slice(-2).map((e) => [e.kind, e.detail]), [['첨부파일 등록', '견적서.pdf'], ['첨부파일 삭제', '견적서.pdf']]);
  });
  // R-015
  it('deleting a file that does not exist is 404 with the file message and adds no row', async () => {
    const id = await newTask('없는 파일');
    const before = (await detail(id)).events.length;
    const answer = await send('POST', `/api/tasks/${id}/files/00000000-0000-4000-8000-000000000001`, {});
    assert.deepEqual([answer.status, answer.body], [404, { error: '파일을 찾을 수 없습니다.' }]);
    assert.equal((await detail(id)).events.length, before);
  });
  // R-015
  it('the viewer account cannot upload: 403 with the viewer message, and no row is added', async () => {
    const id = await newTask('조회 계정');
    const before = (await detail(id)).events.length;
    const answer = await upload(id, 'a.txt', true);
    assert.deepEqual([answer.status, answer.body], [403, { error: '조회 계정은 업무를 변경할 수 없습니다.' }]);
    assert.equal((await detail(id)).events.length, before);
  });
});
