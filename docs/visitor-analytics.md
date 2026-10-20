# Historical Supabase analytics implementation

The active visitor counter now follows docs/visitor-counter.md and uses a separate Vercel function with Upstash Redis. The earlier Supabase collectors remain unprovisioned/disabled and are not the current counter deployment target. The latest traffic brief uses UTC daily metrics.

# Optional visitor analytics

## Architecture and current repository state

NỞ is a Next.js 16 / React 19 app exported to GitHub Pages under `/no-bloom/`. There was no Supabase project, backend, admin authorization, analytics preference, or migration in this repository. The current app has name entry, the two-rose reveal, and prepared greetings. The mini-game, AI greeting, card export, and sharing described in later product requests are not implemented here; this module does not claim to track them or alter their future behavior.

The browser sends one permitted `page_view` to a separate Supabase Edge Function. The function validates a small fixed payload and calls a private PostgreSQL function over a server-only transaction-pooler connection. That function atomically enforces site caps, inserts a new event, and increments its Vietnam-date aggregate only when the event ID is new. The Supabase project owner reads reports in the private SQL Editor. The GitHub Pages workflow only builds the public frontend; it never applies database migrations or deploys the collector.

## Metrics and privacy

- **Recorded page views:** one accepted event when a visible top-level page instance opens, or on a deliberate tracked route navigation. A reload is a new view. React re-renders, a modal, replay, and back-forward-cache restoration do not create a new event. The current app has one route, so no client-side route navigation is tracked.
- **Estimated unique browsers:** distinct non-null random browser IDs in a selected period fully covered by the 30-day detailed-event retention. These are pseudonymous identifiers, not verified people. Different devices, cleared storage, and shared browsers affect this estimate. Identifier coverage is reported separately.
- **Time:** `received_at` is the authoritative UTC timestamp. `analytics_daily_totals.reporting_date` uses `Asia/Ho_Chi_Minh`. Reports use half-open `[start, end)` UTC boundaries derived from Vietnam dates.
- **Sources:** `facebook`, `instagram`, `tiktok`, `youtube`, `google`, `other`, or `direct_or_unknown`. A missing referrer is not proof of a typed URL.

No request occurs before affirmative permission. The choice can be changed from the header. A random browser ID is made with `crypto.randomUUID()` after permission, stored for 30 days, and omitted if storage fails. Withdrawing permission stops pending retries and removes that ID, while preserving the name and greeting. Earlier server records are not automatically deleted. Names, messages, game choices, full URLs, shared-card IDs, raw IPs, and full user agents never enter the analytics payload or tables. Hosting providers may separately process network metadata.

Metrics cover only consenting visits that the service accepted. Blockers, failures, declined permission, and fabricated requests affect coverage. There is no public counter, session replay, or fingerprinting.

## Local checks

```bash
npm ci
npm test
npm run typecheck
npm run test:e2e
```

`npm test` runs the migration and role/retention checks in embedded PostgreSQL. It also submits concurrent calls through that embedded engine to verify idempotent totals. A real multi-connection Supabase concurrency test remains necessary before production use. The browser test for the exported site uses a local mock collector; it never sends test traffic to production:

```powershell
$env:GITHUB_PAGES='true'
$env:NEXT_PUBLIC_ANALYTICS_ENABLED='true'
$env:NEXT_PUBLIC_ANALYTICS_ENDPOINT='http://127.0.0.1:3201/record'
$env:NEXT_PUBLIC_ANALYTICS_TEST_MODE='true'
npm run build
npm run test:exported-analytics
```

The local-test flag only permits a local frontend to call a local HTTP endpoint. Never set it in the Pages workflow. For local Supabase integration, install the Supabase CLI and Docker, then apply the migration in an isolated local project and run `supabase/tests/analytics.sql` with `psql -v ON_ERROR_STOP=1`. Set the function's local secrets in `supabase/functions/.env` (excluded from Git) and serve `record-visit`. This workstation did not have Docker, Supabase CLI, or `psql` when the module was written; no cloud database or function has been created or tested.

## Reviewed production setup

1. Create or select a Supabase project. Review `supabase/migrations/202610200001_visitor_analytics.sql` and apply it with the Supabase CLI or SQL Editor. Do not reset an existing database.
2. In Dashboard → Connect, copy the **transaction pooler** PostgreSQL URI to the server-only `ANALYTICS_DATABASE_URL` Edge Function secret. Configure `ANALYTICS_ALLOWED_ORIGINS=https://duytruyenthong.github.io` and optional `ANALYTICS_MINUTE_CAP=60`, `ANALYTICS_DAY_CAP=10000`. The allowed origin has no `/no-bloom/` path. Keep database credentials out of GitHub Pages variables and public source.
3. Deploy only `record-visit` with the Supabase CLI. `supabase/config.toml` sets `verify_jwt=false` for this intentionally public collector; no other function is opened. Confirm OPTIONS and POST from the allowed origin, invalid-payload rejection, and denied table access before enabling frontend tracking.
4. Set GitHub repository **variables** `NEXT_PUBLIC_ANALYTICS_ENABLED=true` and `NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://<project-ref>.supabase.co/functions/v1/record-visit`. They contain no secret. The Pages workflow forwards only these two public values to `next build`. Review and publish the frontend separately.
5. With an authorized staging/production test browser, consent and open one page. In SQL Editor, confirm one event and one daily increment. Retry the same event ID and confirm no second increment. Reload and confirm another view with the same browser ID. Visit from a second consenting browser and confirm another distinct ID. Redeploy the frontend and confirm the stored totals remain in Supabase.
6. Run `supabase/reporting/owner_reports.sql` in the owner's SQL Editor. Its read-only queries cover today, all historical page views, daily views, estimated unique browsers, identifier coverage, and sources. Export results privately from the Dashboard if needed. An unavailable detail period returns `null` rather than a fabricated unique count.
7. After reviewing retention and enabling Supabase Cron, run `supabase/maintenance/schedule-retention.sql` in SQL Editor, then verify the job and its first successful run. The scheduling file is separate from migration and has **not** been applied. Detailed records default to 30 days; aggregate page-view totals persist. The request limiter's expired buckets are pruned by the same task.

The collector accepts events no more than 10 minutes old or 2 minutes ahead. The browser makes at most three bounded delivery attempts with the original event ID. Detailed-event retention greatly exceeds that retry window, so a lost response can be retried without incrementing the total again. The collector uses atomic site-wide minute and UTC-day caps in PostgreSQL. These protect bounded cost across Edge instances but can be exhausted by malicious traffic; CORS limits browsers, not non-browser callers, and the endpoint is not bot-proof. Analytics failure never blocks the gift.

Official references: [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth), [function secrets](https://supabase.com/docs/guides/functions/secrets), [serverless PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Cron](https://supabase.com/docs/guides/cron).
