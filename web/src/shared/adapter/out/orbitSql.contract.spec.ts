// The SQL contract of supabase/*.sql, run in a fresh PGlite: grants per role, the five functions, transactions,
// immutable history and idempotent re-application. Moved from test/supabase.test.js; the test title and every
// assertion are kept. The legacy store's HTTP layer (supabase-store.js) is replaced by direct function calls with
// the same error mapping: PT400/PT404/PT409 keep their message, any other SQL error becomes 'Supabase request failed'.
// untested: the HTTP wiring of the legacy store (apikey header, PGRST202 -> *_MIGRATION_REQUIRED) and the production
// start refusal of server.js; they belong to the legacy server and are not SQL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ORBIT_FUNCTION_NAMES } from '../../port/OrbitFunctions.ts';
import { readSupabaseSql, SCHEMA_FILES } from './PgliteOrbitFunctions.ts';

// Results are JSON documents whose shape the assertions below spell out field by field.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

test('PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
    // Each file is applied twice: re-running them must be harmless.
    for (const file of SCHEMA_FILES) {
      const text = readSupabaseSql(file);
      await db.exec(text);
      await db.exec(text);
    }
    const upgrade = readSupabaseSql('upgrade');
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query("SELECT public.orbit_api('list','{}'::jsonb)"), /permission denied/);
    await assert.rejects(db.query("SELECT public.orbit_settings('get','{}'::jsonb)"), /permission denied/);
    await assert.rejects(db.query("SELECT public.orbit_kpi('extras','{}'::jsonb)"), /permission denied/);
    await db.exec('RESET ROLE');
    await db.exec('SET ROLE authenticated');
    await assert.rejects(db.query("SELECT public.orbit_api('list','{}'::jsonb)"), /permission denied/);
    await db.exec('RESET ROLE');
    await db.exec('SET ROLE service_role');

    // What PostgREST returns to the legacy store: a PT code keeps its message, anything else is opaque.
    const fail = (e: { code?: string; message: string }, opaque: string): Error => {
      if (['PT400', 'PT404', 'PT409'].includes(e.code ?? '')) return new Error(e.message);
      return new Error(opaque);
    };
    const rpc = async (action: string, payload: unknown = {}, name = 'orbit_api'): Promise<Json> => {
      assert.ok((ORBIT_FUNCTION_NAMES as readonly string[]).includes(name));
      try {
        const result = await db.query('SELECT public.' + name + '($1,$2::jsonb) AS data', [action, JSON.stringify(payload)]);
        return (result.rows[0] as { data: unknown }).data;
      } catch (e) {
        throw fail(e as { code?: string; message: string }, 'Supabase request failed');
      }
    };
    const remoteKpi = (a: string, p: unknown = {}) => rpc(a, p, 'orbit_kpi');
    const store = {
      edit: async (id: string, values: unknown, revision: number, reason: string): Promise<Json> => {
        try {
          const result = await db.query('SELECT public.orbit_edit_task($1::jsonb) AS data', [JSON.stringify({ id, values, revision, reason })]);
          return (result.rows[0] as { data: unknown }).data;
        } catch (e) {
          throw fail(e as { code?: string; message: string }, '업무 수정 저장에 실패했습니다.');
        }
      },
      trash: () => rpc('trash', {}, 'orbit_lifecycle'),
      lifecycleHistory: () => rpc('history', {}, 'orbit_lifecycle'),
      lifecycle: (id: string, action: string, reason: string, confirmation: string) => rpc(action, { id, reason, confirmation }, 'orbit_lifecycle'),
      settings: () => rpc('get', {}, 'orbit_settings'),
      settingsHistory: () => rpc('history', {}, 'orbit_settings'),
      saveSettings: (values: unknown, revision: number) => rpc('save', { values, revision }, 'orbit_settings'),
      list: () => rpc('list'),
      detail: (id: string, includeDeleted = false) => rpc('detail', { id, include_deleted: includeDeleted }),
      create: (task: unknown) => rpc('create', task),
      status: (id: string, status: string, reason: string) => rpc('status', { id, status, reason }),
      note: (id: string, note: string) => rpc('note', { id, note }),
    };

    assert.deepEqual(await store.list(), []);
    assert.equal((await store.settings()).revision, 0);
    await store.saveSettings({ texts: { portalName: '테스트 포털' } }, 0);
    assert.equal((await store.settings()).values.texts.portalName, '테스트 포털');
    await assert.rejects(store.saveSettings({ texts: {} }, 0), /다른 화면/);
    assert.equal((await store.settingsHistory()).length, 1);

    const { id } = await store.create({ title: '테스트 요청', requester: '홍길동', requested_at: '2026-11-03T01:00:00Z' });
    await store.status(id, '진행 중', '');
    await store.note(id, '준비 완료');
    await store.status(id, '완료', '');
    await assert.rejects(store.status(id, '진행 중', ''), /재개하는 사유/);
    let task = await store.detail(id);
    assert.equal(task.status, '완료');
    assert.equal(task.events.length, 4);
    assert.ok(task.completed_at);
    await store.status(id, '진행 중', '추가 요청');
    task = await store.detail(id);
    assert.equal(task.completed_at, null);
    assert.equal(task.events.length, 5);
    await assert.rejects(store.note('00000000-0000-0000-0000-000000000000', '없음'), /찾을 수 없습니다/);
    for (const status of ['접수', '진행 중', '대기', '완료']) {
      const gone = await store.create({ title: '삭제 테스트 ' + status, requester: '담당자', requested_at: '2026-11-03T01:00:00Z' });
      await store.status(gone.id, status, '');
      await remoteKpi('file_add', { id: gone.id, name: '삭제.txt', type: 'text/plain', size: 3, content: 'YWJj' });
      await store.lifecycle(gone.id, 'delete', '테스트 정리', '');
      assert.ok(!(await store.list()).some((t: Json) => t.id === gone.id));
      await assert.rejects(store.detail(gone.id), /찾을 수 없습니다/);
      assert.ok((await store.detail(gone.id, true)).deleted_at);
      await store.lifecycle(gone.id, 'restore', '복원 확인', '');
      assert.equal((await store.detail(gone.id)).status, status);
      await store.lifecycle(gone.id, 'delete', '테스트 정리', '');
      await assert.rejects(store.lifecycle(gone.id, 'purge', '정리', '틀린 제목'), /제목/);
      await store.lifecycle(gone.id, 'purge', '정리', '삭제 테스트 ' + status);
      assert.equal(await store.detail(gone.id), null);
    }
    assert.equal((await store.trash()).length, 0);
    assert.equal((await store.lifecycleHistory()).filter((e: Json) => e.action === 'purge').length, 4);
    const beforeEdit = await store.detail(id);
    const changed = Object.fromEntries(['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description'].map((k) => [k, beforeEdit[k]]));
    changed.requester = '수정 요청자';
    changed.due_date = '2026-12-01';
    await store.edit(id, changed, 0, '요청자와 기한 정정');
    assert.equal((await store.detail(id)).requester, '수정 요청자');
    await assert.rejects(store.edit(id, changed, 0, '충돌 확인'), /다른 화면/);
    await remoteKpi('assign', { id, assignee: '피플팀 담당' });
    const kpiDetail = await remoteKpi('detail', { id });
    assert.equal(kpiDetail.assignee, '피플팀 담당');
    assert.ok(kpiDetail.assigned_at);
    await remoteKpi('mark_test', { id, is_test: true });
    assert.equal((await remoteKpi('extras'))[0].is_test, true);
    await remoteKpi('mark_test', { id, is_test: false });
    const attachment = await remoteKpi('file_add', { id, name: '근거.txt', type: 'text/plain', size: 3, content: 'YWJj' });
    assert.equal((await remoteKpi('file_get', { id, file_id: attachment.id })).content, 'YWJj');
    await remoteKpi('file_delete', { id, file_id: attachment.id });
    const imp = await remoteKpi('improvement_save', { value: { title: '개선', feedback: '피드백', stage: '본인 실사용', status: '개선 중' } });
    await remoteKpi('improvement_save', { id: imp.id, revision: 1, value: { title: '개선 완료', feedback: '피드백', stage: '본인 실사용', status: '검증 완료', result: '검증' } });
    assert.equal((await remoteKpi('improvement_history', { id: imp.id })).length, 2);
    await assert.rejects(remoteKpi('improvement_save', { id: imp.id, revision: 1, value: { title: '개선', feedback: '피드백' } }), /다른 화면/);
    await remoteKpi('report_save', { month: '2026-11', value: { metrics: { completed: 1 }, draft: '발행본' } });
    assert.equal((await remoteKpi('reports'))[0].draft, '발행본');
    await db.exec('RESET ROLE');
    await db.exec(upgrade);
    await db.exec('SET ROLE service_role');
    assert.equal((await remoteKpi('reports'))[0].draft, '발행본');
    assert.equal((await remoteKpi('detail', { id })).assignee, '피플팀 담당');
    await db.exec('RESET ROLE');
    await assert.rejects(db.exec('DELETE FROM orbit_private.monthly_reports'), /cannot be updated or deleted/);
    await assert.rejects(db.exec('DELETE FROM orbit_private.improvement_events'), /cannot be updated or deleted/);
    assert.equal((await db.query('SELECT count(*)::integer AS n FROM orbit_private.tasks')).rows[0].n, 1);
    await assert.rejects(db.exec('DELETE FROM orbit_private.task_lifecycle_events'), /cannot be updated or deleted/);
    await assert.rejects(db.exec('DELETE FROM orbit_private.settings_events'), /cannot be updated or deleted/);
    await assert.rejects(db.exec('DELETE FROM orbit_private.events'), /cannot be updated or deleted/);
    await assert.rejects(db.exec("UPDATE orbit_private.events SET detail='변조'"), /cannot be updated or deleted/);
    await db.exec("CREATE FUNCTION orbit_private.reject_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test write failure'; END; $$; CREATE TRIGGER test_reject BEFORE INSERT ON orbit_private.events FOR EACH ROW EXECUTE FUNCTION orbit_private.reject_event(); SET ROLE service_role;");
    await assert.rejects(store.status(id, '완료', ''), /Supabase request failed/);
    assert.equal((await store.detail(id)).status, '진행 중'); // 이력 삽입 실패 시 상태도 롤백
  } finally {
    await db.close();
  }
});
