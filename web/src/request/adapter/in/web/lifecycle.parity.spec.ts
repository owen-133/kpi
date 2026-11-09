// R-031 R-026 R-027
// Parity of the edit, delete, restore, purge, trash and deletion-history routes: the Next candidate (over PGlite)
// answers whole scenarios like the frozen recording of the old portal. Two sources of scenarios:
//   - the corpus (test/golden/requests.js): char-tasks `ct-edit-*` with the registration steps their ids come from, and the
//     secured golden scenario without the static page files (they are served by Next, not by the pipeline);
//   - `lifecycle-extra`, written here because the corpus has no delete / restore / purge / trash / history step. It uses
//     the corpus conventions (`{{name}}` ids saved from responses) and lives in this file only.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compare, formatDifferences, loadCorpus, runCorpus } from '../../../../parity/runner.ts';
import type { Corpus, Result, Scenario, Step } from '../../../../parity/runner.ts';
import { ADMIN_PASSWORD, VIEWER_PASSWORD, pgliteAvailable } from '../../../../parity/credentials.ts';
import { recordedResults } from '../../../../parity/recordedOracle.ts';
import { startNextCandidate } from '../../../../parity/nextCandidate.ts';

const KEEP: Record<string, RegExp> = {
  secured: /^(?!static-|page-not-found|page-no-public-prefix)/,
  'char-tasks': /^ct-(new-|edit-|list-final)/,
};

const admin = { user: 'admin', password: ADMIN_PASSWORD };
const viewer = { user: 'viewer', password: VIEWER_PASSWORD };
const GHOST = '00000000-0000-4000-8000-000000000001';
const input = { title: '삭제 시나리오', requester: '홍길동', department: '인사팀', channel: '메신저', category: '비품·자산', priority: '높음', requested_at: '2026-11-03T01:00:00Z', due_date: '2026-11-05', description: '설명' };
const edited = { ...input, title: '수정된 업무', requester: '수정 요청자', description: '수정된 내용' };
const get = (label: string, path: string, over: Partial<Step> = {}): Step => ({ label, path, ...admin, ...over });
const post = (label: string, path: string, body: unknown, over: Partial<Step> = {}): Step => ({ label, path, method: 'POST', body, ...admin, ...over });

// The extra scenario: one task goes through every trash state; a second one is purged for good.
const lifecycleSteps: Step[] = [
  post('lc-new-1', '/api/tasks', input, { save: { one: 'id' } }),
  post('lc-new-2', '/api/tasks', { ...input, title: '영구 삭제 대상' }, { save: { two: 'id' } }),
  get('lc-trash-empty', '/api/trash'),
  get('lc-history-empty', '/api/lifecycle-history'),
  get('lc-viewer-trash-403', '/api/trash', viewer),
  get('lc-viewer-history-403', '/api/lifecycle-history', viewer),
  post('lc-viewer-delete-403', '/api/tasks/{{one}}/delete', { reason: '사유' }, viewer),
  post('lc-viewer-restore-403', '/api/tasks/{{one}}/restore', { reason: '사유' }, viewer),
  post('lc-viewer-purge-403', '/api/tasks/{{one}}/purge', { reason: '사유', confirmation: '삭제 시나리오' }, viewer),
  post('lc-trash-post-404', '/api/trash', {}),
  get('lc-edit-get-404', '/api/tasks/{{one}}/edit'),
  get('lc-delete-get-404', '/api/tasks/{{one}}/delete'),
  post('lc-delete-reason-missing-400', '/api/tasks/{{one}}/delete', {}),
  post('lc-delete-reason-blank-400', '/api/tasks/{{one}}/delete', { reason: '   ' }),
  post('lc-delete-reason-1001-400', '/api/tasks/{{one}}/delete', { reason: 'a'.repeat(1001) }),
  post('lc-restore-reason-blank-400', '/api/tasks/{{one}}/restore', { reason: '' }),
  post('lc-purge-reason-1001-400', '/api/tasks/{{one}}/purge', { reason: 'a'.repeat(1001), confirmation: '삭제 시나리오' }),
  post('lc-delete-unknown-404', `/api/tasks/${GHOST}/delete`, { reason: '사유' }),
  post('lc-delete-not-an-id-400', '/api/tasks/not-a-uuid/delete', { reason: '사유' }),
  post('lc-edit-not-an-id-400', '/api/tasks/not-a-uuid/edit', { values: edited, revision: 0, reason: '사유' }),
  post('lc-restore-not-deleted-409', '/api/tasks/{{one}}/restore', { reason: '사유' }),
  post('lc-purge-not-deleted-409', '/api/tasks/{{one}}/purge', { reason: '사유', confirmation: '삭제 시나리오' }),
  post('lc-delete-reason-1', '/api/tasks/{{one}}/delete', { reason: 'a' }),
  post('lc-delete-again-409', '/api/tasks/{{one}}/delete', { reason: '사유' }),
  get('lc-detail-admin-deleted', '/api/tasks/{{one}}'),
  get('lc-detail-viewer-deleted-404', '/api/tasks/{{one}}', viewer),
  get('lc-list-after-delete', '/api/tasks'),
  get('lc-trash-after-delete', '/api/trash'),
  post('lc-edit-deleted-409', '/api/tasks/{{one}}/edit', { values: edited, revision: 0, reason: '사유' }),
  post('lc-status-deleted-404', '/api/tasks/{{one}}/status', { status: '완료' }),
  post('lc-note-deleted-404', '/api/tasks/{{one}}/notes', { note: '메모' }),
  post('lc-purge-wrong-confirmation-400', '/api/tasks/{{one}}/purge', { reason: '사유', confirmation: '다른 제목' }),
  post('lc-purge-empty-confirmation-400', '/api/tasks/{{one}}/purge', { reason: '사유' }),
  post('lc-purge-padded-confirmation-400', '/api/tasks/{{one}}/purge', { reason: '사유', confirmation: ' 삭제 시나리오 ' }),
  post('lc-purge-number-confirmation-400', '/api/tasks/{{one}}/purge', { reason: '사유', confirmation: 123 }),
  post('lc-restore-reason-1000', '/api/tasks/{{one}}/restore', { reason: 'b'.repeat(1000) }),
  post('lc-restore-again-409', '/api/tasks/{{one}}/restore', { reason: '사유' }),
  get('lc-detail-restored', '/api/tasks/{{one}}'),
  post('lc-edit-restored-ok', '/api/tasks/{{one}}/edit', { values: edited, revision: 0, reason: '복원 후 수정' }),
  post('lc-edit-stale-409', '/api/tasks/{{one}}/edit', { values: { ...edited, title: '낡음' }, revision: 0, reason: '사유' }),
  post('lc-edit-revision-ahead-409', '/api/tasks/{{one}}/edit', { values: edited, revision: 9, reason: '사유' }),
  post('lc-edit-due-0230-400', '/api/tasks/{{one}}/edit', { values: { ...edited, due_date: '2026-02-30' }, revision: 1, reason: '사유' }),
  post('lc-edit-field-10000-200', '/api/tasks/{{one}}/edit', { values: { ...edited, description: 'a'.repeat(10000) }, revision: 1, reason: '사유' }),
  post('lc-edit-padded-10001-400', '/api/tasks/{{one}}/edit', { values: { ...edited, description: ' ' + 'a'.repeat(10000) }, revision: 2, reason: '사유' }),
  post('lc-edit-values-array-400', '/api/tasks/{{one}}/edit', { values: [], revision: 2, reason: '사유' }),
  post('lc-edit-values-string-400', '/api/tasks/{{one}}/edit', { values: 'x', revision: 2, reason: '사유' }),
  post('lc-edit-revision-2.0-200', '/api/tasks/{{one}}/edit', { values: { ...edited, title: '정수 2.0' }, revision: 2.0, reason: '사유' }),
  get('lc-detail-after-edits', '/api/tasks/{{one}}'),
  post('lc-delete-two', '/api/tasks/{{two}}/delete', { reason: '정리 대상' }),
  get('lc-trash-two', '/api/trash'),
  post('lc-purge-two', '/api/tasks/{{two}}/purge', { reason: '영구 삭제', confirmation: '영구 삭제 대상' }),
  post('lc-purge-two-again-404', '/api/tasks/{{two}}/purge', { reason: '영구 삭제', confirmation: '영구 삭제 대상' }),
  get('lc-detail-purged-404', '/api/tasks/{{two}}'),
  get('lc-detail-purged-viewer-404', '/api/tasks/{{two}}', viewer),
  get('lc-trash-final', '/api/trash'),
  get('lc-history-final', '/api/lifecycle-history'),
  get('lc-list-final', '/api/tasks'),
];

async function lifecycleCorpus(): Promise<{ corpus: Corpus; labels: string[] }> {
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
  scenarios.push({ name: 'lifecycle-extra', mode: 'secured', golden: false, steps: lifecycleSteps });
  labels.push(...lifecycleSteps.map((step) => `lifecycle-extra/${step.label}`));
  return { corpus: { ...full, scenarios }, labels };
}

// A list is ordered by timestamps that tie within one clock tick and are then ordered by random uuid, so two runs of the
// SAME implementation may order them differently: lists of tasks (list, trash) are compared as sets of rows. The deletion
// history is ordered by an identity number, deterministic in both, so it is compared in order.
const LIST_LABEL = /list|trash/;
function withListsAsSets(results: Result[]): Result[] {
  return results.map((result) => {
    const body = result.body;
    if (!LIST_LABEL.test(result.label) || !('json' in body) || !Array.isArray(body.json) || !body.json.every((row) => row !== null && typeof row === 'object' && 'id' in row)) return result;
    const rows = [...body.json].sort((a, b) => String((a as { id: unknown }).id).localeCompare(String((b as { id: unknown }).id)));
    return { ...result, body: { json: rows } };
  });
}

describe('lifecycle parity: legacy oracle vs Next candidate', () => {
  const skip = pgliteAvailable() ? false : 'PGlite not available: run (cd web && npm ci)';
  it('answers the edit and trash scenarios like the legacy oracle', { skip, timeout: 300_000 }, async (t) => {
    const { corpus, labels } = await lifecycleCorpus();
    t.diagnostic(`covered (${labels.length}): ${labels.join(', ')}`);
    const declared = labels.length;
    for (const required of ['char-tasks/ct-edit-valid', 'char-tasks/ct-edit-stale-revision', 'char-tasks/ct-edit-revision-null', 'char-tasks/ct-edit-viewer', 'char-tasks/ct-edit-ghost', 'lifecycle-extra/lc-delete-reason-1', 'lifecycle-extra/lc-restore-reason-1000', 'lifecycle-extra/lc-purge-two', 'lifecycle-extra/lc-viewer-trash-403', 'lifecycle-extra/lc-history-final']) {
      assert.ok(labels.includes(required), `label ${required} must be covered`);
    }
    const expected = await recordedResults('lifecycle', corpus, { canonicalize: withListsAsSets });
    const actual = await runCorpus(startNextCandidate, corpus);
    assert.equal(expected.length, declared, 'every declared step ran on the legacy oracle');
    assert.equal(actual.length, declared, 'every declared step ran on the candidate');
    const diffs = compare(expected, withListsAsSets(actual));
    assert.equal(diffs.length, 0, `${diffs.length} differences\n${formatDifferences(diffs)}`);
    // the scenarios really reached the new routes: the legacy answers carry the statuses the hints in the corpus expect
    const status = (key: string) => expected.find((r) => r.key === key)?.status;
    assert.equal(status('char-tasks/ct-edit-valid'), 200);
    assert.equal(status('char-tasks/ct-edit-stale-revision'), 409);
    assert.equal(status('lifecycle-extra/lc-delete-reason-1'), 200);
    assert.equal(status('lifecycle-extra/lc-purge-two'), 200);
    assert.equal(status('lifecycle-extra/lc-viewer-trash-403'), 403);
  });
});
