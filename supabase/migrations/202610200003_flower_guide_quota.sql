-- Global spending guard for the optional Groq guide. No messages are stored.
create table analytics.guide_daily_quota (
  site_id text not null check (site_id = 'no-bloom'),
  usage_date date not null,
  request_count integer not null check (request_count >= 0),
  primary key (site_id, usage_date)
);
alter table analytics.guide_daily_quota enable row level security;
revoke all on analytics.guide_daily_quota from public, anon, authenticated, service_role;

create function analytics.reserve_guide_request(p_site_id text, p_daily_cap integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  if p_site_id <> 'no-bloom' or p_daily_cap not between 1 and 10000 then
    raise exception using errcode = '22023', message = 'invalid guide quota';
  end if;
  insert into analytics.guide_daily_quota (site_id, usage_date, request_count)
    values (p_site_id, (clock_timestamp() at time zone 'UTC')::date, 1)
  on conflict (site_id, usage_date) do update
    set request_count = guide_daily_quota.request_count + 1
    where guide_daily_quota.request_count < p_daily_cap
  returning request_count into v_count;
  return v_count is not null;
end;
$$;
revoke all on function analytics.reserve_guide_request(text,integer) from public, anon, authenticated, service_role;
