-- Run against local/staging after migration using psql -v ON_ERROR_STOP=1.
-- The outer transaction leaves no test traffic behind.
begin;
do $$ begin
  if has_schema_privilege('anon', 'analytics', 'USAGE')
    or has_schema_privilege('authenticated', 'analytics', 'USAGE')
    or has_schema_privilege('service_role', 'analytics', 'USAGE')
    or has_table_privilege('anon', 'analytics.analytics_events', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'analytics.analytics_events', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('anon', 'analytics.analytics_daily_totals', 'SELECT')
    or has_function_privilege('anon', 'analytics.record_page_view(uuid,text,text,uuid,text,timestamptz,integer,integer)', 'EXECUTE')
    or has_function_privilege('authenticated', 'analytics.prune_expired(integer)', 'EXECUTE')
  then raise exception 'analytics grants permit public or non-owner access'; end if;
  if not (select relrowsecurity from pg_class where oid = 'analytics.analytics_events'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'analytics.analytics_daily_totals'::regclass)
  then raise exception 'analytics RLS is not enabled'; end if;
  if analytics.reporting_date('2026-10-20 16:59:59+00'::timestamptz) <> date '2026-10-20'
    or analytics.reporting_date('2026-10-20 17:00:00+00'::timestamptz) <> date '2026-10-21'
  then raise exception 'Vietnam midnight boundary is incorrect'; end if;
end $$;

do $$
declare
  v_event_id uuid := '11111111-1111-4111-8111-111111111111';
  visitor_id uuid := '22222222-2222-4222-8222-222222222222';
  before_total bigint;
  after_total bigint;
begin
  select coalesce(sum(page_views), 0) into before_total from analytics.analytics_daily_totals where site_id = 'no-bloom';
  if not analytics.record_page_view(v_event_id, 'no-bloom', 'invitation', visitor_id, 'direct_or_unknown', now(), 1000, 100000)
    or analytics.record_page_view(v_event_id, 'no-bloom', 'shared_card', null, 'other', now(), 1000, 100000)
  then raise exception 'deduplication failed'; end if;
  select coalesce(sum(page_views), 0) into after_total from analytics.analytics_daily_totals where site_id = 'no-bloom';
  if after_total <> before_total + 1 then raise exception 'daily total counted a duplicate'; end if;
  if (select page_key from analytics.analytics_events where site_id = 'no-bloom' and analytics_events.event_id = v_event_id) <> 'invitation'
  then raise exception 'duplicate replaced original event'; end if;
  update analytics.analytics_events set received_at = now() - interval '40 days'
    where site_id = 'no-bloom' and analytics_events.event_id = v_event_id;
  perform analytics.prune_expired(30);
  if exists (select 1 from analytics.analytics_events where site_id = 'no-bloom' and analytics_events.event_id = v_event_id)
    or (select coalesce(sum(page_views), 0) from analytics.analytics_daily_totals where site_id = 'no-bloom') <> after_total
  then raise exception 'retention removed aggregates or retained stale detail'; end if;
end $$;
rollback;
