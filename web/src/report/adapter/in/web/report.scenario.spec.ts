// R-022, R-023: from the HTTP handler through the services to the real SQL functions (in-memory PGlite).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';
import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import { pgliteAvailable } from '../../../../parity/legacyOracle.ts';

const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
const AUTH = { admin: 'Basic ' + Buffer.from('admin:a-secret').toString('base64'), viewer: 'Basic ' + Buffer.from('viewer:v-secret').toString('base64') };

function start() {
  const holder: { container?: Container } = {};
  const container = createContainer(
    { ADMIN_PASSWORD: 'a-secret', VIEWER_PASSWORD: 'v-secret' },
    {
      log: () => {},
      extraRoutes: [
        {
          // test-only task creation (the request context owns the real one)
          method: 'POST',
          pattern: '/api/tasks',
          handler: async ({ body }) => {
            const orbit = await (holder.container as Container).orbitFunctions();
            return jsonResponse(201, await orbit.call('orbit_api', { action: 'create', payload: body }));
          },
        },
      ],
    },
  );
  holder.container = container;
  const send = async (path: string, who: 'admin' | 'viewer', body?: unknown) => {
    const response = await container.pipeline.handle(
      new Request('http://scenario.test' + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: AUTH[who], 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }),
    );
    return { status: response.status, data: (await response.json()) as any };
  };
  return { send, stop: container.stop };
}
const month = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
const task = { title: '발행 시험 업무', requester: '직원', department: '', channel: '', category: '', priority: '', requested_at: new Date().toISOString(), due_date: '', description: '' };

test('Given one task this month, When the admin previews and publishes, Then the viewer reads the stored report with draft, metrics and actor', { skip }, async () => {
  const app = start();
  try {
    await app.send('/api/tasks', 'admin', task);
    const preview = await app.send(`/api/report-preview?month=${month}`, 'viewer');
    assert.equal(preview.status, 200);
    assert.equal(preview.data.metrics.received, 1);
    assert.match(preview.data.fingerprint, /^[0-9a-f]{64}$/);
    const published = await app.send('/api/reports', 'admin', { month, fingerprint: preview.data.fingerprint, draft: '  검토한 문안  ' });
    assert.equal(published.status, 201);
    const list = await app.send('/api/reports', 'viewer');
    const saved = list.data.find((r: any) => r.id === published.data.id);
    assert.deepEqual([saved.month, saved.draft, saved.actor, saved.method, saved.metrics.received], [month, '검토한 문안', 'admin', '담당자 검토 발행 · 규칙 기반 집계', 1]);
  } finally {
    await app.stop();
  }
});

test('Given a published month, When it is published again, Then the second report is stacked beside the first', { skip }, async () => {
  const app = start();
  try {
    const { data } = await app.send(`/api/report-preview?month=${month}`, 'admin');
    const a = await app.send('/api/reports', 'admin', { month, fingerprint: data.fingerprint, draft: '첫 판' });
    const b = await app.send('/api/reports', 'admin', { month, fingerprint: data.fingerprint, draft: '둘째 판' });
    assert.notEqual(a.data.id, b.data.id);
    assert.equal((await app.send('/api/reports', 'admin')).data.length, 2);
  } finally {
    await app.stop();
  }
});

test('Given the publish rules, When each is broken, Then the legacy status and message answer and nothing is stored', { skip }, async () => {
  const app = start();
  try {
    const { data } = await app.send(`/api/report-preview?month=${month}`, 'admin');
    const fingerprint = data.fingerprint;
    const answers = [
      [{ month: '9999-12', fingerprint, draft: 'x' }, 400, '미래 월 리포트는 발행할 수 없습니다.'],
      [{ month: '2026-13', fingerprint, draft: 'x' }, 400, '조회 월을 확인하세요.'],
      [{ fingerprint, draft: 'x' }, 400, '조회 월을 확인하세요.'],
      [{ month: '9999-12', fingerprint: '0'.repeat(64), draft: 'x' }, 409, '집계 후 업무가 변경됐습니다. 새로 집계하고 발행하세요.'],
      [{ month, draft: 'x' }, 409, '집계 후 업무가 변경됐습니다. 새로 집계하고 발행하세요.'],
      [{ month, fingerprint, draft: 'a'.repeat(20001) }, 400, '보고서는 20000자 이하로 입력하세요.'],
    ] as const;
    for (const [body, status, message] of answers) {
      const r = await app.send('/api/reports', 'admin', body);
      assert.deepEqual([r.status, r.data.error], [status, message], JSON.stringify(body).slice(0, 60));
    }
    assert.equal((await app.send('/api/reports', 'viewer')).data.length, 0);
    assert.equal((await app.send('/api/reports', 'viewer', { month, fingerprint, draft: 'x' })).status, 403);
    assert.equal((await app.send('/api/reports', 'admin', { month, fingerprint, draft: '가'.repeat(20000) })).status, 201);
    assert.equal((await app.send('/api/reports', 'admin', { month, fingerprint, draft: '   ' })).status, 201);
    assert.equal((await app.send('/api/reports', 'admin')).data.find((r: any) => r.draft === '') !== undefined, true);
  } finally {
    await app.stop();
  }
});

test('Given the preview route, When the month is bad or absent, Then 400 with the month message; a future month answers 200', { skip }, async () => {
  const app = start();
  try {
    for (const q of ['', '?month=', '?month=2026-13', '?month=2026-11-01', '?month=%202026-11']) {
      const r = await app.send('/api/report-preview' + q, 'admin');
      assert.deepEqual([r.status, r.data.error], [400, '조회 월을 확인하세요.'], q);
    }
    assert.equal((await app.send('/api/report-preview?month=9999-12', 'viewer')).status, 200);
    assert.deepEqual((await app.send('/api/kpi-status', 'viewer')).data, { available: true });
  } finally {
    await app.stop();
  }
});
