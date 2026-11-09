// The legacy portal's answers, replayed from committed recordings instead of a running server.
//
//   const expected = await recordedResults('settings', corpus);
//
// A recording is `recorded/<spec-id>.json` = { corpusSha256, recordedAt, results }: the normalized results the legacy server
// gave to the corpus the spec runs. corpusSha256 is the sha256 of the canonical JSON of the scenarios the spec runs (the modes
// runCorpus would run) plus the corpus variables that are not clock values. A corpus that no longer matches fails loudly:
// the old server is gone, so the answers of a changed request cannot be asked for again.
//
// Clock: the corpus asks for "the current month" (MONTH, PREV_MONTH, NEXT_MONTH, NOW). A replay shifts Date (only Date) to the
// instant the recording was made, so the candidate sees the same months as the recording on any later day.
//
// The recordings are FROZEN. They were made once, while the old portal still existed: a recorder started that server, ran each
// spec's corpus (test/golden/requests.js) against it twice, required equal normalized answers, and wrote recorded/<spec-id>.json.
// That recorder and the server are deleted; a recording is never regenerated. A request that is new or changed gets a Next
// scenario spec (see web/AGENTS.md 「화면과 동등성」), not a recording.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Corpus, Result, Scenario } from './runner.ts';

export const RECORDED_DIR = fileURLToPath(new URL('./recorded/', import.meta.url));
export const CLOCK_VARS = ['NOW', 'MONTH', 'PREV_MONTH', 'NEXT_MONTH'];
export const CHANGED_CORPUS = 'corpus changed and the old server is gone; write a Next scenario spec instead';

export interface Recording {
  corpusSha256: string;
  recordedAt: string;
  results: Result[];
}
export interface RecordedOptions {
  modes?: Array<Scenario['mode']>;
  /** Was applied when the recording was made (tie-ordered lists as sets); a replay returns the recording as stored. The specs apply it to the candidate. */
  canonicalize?: (results: Result[]) => Result[];
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function corpusSha256(corpus: Corpus, modes: Array<Scenario['mode']> = ['secured']): string {
  const scenarios = corpus.scenarios.filter((s) => modes.includes(s.mode));
  const vars = Object.fromEntries(Object.entries(corpus.baseVars()).filter(([k]) => !CLOCK_VARS.includes(k)));
  return createHash('sha256').update(canonicalJson({ scenarios, vars })).digest('hex');
}

export const recordingPath = (specId: string, dir: string = RECORDED_DIR): string => path.join(dir, `${specId}.json`);

// Shifts Date (only Date) by a constant so "now" is the recording's instant plus the time that has passed since the replay
// started: the months match the recording, and clocks still advance (rows created in one test do not tie on created_at).
let clockShifted = false;
function shiftClock(recordedAt: string): void {
  if (clockShifted) return;
  clockShifted = true;
  const Real = Date;
  const offset = Date.parse(recordedAt) - Real.now();
  class Shifted extends Real {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(Real.now() + offset);
      else super(...(args as [string]));
    }
    static override now(): number {
      return Real.now() + offset;
    }
  }
  globalThis.Date = Shifted as unknown as DateConstructor;
}

export async function recordedResults(specId: string, corpus: Corpus, options: RecordedOptions = {}): Promise<Result[]> {
  const file = recordingPath(specId);
  if (!existsSync(file)) throw new Error(`no recording for spec '${specId}' (${file}); the old server is gone, so write a Next scenario spec instead`);
  const recording = JSON.parse(readFileSync(file, 'utf8')) as Recording;
  shiftClock(recording.recordedAt);
  const sha = corpusSha256(corpus, options.modes);
  if (sha !== recording.corpusSha256) {
    throw new Error(`${CHANGED_CORPUS} (spec '${specId}': recorded corpus ${recording.corpusSha256.slice(0, 12)}, spec runs ${sha.slice(0, 12)})`);
  }
  return recording.results;
}
