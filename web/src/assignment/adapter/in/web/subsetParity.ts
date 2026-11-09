// Test support for the parity specs of the assignment and attachment contexts (not production code).
//
// The shared runner takes whole scenarios, but char-tasks and char-kpi also use routes of other contexts (task
// creation, detail, edit, reports, improvements, settings). Until those exist in the candidate, a context runs the
// steps that exercise ONLY its own routes, plus two test-only scaffold routes so the steps have tasks to work on:
//   - setup steps (task creation) and read-back steps (task detail) are answered by `scaffoldRoutes`, which calls the
//     same SQL functions the legacy server calls. They are NOT the request context and ship nowhere;
//   - every other step is reported as covered-later with its label, so nothing is silently dropped.
import { it } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { startNextCandidate } from '../../../../parity/nextCandidate.ts';
import type { CandidateSession } from '../../../../parity/nextCandidate.ts';
import { pgliteAvailable } from '../../../../parity/credentials.ts';
import { recordedResults } from '../../../../parity/recordedOracle.ts';
import { compare, formatDifferences, hintMisses, loadCorpus, runCorpus } from '../../../../parity/runner.ts';
import type { Corpus, SessionFactory, Step } from '../../../../parity/runner.ts';
import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { OrbitFunctions } from '../../../../shared/port/OrbitFunctions.ts';

const TASK_FIELDS = ['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description'];

/** Test-only stand-ins for POST /api/tasks and GET /api/tasks/:id (legacy server.js:48-50, 62-64), valid input only. */
export function scaffoldRoutes(open: () => Promise<OrbitFunctions>): RouteDefinition[] {
  return [
    {
      method: 'POST',
      pattern: '/api/tasks',
      handler: async (context) => {
        const values: Record<string, string> = {};
        for (const key of TASK_FIELDS) values[key] = String(context.body[key] || '').trim();
        return jsonResponse(201, await (await open()).call('orbit_api', { action: 'create', payload: values }));
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/tasks\/([^/]+)$/,
      handler: async (context) => {
        const orbit = await open();
        const id = context.params[0];
        const task = (await orbit.call('orbit_api', { action: 'detail', payload: { id, include_deleted: context.role === 'admin' } })) as Record<string, unknown> | null;
        if (task === null) return jsonResponse(404, { error: '업무를 찾을 수 없습니다.' });
        if (!task.deleted_at) task.kpi = await orbit.call('orbit_kpi', { action: 'detail', payload: { id } });
        return jsonResponse(200, task);
      },
    },
  ];
}

export type SubsetSpec = {
  /** Scenario of test/golden/requests.js. */
  readonly scenario: 'char-tasks' | 'char-kpi';
  /** A step belongs to the context when its path matches. */
  readonly ownPath: RegExp;
  /** Labels of task-creation steps the covered steps need. */
  readonly setupLabels: readonly string[];
  /** Labels of task-detail reads that show what the covered steps stored. */
  readonly readBackLabels: readonly string[];
};

export type Partition = { readonly steps: Step[]; readonly covered: string[]; readonly scaffolded: string[]; readonly coveredLater: string[] };

export function partition(corpus: Corpus, spec: SubsetSpec): Partition {
  const scenario = corpus.scenarios.find((s) => s.name === spec.scenario);
  if (scenario === undefined) throw new Error(`corpus has no scenario ${spec.scenario}`);
  const steps: Step[] = [];
  const covered: string[] = [];
  const scaffolded: string[] = [];
  const coveredLater: string[] = [];
  for (const step of scenario.steps) {
    if (spec.ownPath.test(step.path)) {
      steps.push(step);
      covered.push(step.label);
    } else if (spec.setupLabels.includes(step.label) || spec.readBackLabels.includes(step.label)) {
      steps.push(step);
      scaffolded.push(step.label);
    } else {
      coveredLater.push(step.label);
    }
  }
  return { steps, covered, scaffolded, coveredLater };
}

const candidateFactory: SessionFactory = async () => {
  let session: CandidateSession | undefined;
  const open = async () => {
    if (session === undefined) throw new Error('candidate not started');
    return session.container.orbitFunctions();
  };
  session = await startNextCandidate({ extraRoutes: scaffoldRoutes(open), log: () => {} });
  return session;
};

/** Registers one parity test: the covered steps of the scenario against the frozen recording and the candidate. */
export function subsetParity(name: string, spec: SubsetSpec): void {
  const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci) to run the candidate';
  it(`parity: ${name} answers its steps of ${spec.scenario} like the recorded legacy answers`, { skip, timeout: 300_000 }, async (t: TestContext) => {
    const corpus = await loadCorpus();
    const parts = partition(corpus, spec);
    assert.ok(parts.covered.length > 0, 'no covered step');
    const subset: Corpus = { ...corpus, scenarios: [{ name: spec.scenario, mode: 'secured', golden: false, steps: parts.steps }] };
    const expected = await recordedResults(name.replace(/\s+/g, '-'), subset);
    const actual = await runCorpus(candidateFactory, subset);
    t.diagnostic(`covered (${parts.covered.length}): ${parts.covered.join(' ')}`);
    t.diagnostic(`scaffolded setup/read-back (${parts.scaffolded.length}): ${parts.scaffolded.join(' ')}`);
    t.diagnostic(`covered-later (${parts.coveredLater.length}): ${parts.coveredLater.join(' ')}`);
    const diffs = compare(expected, actual);
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
    const misses = hintMisses(actual);
    assert.equal(misses.length, 0, `status hints missed: ${misses.map((r) => `${r.label}=${r.status}`).join(' ')}`);
  });
}
