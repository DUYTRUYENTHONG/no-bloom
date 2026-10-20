-- Run in the Supabase project owner's SQL Editor only after reviewing the
-- retention period and enabling Supabase Cron. This is deliberately not a
-- migration: creating the job is a separate, approved operational step.
select cron.schedule(
  'no-bloom-prune-analytics',
  '15 3 * * *',
  $$select * from analytics.prune_expired(30);$$
);

-- Verify the job and recent runs in Dashboard → Integrations → Cron, or:
-- select jobid, jobname, schedule, active from cron.job where jobname = 'no-bloom-prune-analytics';
-- select status, start_time, end_time from cron.job_run_details order by start_time desc limit 10;
