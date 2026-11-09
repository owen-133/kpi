// Parity of the guard behavior: the legacy oracle and the Next candidate answer the guard labels of the golden corpus
// (test/golden/requests.js) identically. Labels belonging to routes of later chunks are listed in SKIPPED.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compare, formatDifferences, loadCorpus, runCorpus } from './runner.ts';
import type { Corpus, Scenario } from './runner.ts';
import { pgliteAvailable, startLegacyOracle } from './legacyOracle.ts';
import { startNextCandidate } from './nextCandidate.ts';

const GUARD_LABELS = /^(health|auth-|session-|page-|api-|bad-json|viewer-|cross-origin-)/;
const SKIPPED: Record<string, string> = {
  'page-not-found': 'unknown page paths get the Next 404 page: pages never reach the pipeline (proxy.ts screens them)',
  'page-no-public-prefix': 'unknown page paths get the Next 404 page: pages never reach the pipeline (proxy.ts screens them)',
  'viewer-list': 'GET /api/tasks belongs to the request context (later chunk)',
};
const ABSENT_TASK_ID = '00000000-0000-4000-8000-000000000002';

async function guardCorpus(): Promise<{ corpus: Corpus; covered: string[]; skipped: string[] }> {
  const full = await loadCorpus();
  const covered: string[] = [];
  const skipped: string[] = [];
  const scenarios: Scenario[] = [];
  for (const scenario of full.scenarios.filter((s) => s.mode === 'secured')) {
    const steps = scenario.steps.filter((step) => {
      if (!GUARD_LABELS.test(step.label)) return false;
      if (SKIPPED[step.label] !== undefined) {
        skipped.push(`${step.label}: ${SKIPPED[step.label]}`);
        return false;
      }
      covered.push(step.label);
      return true;
    });
    // later steps of the full scenario would need ids created by routes of other chunks: stripped, ids fixed
    if (steps.length > 0) scenarios.push({ ...scenario, steps: steps.map(({ save: _save, ...rest }) => rest) });
  }
  const corpus: Corpus = {
    scenarios,
    resolveStep: full.resolveStep,
    captureVars: full.captureVars,
    baseVars: () => ({ ...full.baseVars(), one: ABSENT_TASK_ID, two: ABSENT_TASK_ID }),
  };
  return { corpus, covered, skipped };
}

describe('guard parity: legacy oracle vs Next candidate', () => {
  const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
  it('answers the guard labels like the legacy oracle', { skip, timeout: 300_000 }, async (t) => {
    const { corpus, covered, skipped } = await guardCorpus();
    t.diagnostic(`covered (${covered.length}): ${covered.join(', ')}`);
    t.diagnostic(`skipped (${skipped.length}): ${skipped.join(' | ')}`);
    assert.ok(covered.length >= 20, `expected the guard labels, found ${covered.length}`);
    const expected = await runCorpus(startLegacyOracle, corpus);
    const actual = await runCorpus(startNextCandidate, corpus);
    const diffs = compare(expected, actual);
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
  });
});
