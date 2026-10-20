-- Recognized browsers currently retained for NỞ. Keep this separate from page views.
create table analytics.visitor_counter_state (
  site_id text primary key check (site_id = 'no-bloom'),
  next_ordinal bigint not null default 1 check (next_ordinal > 0)
);

create table analytics.visitor_records (
  site_id text not null check (site_id = 'no-bloom'),
  visitor_key text not null check (visitor_key ~ '^[0-9a-f]{64}$'),
  ordinal bigint not null check (ordinal > 0),
  role text not null default 'unspecified' check (role = 'unspecified'),
  country text not null default 'unknown' check (country = 'unknown' or country ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  role_updated_at timestamptz,
  primary key (site_id, visitor_key),
  unique (site_id, ordinal)
);
create index visitor_records_created_idx on analytics.visitor_records (site_id, created_at);

create table analytics.counter_request_buckets (
  site_id text not null check (site_id = 'no-bloom'),
  bucket_kind text not null check (bucket_kind in ('minute', 'day')),
  bucket_start timestamptz not null,
  request_count integer not null check (request_count >= 0),
  expires_at timestamptz not null,
  primary key (site_id, bucket_kind, bucket_start)
);

alter table analytics.visitor_counter_state enable row level security;
alter table analytics.visitor_records enable row level security;
alter table analytics.counter_request_buckets enable row level security;
revoke all on analytics.visitor_counter_state, analytics.visitor_records, analytics.counter_request_buckets from public, anon, authenticated, service_role;

-- A site-row lock serializes first visits, role updates, and count snapshots.
-- The HMAC key is produced in the Edge Function. No raw UUID enters this table.
create function analytics.record_browser(
  p_site_id text, p_visitor_key text, p_role text, p_country text,
  p_minute_cap integer default 60, p_day_cap integer default 10000
) returns table (total bigint, ordinal bigint, role_count bigint, countries bigint)
language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_next bigint;
  v_existing analytics.visitor_records%rowtype;
  v_count integer;
begin
  if p_site_id is null or p_visitor_key is null or p_role is null or p_country is null
    or p_site_id <> 'no-bloom' or p_visitor_key !~ '^[0-9a-f]{64}$'
    or p_role <> 'unspecified'
    or (p_country <> 'unknown' and p_country !~ '^[A-Z]{2}$')
    or p_minute_cap not between 1 and 1000 or p_day_cap not between 1 and 100000
  then
    raise exception using errcode = '22023', message = 'invalid counter request';
  end if;

  insert into analytics.counter_request_buckets(site_id, bucket_kind, bucket_start, request_count, expires_at)
  values (p_site_id, 'minute', date_trunc('minute', v_now), 1, v_now + interval '2 minutes')
  on conflict (site_id, bucket_kind, bucket_start) do update
    set request_count = counter_request_buckets.request_count + 1
    where counter_request_buckets.request_count < p_minute_cap
  returning request_count into v_count;
  if v_count is null then raise exception using errcode = 'P0001', message = 'counter rate limited'; end if;

  v_count := null;
  insert into analytics.counter_request_buckets(site_id, bucket_kind, bucket_start, request_count, expires_at)
  values (p_site_id, 'day', date_trunc('day', v_now), 1, v_now + interval '2 days')
  on conflict (site_id, bucket_kind, bucket_start) do update
    set request_count = counter_request_buckets.request_count + 1
    where counter_request_buckets.request_count < p_day_cap
  returning request_count into v_count;
  if v_count is null then raise exception using errcode = 'P0001', message = 'counter rate limited'; end if;

  insert into analytics.visitor_counter_state(site_id, next_ordinal)
  values (p_site_id, 1) on conflict (site_id) do nothing;
  select s.next_ordinal into v_next from analytics.visitor_counter_state s
    where s.site_id = p_site_id for update;
  select r.* into v_existing from analytics.visitor_records r
    where r.site_id = p_site_id and r.visitor_key = p_visitor_key for update;

  if not found then
    insert into analytics.visitor_records(site_id, visitor_key, ordinal, role, country, created_at)
    values (p_site_id, p_visitor_key, v_next, p_role, p_country, v_now)
    returning * into v_existing;
    update analytics.visitor_counter_state s set next_ordinal = v_next + 1 where s.site_id = p_site_id;
  elsif p_role <> 'unspecified' and p_role <> v_existing.role then
    -- A later allowlist migration can enable explicit roles. Unspecified never
    -- erases one, and all changes remain serialized under the site lock.
    update analytics.visitor_records r set role = p_role, role_updated_at = v_now
      where r.site_id = p_site_id and r.visitor_key = p_visitor_key
      returning * into v_existing;
  end if;

  return query select
    (select count(*) from analytics.visitor_records r where r.site_id = p_site_id),
    v_existing.ordinal,
    (select count(*) from analytics.visitor_records r where r.site_id = p_site_id and r.role = v_existing.role),
    (select count(distinct r.country) from analytics.visitor_records r where r.site_id = p_site_id and r.country <> 'unknown');
end;
$$;

-- Run only through a reviewed maintenance schedule. Never reset next_ordinal.
create function analytics.prune_counter(retention_days integer default 365)
returns table (deleted_visitors bigint, deleted_buckets bigint)
language plpgsql security invoker set search_path = '' as $$
declare v_next bigint;
begin
  if retention_days not between 30 and 3650 then
    raise exception using errcode = '22023', message = 'invalid counter retention';
  end if;
  select s.next_ordinal into v_next from analytics.visitor_counter_state s
    where s.site_id = 'no-bloom' for update;
  delete from analytics.visitor_records where site_id = 'no-bloom' and created_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_visitors = row_count;
  delete from analytics.counter_request_buckets where expires_at < now();
  get diagnostics deleted_buckets = row_count;
  return next;
end;
$$;

revoke all on function analytics.record_browser(text,text,text,text,integer,integer) from public, anon, authenticated, service_role;
revoke all on function analytics.prune_counter(integer) from public, anon, authenticated, service_role;
revoke all on schema analytics from public, anon, authenticated, service_role;
