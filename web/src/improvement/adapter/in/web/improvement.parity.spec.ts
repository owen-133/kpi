// Parity of the improvement-ledger routes (R-025): the legacy oracle and the Next candidate answer the ck-imp-* labels of
// the char-kpi scenario of test/golden/requests.js identically (they need no task rows).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pgliteAvailable, startLegacyOracle } from '../../../../parity/legacyOracle.ts';
import { startNextCandidate } from '../../../../parity/nextCandidate.ts';
import { compare, formatDifferences, loadCorpus, runCorpus } from '../../../../parity/runner.ts';
import type { Corpus } from '../../../../parity/runner.ts';

describe('improvement parity: legacy oracle vs Next candidate', () => {
  const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
  it('answers the improvement labels of the char-kpi scenario like the legacy oracle', { skip, timeout: 300_000 }, async (t) => {
    const full = await loadCorpus();
    const source = full.scenarios.find((s) => s.name === 'char-kpi');
    assert.ok(source, 'char-kpi scenario');
    const steps = source.steps.filter((step) => /^ck-imp-/.test(step.label));
    t.diagnostic(`covered (${steps.length}): ${steps.map((s) => s.label).join(', ')}`);
    assert.ok(steps.length >= 25, `expected the improvement labels, found ${steps.length}`);
    const corpus: Corpus = { ...full, scenarios: [{ ...source, steps }] };
    const expected = await runCorpus(startLegacyOracle, corpus);
    const actual = await runCorpus(startNextCandidate, corpus);
    const diffs = compare(expected, actual);
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
    assert.ok(actual.some((r) => r.label === 'ck-imp-stale-revision' && r.status === 409));
    assert.ok(actual.some((r) => r.label === 'ck-imp-unknown-id' && r.status === 404));
  });
});
