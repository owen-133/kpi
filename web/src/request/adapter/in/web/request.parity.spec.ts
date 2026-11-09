// R-001 R-002 R-003 R-004 R-006
// Parity of the request routes: the legacy oracle (server.js over PGlite) and the Next candidate answer whole corpus
// scenarios identically. Scenarios are the corpus ones (test/golden/requests.js) with the steps that belong to other
// contexts or to the page proxy removed; steps that save ids stay, so `{{one}}` captured ids flow across steps.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compare, formatDifferences, loadCorpus, runCorpus } from '../../../../parity/runner.ts';
import type { Corpus, Result, Scenario } from '../../../../parity/runner.ts';
import { pgliteAvailable } from '../../../../parity/credentials.ts';
import { recordedResults } from '../../../../parity/recordedOracle.ts';
import { startNextCandidate } from '../../../../parity/nextCandidate.ts';

// Steps kept per corpus scenario. `secured` keeps everything except the static page files (served by Next, not by the pipeline).
const KEEP: Record<string, RegExp> = {
  secured: /^(?!static-|page-not-found|page-no-public-prefix)/,
  // char-tasks: the registration, body-limit, field-length and read-back steps; assign, test-data and edit belong to later chunks
  'char-tasks': /^ct-(new-|body-(limit|oversized|small|viewer|field)|field-|detail-|testdata-detail|edit-detail|list-final)/,
  'char-kpi': /^(ck-new-|ck-file-detail)/,
};

async function requestCorpus(): Promise<{ corpus: Corpus; labels: string[] }> {
  const full = await loadCorpus();
  const labels: string[] = [];
  const scenarios: Scenario[] = [];
  for (const scenario of full.scenarios) {
    const keep = KEEP[scenario.name];
    if (keep === undefined) continue;
    const steps = scenario.steps.filter((step) => keep.test(step.label));
    labels.push(...steps.map((step) => `${scenario.name}/${step.label}`));
    scenarios.push({ ...scenario, steps });
  }
  return { corpus: { ...full, scenarios }, labels };
}

// The list is ordered `created_at desc, id` by orbit_api('list') in both implementations. Tasks created within the same
// clock tick tie on created_at and are then ordered by their random uuid, so two runs of the SAME implementation may
// order them differently. Lists are therefore compared as sets of rows (by normalized id); the order itself is SQL.
function withListsAsSets(results: Result[]): Result[] {
  return results.map((result) => {
    const body = result.body;
    if (!('json' in body) || !Array.isArray(body.json) || !body.json.every((row) => row !== null && typeof row === 'object' && 'id' in row)) return result;
    const rows = [...body.json].sort((a, b) => String((a as { id: unknown }).id).localeCompare(String((b as { id: unknown }).id)));
    return { ...result, body: { json: rows } };
  });
}

describe('request parity: legacy oracle vs Next candidate', () => {
  const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
  it('answers the request-route scenarios like the legacy oracle', { skip, timeout: 300_000 }, async (t) => {
    const { corpus, labels } = await requestCorpus();
    t.diagnostic(`covered (${labels.length}): ${labels.join(', ')}`);
    for (const required of ['create-full', 'create-minimal-trimmed', 'status-to-done', 'reopen-without-reason-400', 'reopen-with-reason', 'note-add', 'detail-after-flow', 'list-after-flow', 'viewer-list', 'ct-field-10001', 'ct-body-limit-exact']) {
      assert.ok(labels.some((label) => label.endsWith('/' + required)), `corpus label ${required} must be covered`);
    }
    const expected = await recordedResults('request', corpus, { canonicalize: withListsAsSets });
    const actual = await runCorpus(startNextCandidate, corpus);
    const diffs = compare(expected, withListsAsSets(actual));
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
  });
});
