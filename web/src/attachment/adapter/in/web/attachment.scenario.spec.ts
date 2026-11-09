// Integration scenarios: request -> guard pipeline -> route -> use case -> orbit_kpi in a real (PGlite) database.
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';
import type { OrbitFunctions } from '../../../../shared/port/OrbitFunctions.ts';

const ORIGIN = 'http://api.test';
const GHOST = '00000000-0000-4000-8000-000000000000';
const auth = (user: string, password: string) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const ADMIN = auth('admin', 'admin-pw');
const VIEWER = auth('viewer', 'viewer-pw');
const b64 = (bytes: number): string => Buffer.alloc(bytes, 65).toString('base64');
const SUPPORT = '지원 파일: PDF·이미지·TXT·CSV·XLSX·DOCX, 최대 1MB';
const TOO_LARGE = '첨부파일은 1MB 이하여야 합니다.';

let container: Container | undefined;
afterEach(async () => {
  await container?.stop();
  container = undefined;
});

type Reply = { status: number; json: any; bytes: Buffer; headers: Headers };
async function start() {
  container = createContainer({ ADMIN_PASSWORD: 'admin-pw', VIEWER_PASSWORD: 'viewer-pw' }, { log: () => {} });
  const orbit: OrbitFunctions = await container.orbitFunctions();
  const task = async (): Promise<string> =>
    ((await orbit.call('orbit_api', { action: 'create', payload: { title: '첨부 시험', requester: '직원', requested_at: '2026-11-03T01:00:00Z' } })) as { id: string }).id;
  const pipeline = container.pipeline;
  const call = async (method: string, path: string, body?: unknown, authorization = ADMIN): Promise<Reply> => {
    const response = await pipeline.handle(
      new Request(ORIGIN + path, { method, headers: { Authorization: authorization, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }),
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    let json: any;
    try {
      json = JSON.parse(bytes.toString('utf8'));
    } catch {
      json = undefined;
    }
    return { status: response.status, json, bytes, headers: response.headers };
  };
  const files = async (taskId: string) =>
    ((await orbit.call('orbit_kpi', { action: 'detail', payload: { id: taskId } })) as { files: Array<{ id: string; name: string; size: number; type: string }> }).files;
  return { call, orbit, task, files };
}

describe('uploading an attachment over HTTP [R-015]', () => {
  it('stores 1, 1048575 and 1048576 bytes as 201 with an id and keeps name, size and the octet-stream type', async () => {
    const { call, task, files } = await start();
    const id = await task();
    for (const size of [1, 1048575, 1048576]) {
      const r = await call('POST', `/api/tasks/${id}/files`, { name: `size-${size}.txt`, content: b64(size) });
      assert.equal(r.status, 201, `size ${size}`);
      assert.match(r.json.id, /^[0-9a-f-]{36}$/);
    }
    assert.deepEqual((await files(id)).map((f) => [f.name, f.size, f.type]), [
      ['size-1.txt', 1, 'application/octet-stream'],
      ['size-1048575.txt', 1048575, 'application/octet-stream'],
      ['size-1048576.txt', 1048576, 'application/octet-stream'],
    ]);
  });

  it('refuses 1048577 bytes (size message), over-long base64, empty and zero-byte content, and stores nothing', async () => {
    const { call, task, files } = await start();
    const id = await task();
    const cases: Array<[string, string, string]> = [
      ['over-1048577.txt', b64(1048577), TOO_LARGE],
      ['over.txt', b64(1048579), SUPPORT],
      ['빈파일.txt', '', SUPPORT],
      ['빈파일.txt', 'A', TOO_LARGE],
    ];
    for (const [name, content, message] of cases) {
      const r = await call('POST', `/api/tasks/${id}/files`, { name, content });
      assert.deepEqual([r.status, r.json], [400, { error: message }], `${name} ${content.length}`);
    }
    assert.equal((await files(id)).length, 0);
  });

  it('refuses a bad extension, a missing extension, bad base64, a space inside base64 and a missing body field', async () => {
    const { call, task } = await start();
    const id = await task();
    const bodies: unknown[] = [
      { name: '위험.exe', content: 'QQ==' },
      { name: '확장자없음', content: 'QQ==' },
      { name: '글.txt', content: 'QQ==!' },
      { name: '글.txt', content: 'Q Q==' },
      { content: 'QQ==' },
      { name: 'a.txt' },
    ];
    for (const body of bodies) {
      const r = await call('POST', `/api/tasks/${id}/files`, body);
      assert.deepEqual([r.status, r.json], [400, { error: SUPPORT }], JSON.stringify(body));
    }
  });

  it('accepts xlsx and an upper-case PNG, cleans separators in the name and enforces the 150-character name limit', async () => {
    const { call, task, files } = await start();
    const id = await task();
    const exact = 'x'.repeat(146) + '.txt';
    for (const name of ['표.xlsx', '대문자.PNG', 'a/b\\c.txt', exact]) assert.equal((await call('POST', `/api/tasks/${id}/files`, { name, content: 'QQ==' })).status, 201, name);
    assert.equal((await call('POST', `/api/tasks/${id}/files`, { name: 'x'.repeat(147) + '.txt', content: 'QQ==' })).status, 400);
    assert.deepEqual((await files(id)).map((f) => f.name), ['표.xlsx', '대문자.PNG', 'a_b_c.txt', exact]);
  });

  it('takes ten files per task: the 10th is 201, the 11th is 400 with the limit message, another task is not affected, deleting frees a slot', async () => {
    const { call, task, files } = await start();
    const id = await task();
    const other = await task();
    for (let i = 1; i <= 10; i++) assert.equal((await call('POST', `/api/tasks/${id}/files`, { name: `f${i}.txt`, content: 'QQ==' })).status, 201, `file ${i}`);
    const eleventh = await call('POST', `/api/tasks/${id}/files`, { name: 'f11.txt', content: 'QQ==' });
    assert.deepEqual([eleventh.status, eleventh.json], [400, { error: '업무당 첨부파일은 10개까지 가능합니다.' }]);
    assert.equal((await files(id)).length, 10);
    assert.equal((await call('POST', `/api/tasks/${other}/files`, { name: 'f1.txt', content: 'QQ==' })).status, 201);
    const [first] = await files(id);
    assert.equal((await call('POST', `/api/tasks/${id}/files/${first.id}`, {})).status, 200);
    assert.equal((await call('POST', `/api/tasks/${id}/files`, { name: 'again.txt', content: 'QQ==' })).status, 201);
  });

  it('answers 404 for a missing task and 400 for an id that is not a uuid; the viewer account gets 403 and stores nothing', async () => {
    const { call, task, files } = await start();
    const id = await task();
    const missing = await call('POST', `/api/tasks/${GHOST}/files`, { name: 'a.txt', content: 'QQ==' });
    assert.deepEqual([missing.status, missing.json], [404, { error: '업무를 찾을 수 없습니다.' }]);
    assert.deepEqual((await call('POST', '/api/tasks/no-such-task/files', { name: 'a.txt', content: 'QQ==' })).json, { error: '입력 형식을 확인하세요.' });
    const viewer = await call('POST', `/api/tasks/${id}/files`, { name: 'a.txt', content: 'QQ==' }, VIEWER);
    assert.deepEqual([viewer.status, viewer.json], [403, { error: '조회 계정은 업무를 변경할 수 없습니다.' }]);
    assert.equal((await files(id)).length, 0);
  });

  it('validates the file before it looks the task up: a bad file for a missing task is 400', async () => {
    const { call } = await start();
    assert.equal((await call('POST', `/api/tasks/${GHOST}/files`, { name: '위험.exe', content: 'QQ==' })).status, 400);
  });
});

describe('downloading and deleting an attachment over HTTP [R-015]', () => {
  it('returns the stored bytes with the safe headers for the administrator and the viewer', async () => {
    const { call, task } = await start();
    const id = await task();
    const added = await call('POST', `/api/tasks/${id}/files`, { name: '견적서 (최종).pdf', content: 'QUJD' });
    for (const authorization of [ADMIN, VIEWER]) {
      const r = await call('GET', `/api/tasks/${id}/files/${added.json.id}`, undefined, authorization);
      assert.equal(r.status, 200);
      assert.equal(r.bytes.toString('utf8'), 'ABC');
      assert.equal(r.headers.get('content-type'), 'application/octet-stream');
      assert.equal(r.headers.get('content-disposition'), "attachment; filename*=UTF-8''" + encodeURIComponent('견적서 (최종).pdf'));
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(r.headers.get('content-length'), '3');
    }
  });

  it('serves an html-looking name only as an attachment download, never inline (the allow-list keeps .html out anyway)', async () => {
    const { call, task } = await start();
    const id = await task();
    assert.equal((await call('POST', `/api/tasks/${id}/files`, { name: 'x.html', content: 'QQ==' })).status, 400);
    const added = await call('POST', `/api/tasks/${id}/files`, { name: '<script>.txt', content: 'QQ==' });
    const r = await call('GET', `/api/tasks/${id}/files/${added.json.id}`);
    assert.equal(r.headers.get('content-disposition'), "attachment; filename*=UTF-8''" + encodeURIComponent('<script>.txt'));
    assert.match(r.headers.get('content-disposition') ?? '', /^attachment; /);
  });

  it('answers 404 with the file message for a missing file, on download and on delete', async () => {
    const { call, task } = await start();
    const id = await task();
    for (const [method, body] of [['GET', undefined], ['POST', {}]] as const) {
      const r = await call(method, `/api/tasks/${id}/files/${GHOST}`, body);
      assert.deepEqual([r.status, r.json], [404, { error: '파일을 찾을 수 없습니다.' }], method);
    }
    assert.equal((await call('GET', `/api/tasks/${id}/files/no-such-file`)).status, 400);
  });

  it('delete removes only that file, writes the history row, and cannot touch a file of another task', async () => {
    const { call, task, files } = await start();
    const id = await task();
    const other = await task();
    const a = await call('POST', `/api/tasks/${id}/files`, { name: 'a.txt', content: 'QQ==' });
    const b = await call('POST', `/api/tasks/${id}/files`, { name: 'b.txt', content: 'QQ==' });
    assert.equal((await call('POST', `/api/tasks/${other}/files/${a.json.id}`, {})).status, 404);
    assert.deepEqual((await call('POST', `/api/tasks/${id}/files/${a.json.id}`, {})).json, { ok: true });
    assert.deepEqual((await files(id)).map((f) => f.id), [b.json.id]);
    assert.equal((await call('GET', `/api/tasks/${id}/files/${a.json.id}`)).status, 404);
  });

  it('the viewer account cannot delete (403) and the file stays', async () => {
    const { call, task, files } = await start();
    const id = await task();
    const a = await call('POST', `/api/tasks/${id}/files`, { name: 'a.txt', content: 'QQ==' });
    assert.equal((await call('POST', `/api/tasks/${id}/files/${a.json.id}`, {}, VIEWER)).status, 403);
    assert.equal((await files(id)).length, 1);
  });

  it('there is no list route and no other method: GET /files, PUT and DELETE answer the unsupported-request 404', async () => {
    const { call, task } = await start();
    const id = await task();
    for (const [method, path] of [['GET', `/api/tasks/${id}/files`], ['PUT', `/api/tasks/${id}/files`], ['DELETE', `/api/tasks/${id}/files/${GHOST}`]]) {
      const r = await call(method, path);
      assert.deepEqual([r.status, r.json], [404, { error: '지원하지 않는 요청입니다.' }], `${method} ${path}`);
    }
  });
});
