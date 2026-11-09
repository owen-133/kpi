// R-030
// Parity of POST /api/automation: the frozen recording of the old portal and the Next candidate answer the same ordered requests identically.
// The shared corpus (test/golden/requests.js) has no automation step, so the scenario is written here. Tasks are created
// through the legacy route on the oracle; the candidate has no task routes yet (request context, later chunk), so its
// POST /api/tasks and POST /api/tasks/:id/test-data are answered by this spec directly from the same database functions the
// legacy server calls (orbit_api create, orbit_kpi mark_test). Everything else goes through the real pipeline.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compare, formatDifferences, runCorpus } from '../../../../parity/runner.ts';
import type { Corpus, Scenario, Session, Step } from '../../../../parity/runner.ts';
import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import { pgliteAvailable, ADMIN_PASSWORD, VIEWER_PASSWORD } from '../../../../parity/credentials.ts';
import { recordedResults } from '../../../../parity/recordedOracle.ts';
import { startNextCandidate } from '../../../../parity/nextCandidate.ts';

const admin = { user: 'admin', password: ADMIN_PASSWORD };
const viewer = { user: 'viewer', password: VIEWER_PASSWORD };
const post = (label: string, path: string, body: unknown, extra: Partial<Step> = {}): Step => ({ label, path, method: 'POST', body, ...admin, ...extra });
const automate = (label: string, text: unknown): Step => post(label, '/api/automation', { text });
const task = (title: string, description: string) => ({ title, requester: '요청자', requested_at: '2026-11-03T01:00:00Z', description });
const FIELDS = ['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description'];

const steps: Step[] = [
  automate('empty-portal-keyword', '신규 입사자 노트북 준비'),
  automate('empty-portal-no-keyword', '안녕하세요'),
  post('seed-1', '/api/tasks', task('신규 입사자 노트북', '노트북 1대 준비'), { save: { one: 'id' } }),
  post('seed-2', '/api/tasks', task('회의실 조명 수리', '3층 회의실'), { save: { two: 'id' } }),
  post('seed-3', '/api/tasks', task('신규 입사자 노트북 시험', '시험 기록'), { save: { three: 'id' } }),
  post('seed-mark-test', '/api/tasks/{{three}}/test-data', { is_test: true }),
  automate('similar-laptop', '신규 입사자 노트북'),
  automate('similar-room', '회의실 조명'),
  automate('similar-none', '전혀 무관한 문장'),
  automate('keyword-purchase', '견적서 받아서 결제 요청'),
  automate('keyword-contract', '임대 계약 갱신'),
  automate('keyword-welfare', '건강검진 안내'),
  automate('keyword-english-case', 'pc 점검'),
  automate('text-missing-key', undefined),
  automate('text-empty', ''),
  automate('text-null', null),
  automate('text-number', 12345),
  automate('text-array', ['노트북', '회의실']),
  automate('text-object', { a: 1 }),
  automate('text-20000-boundary-seen', 'a'.repeat(19990) + ' 노트북'),
  automate('text-20000-boundary-cut', 'a'.repeat(20000) + ' 노트북'),
  post('settings-categories', '/api/settings', { values: { categories: ['사내 자산', '구매 지출', '기타'] }, revision: 0 }),
  automate('configured-laptop', '노트북 지급'),
  automate('configured-purchase', '구매 견적'),
  automate('configured-no-match', '계약 갱신'),
  automate('configured-nothing', '안녕'),
  post('viewer-403', '/api/automation', { text: '노트북' }, viewer),
  { label: 'no-login-401', path: '/api/automation', method: 'POST', body: { text: 'x' } },
  { label: 'get-404', path: '/api/automation', ...admin },
  { label: 'bad-json-400', path: '/api/automation', method: 'POST', raw: '{nope', ...admin },
  { label: 'json-array-400', path: '/api/automation', method: 'POST', raw: '[1]', ...admin },
  { label: 'cross-origin-403', path: '/api/automation', method: 'POST', body: { text: 'x' }, headers: { Origin: 'http://evil.example' }, ...admin },
];

const corpus = (full: Corpus): Corpus => {
  const scenario: Scenario = { name: 'automation', mode: 'secured', golden: false, steps };
  return { ...full, scenarios: [scenario] };
};

/** The candidate with the two task routes it does not have yet answered straight from the database functions. */
async function candidateWithTaskSeeding(): Promise<Session> {
  const session = await startNextCandidate();
  const handle = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const testData = /^\/api\/tasks\/([^/]+)\/test-data$/.exec(url.pathname);
    const authorized = request.headers.get('authorization') === 'Basic ' + Buffer.from(`admin:${ADMIN_PASSWORD}`).toString('base64');
    if (request.method === 'POST' && authorized && (url.pathname === '/api/tasks' || testData !== null)) {
      const database = await session.container.orbitFunctions();
      const body = (await request.json()) as Record<string, unknown>;
      if (testData !== null) {
        return jsonResponse(200, await database.call('orbit_kpi', { action: 'mark_test', payload: { id: testData[1], is_test: body.is_test } }));
      }
      const payload = Object.fromEntries(FIELDS.map((key) => [key, String(body[key] || '').trim()]));
      return jsonResponse(201, await database.call('orbit_api', { action: 'create', payload }));
    }
    return session.handle(request);
  };
  return { handle, stop: session.stop };
}

describe('automation parity: legacy oracle vs Next candidate', () => {
  const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
  it('answers the automation scenario like the legacy oracle', { skip, timeout: 300_000 }, async () => {
    const { loadCorpus } = await import('../../../../parity/runner.ts');
    const scenarioCorpus = corpus(await loadCorpus());
    const expected = await recordedResults('automation', scenarioCorpus);
    const actual = await runCorpus(candidateWithTaskSeeding, scenarioCorpus);
    assert.equal(actual.length, steps.length);
    const similar = expected.find((r) => r.label === 'similar-laptop');
    assert.ok(similar && 'json' in similar.body && (similar.body.json as { similar: unknown[] }).similar.length === 1, 'the oracle found exactly the one live, non-test similar task');
    const diffs = compare(expected, actual);
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
  });
});
