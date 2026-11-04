begin;
create table if not exists orbit_private.task_extras(task_id uuid primary key references orbit_private.tasks(id) on delete cascade,assignee text not null default '',assigned_at timestamptz,is_test boolean not null default false);
create table if not exists orbit_private.task_files(id uuid primary key default gen_random_uuid(),task_id uuid not null references orbit_private.tasks(id) on delete cascade,name text not null,type text not null,size integer not null,content text not null,created_at timestamptz not null default clock_timestamp());
create table if not exists orbit_private.improvements(id uuid primary key default gen_random_uuid(),value jsonb not null,revision integer not null default 1,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
create table if not exists orbit_private.improvement_events(id bigint generated always as identity primary key,improvement_id uuid not null references orbit_private.improvements(id),at timestamptz not null default clock_timestamp(),actor text not null default 'admin',before_value jsonb not null,after_value jsonb not null);
create table if not exists orbit_private.monthly_reports(id uuid primary key default gen_random_uuid(),month text not null,created_at timestamptz not null default clock_timestamp(),actor text not null default 'admin',value jsonb not null);
alter table orbit_private.task_extras enable row level security;
alter table orbit_private.task_files enable row level security;
alter table orbit_private.improvements enable row level security;
alter table orbit_private.improvement_events enable row level security;
alter table orbit_private.monthly_reports enable row level security;
drop trigger if exists improvement_audit on orbit_private.improvement_events;
create trigger improvement_audit before update or delete on orbit_private.improvement_events for each row execute function orbit_private.protect_events();
drop trigger if exists report_immutable on orbit_private.monthly_reports;
create trigger report_immutable before update or delete on orbit_private.monthly_reports for each row execute function orbit_private.protect_events();

create or replace function public.orbit_kpi(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t orbit_private.tasks; result jsonb; old orbit_private.improvements; file orbit_private.task_files; ident uuid; who text;
begin
 if action='extras' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from orbit_private.task_extras x;return result;end if;
 if action='improvements' then select coalesce(jsonb_agg(x.value||jsonb_build_object('id',x.id,'revision',x.revision,'created_at',x.created_at,'updated_at',x.updated_at) order by x.updated_at desc),'[]'::jsonb) into result from orbit_private.improvements x;return result;end if;
 if action='improvement_history' then select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'at',x.at,'actor',x.actor,'before',x.before_value,'after',x.after_value) order by x.id),'[]'::jsonb) into result from orbit_private.improvement_events x where improvement_id=(payload->>'id')::uuid;return result;end if;
 if action='improvement_save' then
  if coalesce(btrim(payload->'value'->>'title'),'')='' or coalesce(btrim(payload->'value'->>'feedback'),'')='' then raise sqlstate 'PT400' using message='개선 제목과 피드백이 필요합니다.';end if;
  if coalesce(payload->>'id','')<>'' then select * into old from orbit_private.improvements where id=(payload->>'id')::uuid for update;if not found then raise sqlstate 'PT404' using message='개선 항목을 찾을 수 없습니다.';end if;if old.revision<>(payload->>'revision')::integer then raise sqlstate 'PT409' using message='다른 화면에서 수정됐습니다. 다시 불러오세요.';end if;ident:=old.id;update orbit_private.improvements set value=payload->'value',revision=revision+1,updated_at=clock_timestamp() where id=ident;
  else insert into orbit_private.improvements(value) values(payload->'value') returning id into ident;end if;
  insert into orbit_private.improvement_events(improvement_id,before_value,after_value) values(ident,coalesce(old.value,'{}'::jsonb),payload->'value');return jsonb_build_object('id',ident);
 end if;
 if action='reports' then select coalesce(jsonb_agg(x.value||jsonb_build_object('id',x.id,'month',x.month,'actor',x.actor,'created_at',x.created_at) order by x.created_at desc),'[]'::jsonb) into result from orbit_private.monthly_reports x;return result;end if;
 if action='report_save' then insert into orbit_private.monthly_reports(month,value) values(payload->>'month',payload->'value') returning id into ident;return jsonb_build_object('id',ident);end if;
 if action not in ('detail','assign','mark_test','file_add','file_get','file_delete') then raise sqlstate 'PT400' using message='지원하지 않는 KPI 작업입니다.';end if;
 select * into t from orbit_private.tasks where id=(payload->>'id')::uuid and deleted_at is null for update;
 if not found then raise sqlstate 'PT404' using message='업무를 찾을 수 없습니다.';end if;
 if action='detail' then
  select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'type',x.type,'size',x.size,'created_at',x.created_at) order by x.created_at),'[]'::jsonb) into result from orbit_private.task_files x where task_id=t.id;
  return coalesce((select to_jsonb(x) from orbit_private.task_extras x where x.task_id=t.id),'{}'::jsonb)||jsonb_build_object('files',result,'available',true);
 elsif action='mark_test' then
  insert into orbit_private.task_extras(task_id,is_test) values(t.id,(payload->>'is_test')::boolean) on conflict(task_id) do update set is_test=excluded.is_test;
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','데이터 구분 변경',case when (payload->>'is_test')::boolean then '테스트 업무 · 지표 제외' else '실제 업무 · 지표 포함' end);
 elsif action='assign' then
  who:=btrim(coalesce(payload->>'assignee',''));if who='' or length(who)>100 then raise sqlstate 'PT400' using message='담당자를 1~100자로 입력하세요.';end if;
  insert into orbit_private.task_extras(task_id,assignee,assigned_at) values(t.id,who,clock_timestamp()) on conflict(task_id) do update set assignee=excluded.assignee,assigned_at=coalesce(orbit_private.task_extras.assigned_at,excluded.assigned_at);
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','담당자 배정',who);
 elsif action='file_add' then
  if (select count(*) from orbit_private.task_files where task_id=t.id)>=10 then raise sqlstate 'PT400' using message='업무당 첨부파일은 10개까지 가능합니다.';end if;
  if (payload->>'size')::integer>1048576 or (payload->>'size')::integer<1 then raise sqlstate 'PT400' using message='첨부파일은 1MB 이하여야 합니다.';end if;
  insert into orbit_private.task_files(task_id,name,type,size,content) values(t.id,payload->>'name',payload->>'type',(payload->>'size')::integer,payload->>'content') returning id into ident;
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','첨부파일 등록',payload->>'name');return jsonb_build_object('id',ident);
 else
  select * into file from orbit_private.task_files where task_id=t.id and id=(payload->>'file_id')::uuid;
  if not found then raise sqlstate 'PT404' using message='파일을 찾을 수 없습니다.';end if;
  if action='file_get' then return to_jsonb(file);end if;
  delete from orbit_private.task_files where id=file.id;
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','첨부파일 삭제',file.name);
 end if;
 return jsonb_build_object('ok',true);
exception when invalid_text_representation then raise sqlstate 'PT400' using message='입력 형식을 확인하세요.';
end; $$;
revoke all on function public.orbit_kpi(text,jsonb) from public,anon,authenticated;
grant execute on function public.orbit_kpi(text,jsonb) to service_role;
commit;
