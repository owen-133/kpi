// R-028 R-029
// Parity of the settings routes: the legacy oracle and the Next candidate answer the settings steps of the shared corpus
// (test/golden/requests.js, scenario char-kpi, labels ck-set-*) identically. Every other label of the corpus belongs to
// another context and is listed as covered-later with its reason. The golden scenario `secured` has no settings step.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compare, formatDifferences, loadCorpus, runCorpus } from '../../../../parity/runner.ts';
import type { Corpus, Scenario } from '../../../../parity/runner.ts';
import { pgliteAvailable } from '../../../../parity/credentials.ts';
import { recordedResults } from '../../../../parity/recordedOracle.ts';
import { startNextCandidate } from '../../../../parity/nextCandidate.ts';

const MINE = /^ck-set-/;
const COVERED_LATER = 'belongs to another context (request, assignment, attachment, report, improvement or access)';

async function settingsCorpus(): Promise<{ corpus: Corpus; covered: string[]; coveredLater: string[] }> {
  const full = await loadCorpus();
  const covered: string[] = [];
  const coveredLater: string[] = [];
  const scenarios: Scenario[] = [];
  for (const scenario of full.scenarios.filter((s) => s.mode === 'secured')) {
    const steps = scenario.steps.filter((step) => {
      if (MINE.test(step.label)) {
        covered.push(`${scenario.name}/${step.label}`);
        return true;
      }
      coveredLater.push(`${scenario.name}/${step.label}`);
      return false;
    });
    if (steps.length > 0) scenarios.push({ ...scenario, steps });
  }
  return { corpus: { ...full, scenarios }, covered, coveredLater };
}

describe('settings parity: legacy oracle vs Next candidate', () => {
  const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
  it('answers every settings step of the corpus like the recorded legacy answers', { skip, timeout: 300_000 }, async (t) => {
    const { corpus, covered, coveredLater } = await settingsCorpus();
    t.diagnostic(`covered (${covered.length}): ${covered.join(', ')}`);
    t.diagnostic(`covered-later (${coveredLater.length}): ${COVERED_LATER}`);
    // declared: initial read 1 + bad values 17 + bad versions 4 + bad value with stale version 1 + saves 5 + stale 1 + viewer write 1 + texts array 1 + viewer read 1 + viewer history 1 + history 1
    assert.equal(covered.length, 1 + 17 + 4 + 1 + 5 + 1 + 1 + 1 + 1 + 1 + 1, 'the corpus declares these settings steps');
    const expected = await recordedResults('settings', corpus);
    const actual = await runCorpus(startNextCandidate, corpus);
    assert.equal(actual.length, covered.length);
    const diffs = compare(expected, actual);
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
  });
});
