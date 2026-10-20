# Optional recognized-browser counter

## Architecture and counting contract

NỞ is exported from Next.js 16 to GitHub Pages at `/no-bloom/`; the static host cannot run POST handlers. A separate public Supabase Edge Function named `visitor-counter` receives a consented browser UUID. It computes HMAC-SHA256 with a server-only stable key and sends only the digest to a private PostgreSQL function. The project has no Supabase project connection or administrator system configured in this checkout. The counter is disabled until its migration, function, and public endpoint are configured.

The database function locks one project state row, recognizes a digest or allocates the next ordinal, then counts canonical visitor records in the same transaction. Two submissions of the same identifier return the same ordinal. Different concurrent first visits receive distinct ordinals. The ordinal never changes or gets reused after cleanup. A repeat visit does not update the record. `unspecified` never erases a future explicit role. The current project has no role vocabulary; the owner chose **unspecified only**, so no role selector is shown and `roleCount` equals `total`. Adding roles later requires a reviewed migration and matching server/client allowlist.

The response is `{ total, ordinal, roleCount, countries }`:

- `total`: currently retained, consented browser records. It is not page views or people.
- `ordinal`: this browser record's immutable first-registration number. It can exceed `total` after retention deletes old records.
- `roleCount`: currently retained records in this browser's persisted role, presently `unspecified`.
- `countries`: distinct known country codes, excluding `unknown`. This implementation deliberately uses `unknown` for every record because it has not verified a trusted country header from the selected Edge provider. Thus `countries` is currently zero; no IP geolocation or client-supplied country is used.

The browser ID is a random UUID stored under `no-bloom:counter-visitor` with a version and 30-day expiry, only after affirmative permission. It is separate from the name, greeting, and page-view ID. With blocked localStorage it survives only the current page instance; a reload can count another browser. Withdrawing permission clears it, cancels retry work, and leaves the gift usable; prior server records are not automatically deleted. A new ID after expiry, cleared storage, or consent withdrawal may create a new record. Multiple devices count separately and shared browsers count together. Automated or fabricated requests can distort totals; CORS is a browser rule, not authentication. Hosting providers may process network metadata independently.

The HMAC digest is pseudonymous, not inherently anonymous. The raw UUID is sent only over HTTPS to the function and is not written to the analytics tables. No raw IP, name, greeting, user agent, or referring URL is stored by this feature. Keep `COUNTER_HMAC_SECRET` stable across instances and redeployments. Changing it without a deliberate migration makes returning IDs appear new; this version does not preserve recognition across key rotation.

## Retention and limits

The proposed visitor-record retention is **365 days from first registration**. `supabase/maintenance/schedule-counter-retention.sql` schedules daily cleanup after approval and enabling Supabase Cron; it has **not** been applied. Until cleanup is active, `total` covers all records presently in the table. Cleanup removes expired canonical records, so `total` may decrease; it never resets `next_ordinal`. The 30-day client ID expiry means a regular browser may get a new ordinal before server retention ends. A frontend redeployment does not touch Supabase records or the HMAC secret.

The database enforces atomic project-wide caps, initially 60 requests per UTC minute and 10,000 per UTC day. Repeats consume this budget. These caps bound cost across function instances but are not bot-proof; a malicious caller can exhaust the cap. No raw network address is stored or logged by the application.

## Local verification

```powershell
npm ci
npm run typecheck
npm test
npm run test:e2e

$env:GITHUB_PAGES='true'
$env:NEXT_PUBLIC_COUNTER_ENABLED='true'
$env:NEXT_PUBLIC_COUNTER_ENDPOINT='http://127.0.0.1:3205/record'
$env:NEXT_PUBLIC_COUNTER_TEST_MODE='true'
npm run build
npm run test:exported-counter
```

The exported-site test uses a local collector stub, not a Supabase database. `npm test` applies the migrations and role-denial checks to embedded PostgreSQL and checks same-ID and unique-ID calls. PGlite uses one embedded engine; it does not establish multi-connection locking behavior in a live Supabase deployment. Test a real staging Edge Function and PostgreSQL connection before enabling production.

## Reviewed production setup

1. Create or select a Supabase project. Review and apply `202610200001_visitor_analytics.sql`, then `202610200002_visitor_counter.sql`. Run `supabase/tests/visitor-counter.sql` against local or staging PostgreSQL. Do not reset an existing database.
2. Configure server-only Edge Function secrets: `ANALYTICS_DATABASE_URL` from the transaction pooler, `ANALYTICS_ALLOWED_ORIGINS=https://duytruyenthong.github.io`, and a random, stable `COUNTER_HMAC_SECRET` of at least 32 characters. The example file is `supabase/functions/.env.example`. Optionally set `COUNTER_MINUTE_CAP` and `COUNTER_DAY_CAP`. Keep these out of GitHub Pages variables and client bundles.
3. Deploy only `visitor-counter`. `supabase/config.toml` sets `verify_jwt=false` for this intentional public collector. Verify direct table access is denied, CORS accepts only the configured origin, malformed requests are rejected, and rate failures do not expose SQL details.
4. Review the 365-day policy and separately schedule `supabase/maintenance/schedule-counter-retention.sql`; verify the job and its first successful run. This file is not part of the migration or Pages workflow.
5. Set GitHub repository **variables** `NEXT_PUBLIC_COUNTER_ENABLED=true` and `NEXT_PUBLIC_COUNTER_ENDPOINT=https://<project-ref>.supabase.co/functions/v1/visitor-counter`. They are public build-time values. Build and publish the frontend separately from migrations and function deployment.
6. In an authorized staging browser, give consent and verify one `visitor_records` row with an HMAC key and ordinal 1; repeat to confirm no new row, then use a separate browser to confirm a distinct ordinal. Confirm that redeploying the frontend leaves both rows intact. Do not run automated tests against production counts.

No production migration, function deployment, Cron job, or frontend publication was performed for this implementation.

Official references: [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth), [function secrets](https://supabase.com/docs/guides/functions/secrets), [PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Cron](https://supabase.com/docs/guides/cron).
