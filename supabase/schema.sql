begin;
-- Supabase SQL Editor에서 실행. 기존 로컬 SQLite 데이터는 자동 복사하지 않습니다.
create schema if not exists orbit_private;
revoke all on schema orbit_private from public, anon, authenticated;
create table if not exists orbit_private.tasks (
 id uuid primary key default gen_random_uuid(), title text not null, requester text not null,
 department text not null default '', channel text not null default '', category text not null default '',
 priority text not null default '보통', requested_at timestamptz not null, due_date text not null default '',
 description text not null default '', status text not null default '접수' check(status in ('접수','진행 중','대기','완료')),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), completed_at timestamptz
);
create table if not exists orbit_private.events (
 id bigint generated always as identity primary key, task_id uuid not null references orbit_private.tasks(id),
 at timestamptz not null default clock_timestamp(), actor text not null default '총무 담당자', kind text not null, detail text not null
);
create index if not exists events_task_id on orbit_private.events(task_id,id);
alter table orbit_private.tasks enable row level security;
alter table orbit_private.events enable row level security;
create or replace function orbit_private.protect_events() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Audit events cannot be updated or deleted'; end; $$;
drop trigger if exists events_immutable on orbit_private.events;
create trigger events_immutable before update or delete on orbit_private.events for each row execute function orbit_private.protect_events();

create or replace function public.orbit_api(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t orbit_private.tasks; result jsonb; new_status text; reason text; note text;
begin
 if action='list' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into result from orbit_private.tasks x; return result;
 elsif action='create' then
  if coalesce(btrim(payload->>'title'),'')='' or coalesce(btrim(payload->>'requester'),'')='' or coalesce(payload->>'requested_at','')='' then raise sqlstate 'PT400' using message='제목, 요청자, 요청 시각이 필요합니다.'; end if;
  insert into orbit_private.tasks(title,requester,department,channel,category,priority,requested_at,due_date,description)
  values(payload->>'title',payload->>'requester',coalesce(payload->>'department',''),coalesce(payload->>'channel',''),coalesce(payload->>'category',''),coalesce(payload->>'priority','보통'),(payload->>'requested_at')::timestamptz,coalesce(payload->>'due_date',''),coalesce(payload->>'description','')) returning * into t;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'등록',payload::text);
  return jsonb_build_object('id',t.id);
 end if;
 if action not in ('detail','status','note') then raise sqlstate 'PT400' using message='지원하지 않는 작업입니다.'; end if;
 select * into t from orbit_private.tasks where id=(payload->>'id')::uuid for update;
 if not found then
  if action='detail' then return null; end if;
  raise sqlstate 'PT404' using message='업무를 찾을 수 없습니다.';
 end if;
 if action='detail' then
  select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) into result from orbit_private.events e where e.task_id=t.id;
  return to_jsonb(t)||jsonb_build_object('events',result);
 elsif action='status' then
  new_status:=payload->>'status'; reason:=btrim(coalesce(payload->>'reason',''));
  if new_status is null or new_status not in ('접수','진행 중','대기','완료') then raise sqlstate 'PT400' using message='올바른 상태를 선택하세요.'; end if;
  if new_status=t.status then return jsonb_build_object('ok',true); end if;
  if t.status='완료' and reason='' then raise sqlstate 'PT400' using message='완료 업무를 재개하는 사유를 입력하세요.'; end if;
  update orbit_private.tasks set status=new_status,updated_at=clock_timestamp(),completed_at=case when new_status='완료' then clock_timestamp() else null end where id=t.id;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'상태 변경',t.status||' → '||new_status||case when reason<>'' then ' · '||reason else '' end);
 elsif action='note' then
  note:=btrim(coalesce(payload->>'note','')); if note='' or length(note)>10000 then raise sqlstate 'PT400' using message='메모를 1~10000자로 입력하세요.'; end if;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'처리 메모',note);
 end if;
 return jsonb_build_object('ok',true);
 exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
  raise sqlstate 'PT400' using message='식별자 또는 시각 형식을 확인하세요.';
end; $$;
revoke all on function public.orbit_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.orbit_api(text,jsonb) to service_role;
-- 서버의 service_role 키만 RPC 호출 가능. 브라우저에는 키를 전달하지 않습니다.

commit;
