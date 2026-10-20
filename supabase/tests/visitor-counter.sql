-- Run only in local/staging. This transaction rolls back every test record.
begin;
do $$ begin
  if has_table_privilege('anon', 'analytics.visitor_records', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'analytics.visitor_records', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('service_role', 'analytics.visitor_records', 'SELECT,INSERT,UPDATE,DELETE')
    or has_function_privilege('anon', 'analytics.record_browser(text,text,text,text,integer,integer)', 'EXECUTE')
    or has_function_privilege('authenticated', 'analytics.prune_counter(integer)', 'EXECUTE')
  then raise exception 'counter grants permit non-owner access'; end if;
  if not (select relrowsecurity from pg_class where oid = 'analytics.visitor_records'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'analytics.visitor_counter_state'::regclass)
  then raise exception 'counter RLS is not enabled'; end if;
end $$;

do $$
declare
  first_row record;
  repeat_row record;
  next_row record;
  after_prune record;
begin
  select * into first_row from analytics.record_browser('no-bloom', repeat('a',64), 'unspecified', 'unknown', 1000, 100000);
  if first_row.total <> 1 or first_row.ordinal <> 1 or first_row.role_count <> 1 or first_row.countries <> 0
  then raise exception 'first recognized visit is wrong'; end if;
  select * into repeat_row from analytics.record_browser('no-bloom', repeat('a',64), 'unspecified', 'unknown', 1000, 100000);
  if repeat_row.total <> 1 or repeat_row.ordinal <> 1 or repeat_row.role_count <> 1
  then raise exception 'repeat visit inflated count or changed ordinal'; end if;
  select * into next_row from analytics.record_browser('no-bloom', repeat('b',64), 'unspecified', 'unknown', 1000, 100000);
  if next_row.total <> 2 or next_row.ordinal <> 2 or next_row.role_count <> 2 or next_row.countries <> 0
  then raise exception 'second visitor count is wrong'; end if;
  update analytics.visitor_records set created_at = now() - interval '400 days' where visitor_key = repeat('a',64);
  perform analytics.prune_counter(365);
  if exists (select 1 from analytics.visitor_records where visitor_key = repeat('a',64))
    or (select next_ordinal from analytics.visitor_counter_state where site_id = 'no-bloom') <> 3
  then raise exception 'retention reset ordinal or kept expired visitor'; end if;
  select * into after_prune from analytics.record_browser('no-bloom', repeat('c',64), 'unspecified', 'unknown', 1000, 100000);
  if after_prune.total <> 2 or after_prune.ordinal <> 3 then raise exception 'ordinal was reused after retention'; end if;
end $$;
rollback;
