// R-025: from the HTTP handler through the services to the real SQL functions (in-memory PGlite).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import { pgliteAvailable } from '../../../../parity/credentials.ts';

const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
const AUTH = { admin: 'Basic ' + Buffer.from('admin:a-secret').toString('base64'), viewer: 'Basic ' + Buffer.from('viewer:v-secret').toString('base64') };
const valid = { title: '기한 누락', stage: 'MVP 구축', source: '팀장 시연', feedback: '기한 확인 어려움', action: '지표 추가', result: '', status: '접수' };
const MISSING = '00000000-0000-4000-8000-000000000001';

function start() {
  const container = createContainer({ ADMIN_PASSWORD: 'a-secret', VIEWER_PASSWORD: 'v-secret' }, { log: () => {} });
  const send = async (path: string, who: 'admin' | 'viewer', body?: unknown) => {
    const response = await container.pipeline.handle(
      new Request('http://scenario.test' + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: AUTH[who], 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }),
    );
    return { status: response.status, data: (await response.json()) as any };
  };
  return { send, stop: container.stop };
}

test('Given a new entry saved by the admin, When the viewer lists it and reads the history, Then revision 1, trimmed value, one audit row with an empty before', { skip }, async () => {
  const app = start();
  try {
    const saved = await app.send('/api/improvements', 'admin', { value: { ...valid, title: '  저장 시험  ', status: '검증 완료', result: '확인함', unknown: '버려짐' } });
    assert.equal(saved.status, 201);
    const entry = (await app.send('/api/improvements', 'viewer')).data.find((x: any) => x.id === saved.data.id);
    assert.deepEqual([entry.title, entry.revision, 'unknown' in entry], ['저장 시험', 1, false]);
    const history = (await app.send(`/api/improvements/${saved.data.id}/history`, 'viewer')).data;
    assert.deepEqual([history.length, history[0].actor, history[0].before, history[0].after.title], [1, 'admin', {}, '저장 시험']);
  } finally {
    await app.stop();
  }
});

test('Given an entry, When updated with a stale, current or unknown revision/id, Then 409, 201 and 404 with the legacy messages', { skip }, async () => {
  const app = start();
  try {
    const { data } = await app.send('/api/improvements', 'admin', { value: valid });
    const id = data.id;
    assert.equal((await app.send('/api/improvements', 'admin', { id, revision: 1, value: { ...valid, title: '버전 1' } })).status, 201);
    const stale = await app.send('/api/improvements', 'admin', { id, revision: 1, value: valid });
    assert.deepEqual([stale.status, stale.data.error], [409, '다른 화면에서 수정됐습니다. 다시 불러오세요.']);
    const unknown = await app.send('/api/improvements', 'admin', { id: MISSING, revision: 1, value: valid });
    assert.deepEqual([unknown.status, unknown.data.error], [404, '개선 항목을 찾을 수 없습니다.']);
    assert.equal((await app.send(`/api/improvements/${id}/history`, 'admin')).data.length, 2);
    assert.equal((await app.send('/api/improvements', 'admin')).data.find((x: any) => x.id === id).revision, 2);
  } finally {
    await app.stop();
  }
});

test('Given a bad revision, When saving over an id, Then 400 for missing, 0, "1", 1.5, -1, and validation wins over a wrong revision', { skip }, async () => {
  const app = start();
  try {
    const { data } = await app.send('/api/improvements', 'admin', { value: valid });
    for (const revision of [undefined, 0, '1', 1.5, -1, null]) {
      const r = await app.send('/api/improvements', 'admin', { id: data.id, ...(revision === undefined ? {} : { revision }), value: valid });
      assert.deepEqual([r.status, r.data.error], [400, '개선 항목 버전을 확인하세요.'], String(revision));
    }
    const bad = await app.send('/api/improvements', 'admin', { id: data.id, revision: 99, value: { ...valid, title: '' } });
    assert.deepEqual([bad.status, bad.data.error], [400, '개선 제목과 피드백을 입력하세요.']);
    assert.equal((await app.send('/api/improvements', 'admin')).data[0].revision, 1);
  } finally {
    await app.stop();
  }
});

test('Given the 5000-character limit, When a field has 5000 or 5001 characters, Then 201 or 400 and the ledger grows only for 201', { skip }, async () => {
  const app = start();
  try {
    assert.equal((await app.send('/api/improvements', 'admin', { value: { ...valid, action: 'a'.repeat(5000) } })).status, 201);
    assert.equal((await app.send('/api/improvements', 'admin', { value: { ...valid, action: ` ${'a'.repeat(5000)}  ` } })).status, 201);
    const over = await app.send('/api/improvements', 'admin', { value: { ...valid, title: 'a'.repeat(5001) } });
    assert.deepEqual([over.status, over.data.error], [400, '개선 내용은 항목별 5000자 이하로 입력하세요.']);
    assert.equal((await app.send('/api/improvements', 'viewer')).data.length, 2);
    assert.equal((await app.send('/api/improvements', 'viewer', { value: valid })).status, 403);
  } finally {
    await app.stop();
  }
});

test('Given history lookups, When the id is unknown, Then an empty list; a text that is not an id is the database input error 400', { skip }, async () => {
  const app = start();
  try {
    assert.deepEqual((await app.send(`/api/improvements/${MISSING}/history`, 'admin')).data, []);
    const r = await app.send('/api/improvements/no-such-id/history', 'admin');
    assert.deepEqual([r.status, r.data.error], [400, '입력 형식을 확인하세요.']);
    assert.equal((await app.send('/api/improvements/a/b/history', 'admin')).status, 404);
  } finally {
    await app.stop();
  }
});
