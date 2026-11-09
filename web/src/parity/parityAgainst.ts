// Registers the parity test of one candidate against the recorded answers of the legacy portal (recorded/<spec-id>.json). Used by per-context specs:
//
//   import { parityAgainst } from '../parity/parityAgainst.ts';
//   parityAgainst('request context', async () => ({ handle: routeHandler, stop: async () => {} }));
//
// The test runs the shared request corpus (test/golden/requests.js, secured scenarios) against
// (1) the recording of the legacy portal's normalized answers (spec id = the name with dashes for spaces), and
// (2) the candidate built by the factory (one fresh candidate per scenario, e.g. over PGlite),
// and fails with a readable per-label difference list unless the normalized results are identical.
// The candidate is any `(request: Request) => Promise<Response>`. Its requests use the origin
// http://parity.test, so a same-origin Origin header equals the candidate's own origin.
// Skipped with a message when PGlite is unavailable (ORBIT_PGLITE_PATH or web/node_modules/@electric-sql/pglite).
// The recordings are frozen (see recordedOracle.ts): a new request gets a Next scenario spec, not a recording.
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { compare, formatDifferences, loadCorpus, runCorpus } from './runner.ts';
import type { SessionFactory } from './runner.ts';
import { pgliteAvailable } from './credentials.ts';
import { recordedResults } from './recordedOracle.ts';

export function parityAgainst(name: string, candidateFactory: SessionFactory): void {
  const skip = pgliteAvailable() ? false : 'PGlite not available: set ORBIT_PGLITE_PATH or run (cd web && npm ci) to run the candidate';
  it(`parity: ${name} answers the whole corpus like the recorded legacy answers`, { skip, timeout: 300_000 }, async () => {
    const corpus = await loadCorpus();
    const expected = await recordedResults(name.replace(/\s+/g, '-'), corpus);
    const actual = await runCorpus(candidateFactory, corpus);
    const diffs = compare(expected, actual);
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
  });
}
