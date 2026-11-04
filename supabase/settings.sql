begin;
create table if not exists orbit_private.portal_settings (
 id integer primary key check(id=1), value jsonb not null default '{}'::jsonb,
 revision integer not null default 0
);
insert into orbit_private.portal_settings(id) values(1) on conflict do nothing;
create table if not exists orbit_private.settings_events (
 id bigint generated always as identity primary key, at timestamptz not null default clock_timestamp(),
 actor text not null default 'admin', before_value jsonb not null, after_value jsonb not null
);
alter table orbit_private.portal_settings enable row level security;
alter table orbit_private.settings_events enable row level security;
drop trigger if exists settings_events_immutable on orbit_private.settings_events;
create trigger settings_events_immutable before update or delete on orbit_private.settings_events for each row execute function orbit_private.protect_events();
create or replace function public.orbit_settings(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s orbit_private.portal_settings; result jsonb;
begin
 if action='history' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]'::jsonb) into result from
   (select id,at,actor,before_value as before,after_value as after from orbit_private.settings_events order by id desc limit 30) x;
  return result;
 end if;
 if action not in ('get','save') then raise sqlstate 'PT400' using message='지원하지 않는 설정 작업입니다.'; end if;
 select * into s from orbit_private.portal_settings where id=1 for update;
 if action='get' then return jsonb_build_object('values',s.value,'revision',s.revision,'available',true); end if;
 if jsonb_typeof(payload->'values') is distinct from 'object' or jsonb_typeof(payload->'revision') is distinct from 'number' then
  raise sqlstate 'PT400' using message='설정 형식을 확인하세요.';
 end if;
 if (payload->>'revision')::integer<>s.revision then raise sqlstate 'PT409' using message='다른 화면에서 설정이 변경됐습니다. 다시 불러온 뒤 저장하세요.'; end if;
 insert into orbit_private.settings_events(before_value,after_value) values(s.value,payload->'values');
 update orbit_private.portal_settings set value=payload->'values',revision=s.revision+1 where id=1;
 return jsonb_build_object('values',payload->'values','revision',s.revision+1,'available',true);
end; $$;
revoke all on function public.orbit_settings(text,jsonb) from public,anon,authenticated;
grant execute on function public.orbit_settings(text,jsonb) to service_role;
commit;
