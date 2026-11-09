-- Documentation SQL for the DATABASE OWNER to run once, by hand, in the Supabase SQL Editor.
-- No code in this repository runs it. Replace the password placeholder before running.
--
-- Why a dedicated role: the app must reach data ONLY through the five SECURITY DEFINER functions of supabase/*.sql.
-- The functions hold the rules (validation, revision checks, append-only history). A role with table-level
-- rights could write the tables directly and skip them: the history triggers (orbit_private.protect_events) guard
-- update/delete on the history tables, but TRUNCATE, ALTER TABLE ... DISABLE TRIGGER, or owning the table lets a
-- caller bypass them. So the role below
--   * is NOT the owner of anything (it never ran the schema scripts),
--   * has NOBYPASSRLS (row-level security always applies to it),
--   * can use schema public and execute exactly the five functions,
--   * has NO privileges on any table, sequence or on schema orbit_private.
-- The app connects with this role through DATABASE_URL (TLS verified, see web/src/config/databaseSecurity.ts).

create role orbit_app login password 'REPLACE-WITH-A-LONG-RANDOM-PASSWORD' nosuperuser nocreatedb nocreaterole noinherit nobypassrls;

-- Start from nothing, then grant only what the app needs.
revoke all on schema public from orbit_app;
revoke all on all tables in schema public from orbit_app;
revoke all on all sequences in schema public from orbit_app;
revoke all on all functions in schema public from orbit_app;

grant usage on schema public to orbit_app;

grant execute on function public.orbit_api(text, jsonb) to orbit_app;
grant execute on function public.orbit_lifecycle(text, jsonb) to orbit_app;
grant execute on function public.orbit_settings(text, jsonb) to orbit_app;
grant execute on function public.orbit_kpi(text, jsonb) to orbit_app;
grant execute on function public.orbit_edit_task(jsonb) to orbit_app;

-- Check (expect the five functions and no table rows):
--   select routine_name from information_schema.routine_privileges where grantee = 'orbit_app' and routine_schema = 'public';
--   select table_schema, table_name, privilege_type from information_schema.table_privileges where grantee = 'orbit_app';
