-- Private visitor analytics. Only the server's database connection may execute ingestion.
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated, service_role;

create table analytics.analytics_events (
  event_id uuid not null,
  site_id text not null check (site_id = 'no-bloom'),
  event_name text not null default 'page_view' check (event_name = 'page_view'),
  page_key text not null check (page_key in ('invitation', 'shared_card')),
  visitor_id uuid,
  source_category text not null check (source_category in ('facebook', 'instagram', 'tiktok', 'youtube', 'google', 'other', 'direct_or_unknown')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  primary key (site_id, event_id)
);
create index analytics_events_received_idx on analytics.analytics_events (site_id, received_at);
create index analytics_events_visitor_idx on analytics.analytics_events (site_id, visitor_id, received_at) where visitor_id is not null;

create table analytics.analytics_daily_totals (
  site_id text not null check (site_id = 'no-bloom'),
  reporting_date date not null,
  page_views bigint not null default 0 check (page_views >= 0),
  primary key (site_id, reporting_date)
);

create table analytics.request_buckets (
  site_id text not null check (site_id = 'no-bloom'),
  bucket_kind text not null check (bucket_kind in ('minute', 'day')),
  bucket_start timestamptz not null,
  request_count integer not null check (request_count >= 0),
  expires_at timestamptz not null,
  primary key (site_id, bucket_kind, bucket_start)
);

alter table analytics.analytics_events enable row level security;
alter table analytics.analytics_daily_totals enable row level security;
alter table analytics.request_buckets enable row level security;
revoke all on all tables in schema analytics from public, anon, authenticated, service_role;

create function analytics.reporting_date(p_received_at timestamptz) returns date
language sql immutable security invoker set search_path = '' as $$
  select (p_received_at at time zone 'Asia/Ho_Chi_Minh')::date;
$$;

-- The Edge Function calls this over its private Postgres connection. A single
-- transaction enforces distributed caps, deduplicates, and updates the total.
create function analytics.record_page_view(
  p_event_id uuid, p_site_id text, p_page_key text, p_visitor_id uuid,
  p_source_category text, p_occurred_at timestamptz,
  p_minute_cap integer default 60, p_day_cap integer default 10000
) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_received_at timestamptz := clock_timestamp();
  v_inserted boolean := false;
  v_count integer;
begin
  if p_site_id <> 'no-bloom' or p_page_key not in ('invitation', 'shared_card')
    or p_source_category not in ('facebook', 'instagram', 'tiktok', 'youtube', 'google', 'other', 'direct_or_unknown')
    or p_event_id is null or p_occurred_at is null
    or p_occurred_at < v_received_at - interval '10 minutes'
    or p_occurred_at > v_received_at + interval '2 minutes'
    or p_minute_cap not between 1 and 1000 or p_day_cap not between 1 and 100000
  then
    raise exception using errcode = '22023', message = 'invalid analytics event';
  end if;

  insert into analytics.request_buckets(site_id, bucket_kind, bucket_start, request_count, expires_at)
  values (p_site_id, 'minute', date_trunc('minute', v_received_at), 1, v_received_at + interval '2 minutes')
  on conflict (site_id, bucket_kind, bucket_start) do update
    set request_count = request_buckets.request_count + 1
    where request_buckets.request_count < p_minute_cap
  returning request_count into v_count;
  if v_count is null then raise exception using errcode = 'P0001', message = 'analytics rate limited'; end if;

  v_count := null;
  insert into analytics.request_buckets(site_id, bucket_kind, bucket_start, request_count, expires_at)
  values (p_site_id, 'day', date_trunc('day', v_received_at), 1, v_received_at + interval '2 days')
  on conflict (site_id, bucket_kind, bucket_start) do update
    set request_count = request_buckets.request_count + 1
    where request_buckets.request_count < p_day_cap
  returning request_count into v_count;
  if v_count is null then raise exception using errcode = 'P0001', message = 'analytics rate limited'; end if;

  insert into analytics.analytics_events(event_id, site_id, event_name, page_key, visitor_id, source_category, occurred_at, received_at)
  values (p_event_id, p_site_id, 'page_view', p_page_key, p_visitor_id, p_source_category, p_occurred_at, v_received_at)
  on conflict (site_id, event_id) do nothing
  returning true into v_inserted;

  if coalesce(v_inserted, false) then
    insert into analytics.analytics_daily_totals(site_id, reporting_date, page_views)
    values (p_site_id, analytics.reporting_date(v_received_at), 1)
    on conflict (site_id, reporting_date) do update
      set page_views = analytics_daily_totals.page_views + 1;
  end if;
  return coalesce(v_inserted, false);
end;
$$;

create function analytics.prune_expired(retention_days integer default 30)
returns table (deleted_events bigint, deleted_buckets bigint)
language plpgsql security invoker set search_path = '' as $$
begin
  if retention_days not between 1 and 365 then
    raise exception using errcode = '22023', message = 'invalid retention';
  end if;
  delete from analytics.analytics_events where received_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_events = row_count;
  delete from analytics.request_buckets where expires_at < now();
  get diagnostics deleted_buckets = row_count;
  return next;
end;
$$;

revoke all on function analytics.record_page_view(uuid,text,text,uuid,text,timestamptz,integer,integer) from public, anon, authenticated, service_role;
revoke all on function analytics.prune_expired(integer) from public, anon, authenticated, service_role;
revoke all on function analytics.reporting_date(timestamptz) from public, anon, authenticated, service_role;
revoke all on schema analytics from public, anon, authenticated, service_role;
-- `postgres` is the owner and may call these through the server-only DB URL.
