// Parity of the report routes (R-013, R-017, R-022..R-024): the legacy oracle and the Next candidate answer the
// report labels of the char-kpi scenario of test/golden/requests.js identically. The two seed tasks (ck-new-*) go to the
// candidate through a test-only POST /api/tasks that forwards the legacy-trimmed fields to orbit_api 'create'.
// Not covered here (other contexts): ck-file-*, ck-ten-*, ck-set-*, ck-imp-* (improvement.parity.spec.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../../../../config/container.ts';
import type { Container } from '../../../../config/container.ts';
import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import { candidateEnvironment } from '../../../../parity/nextCandidate.ts';
import { pgliteAvailable } from '../../../../parity/credentials.ts';
import { recordedResults } from '../../../../parity/recordedOracle.ts';
import { compare, formatDifferences, loadCorpus, runCorpus } from '../../../../parity/runner.ts';
import type { Corpus, Result, Session } from '../../../../parity/runner.ts';

const REPORT_LABELS = /^ck-(new-|month-|publish-|reports-list$|kpi-status$)/;
const TASK_FIELDS = ['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description'];

async function startCandidate(): Promise<Session> {
  const holder: { container?: Container } = {};
  const container = createContainer(candidateEnvironment(), {
    extraRoutes: [
      {
        method: 'POST',
        pattern: '/api/tasks',
        handler: async ({ body }) => {
          const task = Object.fromEntries(TASK_FIELDS.map((key) => [key, String(body[key] || '').trim()]));
          const orbit = await (holder.container as Container).orbitFunctions();
          return jsonResponse(201, await orbit.call('orbit_api', { action: 'create', payload: task }));
        },
      },
    ],
  });
  holder.container = container;
  return { handle: container.pipeline.handle, stop: container.stop };
}

// Reports published within the same clock tick share created_at and the SQL `order by created_at desc` leaves their order
// to the database. Both sides run the same SQL; the list is compared in a fixed order (month, then draft).
function stableReportList(results: Result[]): Result[] {
  return results.map((r) => {
    if (r.label !== 'ck-reports-list' || !('json' in r.body) || !Array.isArray(r.body.json)) return r;
    const sorted = [...(r.body.json as Array<{ month: string; draft: string }>)].sort((a, b) => `${a.month}|${a.draft}`.localeCompare(`${b.month}|${b.draft}`));
    return { ...r, body: { json: sorted.map((entry, index) => ({ ...entry, id: `<ID-${index}>` })) } };
  });
}

describe('report parity: legacy oracle vs Next candidate', () => {
  const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
  it('answers the report labels of the char-kpi scenario like the legacy oracle', { skip, timeout: 300_000 }, async (t) => {
    const full = await loadCorpus();
    const source = full.scenarios.find((s) => s.name === 'char-kpi');
    assert.ok(source, 'char-kpi scenario');
    const steps = source.steps.filter((step) => REPORT_LABELS.test(step.label));
    t.diagnostic(`covered (${steps.length}): ${steps.map((s) => s.label).join(', ')}`);
    assert.ok(steps.length >= 35, `expected the report labels, found ${steps.length}`);
    const corpus: Corpus = { ...full, scenarios: [{ ...source, steps }] };
    const expected = await recordedResults('report', corpus, { canonicalize: stableReportList });
    const actual = await runCorpus(startCandidate, corpus);
    const diffs = compare(expected, stableReportList(actual));
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
    // the fingerprint value itself is normalized away by the runner: check that a stale one is refused and a fresh one accepted
    assert.ok(actual.some((r) => r.label === 'ck-publish-current' && r.status === 201));
    assert.ok(actual.some((r) => r.label === 'ck-publish-wrong-fingerprint' && r.status === 409));
  });
});
