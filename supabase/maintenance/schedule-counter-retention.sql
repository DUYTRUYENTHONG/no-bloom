-- Run only after reviewed approval, migration application, and enabling Supabase Cron.
-- This is intentionally outside the ordinary GitHub Pages release workflow.
select cron.schedule(
  'no-bloom-prune-counter',
  '30 3 * * *',
  $$select * from analytics.prune_counter(365);$$
);

-- Verify in Dashboard → Integrations → Cron, or query cron.job and
-- cron.job_run_details from the project owner's SQL Editor.
