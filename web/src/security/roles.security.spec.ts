// The database role limits of web/db/app-role.sql, run for real: PGlite is PostgreSQL itself (WASM) and enforces
// roles and privileges, so the file is applied unchanged (only its password placeholder is replaced) over the same
// supabase/*.sql schema the app uses, and the checks run after `SET ROLE orbit_app`.
// untested: a managed Supabase/Postgres host (its extra default grants, pooler, TLS) - that needs DATABASE_URL and a superuser.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
let db: PGlite;

before(async () => {
  db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  for (const file of ['schema', 'settings', 'deletion', 'kpi', 'upgrade']) await db.exec(readFileSync(path.join(ROOT, 'supabase', `${file}.sql`), 'utf8'));
  const roleSql = readFileSync(path.join(ROOT, 'web', 'db', 'app-role.sql'), 'utf8').replace('REPLACE-WITH-A-LONG-RANDOM-PASSWORD', 'spec-only-password');
  await db.exec(roleSql);
  await db.exec('SET ROLE orbit_app');
});
after(async () => db?.close());

const refused = async (sql: string): Promise<string> => {
  try {
    await db.exec(sql);
  } catch (error) {
    return String((error as Error).message);
  }
  throw new Error(`the statement was allowed: ${sql}`);
};

describe('orbit_app (web/db/app-role.sql)', () => {
  it('is no superuser, owns nothing and does not bypass row-level security', async () => {
    const role = await db.query<{ rolsuper: boolean; rolbypassrls: boolean; rolcreatedb: boolean; rolcreaterole: boolean }>(
      "select rolsuper, rolbypassrls, rolcreatedb, rolcreaterole from pg_roles where rolname = 'orbit_app'");
    assert.deepEqual(role.rows[0], { rolsuper: false, rolbypassrls: false, rolcreatedb: false, rolcreaterole: false });
    const owned = await db.query("select 1 from pg_class c join pg_roles r on r.oid = c.relowner where r.rolname = 'orbit_app'");
    assert.equal(owned.rows.length, 0);
  });
  it('can call the five functions and works through them', async () => {
    const created = await db.query<{ data: { id: string } }>(
      `select public.orbit_api('create', '{"title":"t","requester":"r","requested_at":"2026-11-03T01:00:00Z"}'::jsonb) as data`);
    assert.match(created.rows[0].data.id, /^[0-9a-f-]{36}$/);
  });
  it('cannot read or write the tables directly', async () => {
    assert.match(await refused('select * from orbit_private.events'), /permission denied/);
    assert.match(await refused('select * from orbit_private.tasks'), /permission denied/);
    assert.match(await refused("insert into orbit_private.events(task_id, type) values (gen_random_uuid(), 'x')"), /permission denied|violates|column/);
  });
  it('cannot change history: update, delete, TRUNCATE, DISABLE TRIGGER, DROP', async () => {
    assert.match(await refused("update orbit_private.events set type = 'x'"), /permission denied/);
    assert.match(await refused('delete from orbit_private.events'), /permission denied/);
    assert.match(await refused('truncate orbit_private.events'), /permission denied/);
    assert.match(await refused('alter table orbit_private.events disable trigger events_immutable'), /must be owner|permission denied/);
    assert.match(await refused('drop trigger events_immutable on orbit_private.events'), /must be owner|permission denied/);
    assert.match(await refused('drop table orbit_private.events'), /must be owner|permission denied/);
  });
  it('cannot create objects in schema public or orbit_private', async () => {
    assert.match(await refused('create table public.evil(id int)'), /permission denied/);
    assert.match(await refused('create table orbit_private.evil(id int)'), /permission denied/);
  });
  it('holds exactly the five execute grants and no table privilege', async () => {
    await db.exec('RESET ROLE');
    try {
      const routines = await db.query<{ routine_name: string }>("select routine_name from information_schema.routine_privileges where grantee = 'orbit_app' and routine_schema = 'public' order by 1");
      assert.deepEqual(routines.rows.map((row) => row.routine_name), ['orbit_api', 'orbit_edit_task', 'orbit_kpi', 'orbit_lifecycle', 'orbit_settings']);
      const tables = await db.query("select 1 from information_schema.table_privileges where grantee = 'orbit_app'");
      assert.equal(tables.rows.length, 0);
    } finally {
      await db.exec('SET ROLE orbit_app');
    }
  });
});
