# NỞ traffic counter — Vercel + Upstash Redis

## Inspected project and active architecture

Next.js16.4.2/React19.2, TypeScript5.9, npm/package-lock, existing CSS and native fetch. The frontend is a static GitHub Pages export at `/no-bloom/`; production origin is `https://duytruyenthong.github.io`, local development is `http://localhost:3100`. There is no owner login. The active counter replaces the earlier, unprovisioned Supabase browser-only collector. Existing Supabase code is historical and is not deployed or used by this counter. No role picker or role field is sent.

Browser → external Vercel `POST /api/traffic` → strict validation and HMAC → one Upstash Redis EVAL. POST acknowledges only `{recorded:true}` after the script succeeds. `GET /api/traffic` returns only the explicitly requested public aggregates `{pageViews,uniqueBrowsers}`. Detailed reports require the owner's Redis credentials through a local script. No public dashboard exists.

The small counter is under NỞ at the top left. Missing configuration/failure shows unavailable, never fake zero. Before permission it shows optional counting. Successful values come from the backend, not localStorage or build variables. The frontend is not moved to Vercel; only `services/traffic/` is deployed there.

## Metric contract

- Recorded page views: accepted events for the current visible page opening or a completed pathname change. Reload = another event. Query/hash changes, React Strict Mode/remounts, gift steps, flower changes, guide messages and replay do not add events. Back-forward cache retains the existing tracker instance.
- Approximate unique browsers: distinct HMAC browser IDs retained since this counter started. Not people, women reached, or verified identities. Shared browsers combine people; devices, private sessions, 30-day browser-ID expiry and cleared storage can add IDs.
- Daily page views and daily distinct browser IDs use **UTC** dates derived on the server, as requested in the latest counter brief. This supersedes the historical Supabase report timezone. Reporting intervals are explicit `[startInclusive,endExclusive)` UTC dates. Never sum daily uniques into interval uniques.
- Allowed normalized paths: `/` and `/credits`. `/no-bloom/` is normalized to `/`. Query strings/fragments and personalized name/share parameters are not transmitted. Unknown/token routes are excluded instead of accepted as arbitrary paths.
- Country counts are **page views by country**, not unique browsers. Only Vercel's platform country header is used when actually running on Vercel; elsewhere/missing metadata uses `unknown`. Country is approximate. The browser cannot submit country.

Metrics cover accepted consenting traffic. Refusal, blockers, network failures, bot/fabricated requests and quota limits affect coverage. CORS restricts browsers; it does not authenticate callers.

## Preferences, identity and deletion

Existing optional analytics permission is reused. No tracking or aggregate request before affirmative permission. Global Privacy Control overrides stored acceptance. No fingerprint, roles, AI analytics, name, greeting, contact, full URL, raw IP or full user agent is sent/stored by this module. Hosting providers process network metadata independently; this is not a claim of guaranteed anonymity or legal compliance.

After permission, `crypto.randomUUID()` makes a browser ID stored under `no-bloom-visitor-id` with30-day expiry. Storage failure uses only a temporary in-memory ID while permission remains known. A separate UUID identifies each logical view. Tracker state lives outside React effects and survives remounts. There are at most3 attempts within30 seconds,5-second request timeouts, same event ID on retry, and no offline queue. Retry-After is respected; a delay beyond the window stops retries. Withdrawal cancels work and clears the traffic identity, preserving personalization/game state. Previous server aggregates are not automatically deleted.

Server HMAC-SHA256 uses a project-specific stable `TRAFFIC_HASH_SALT`. HMAC identifiers are pseudonymous. Never rotate this salt casually or generate it on cold starts: doing so breaks recognition. No existing cloud data has been migrated/reset.

To forget an available browser ID, the owner can supply it through stdin to the authenticated local report script with `--forget-browser --confirm`. This removes its lifetime and retained daily membership. Aggregate page views remain because the schema does not retain a browser-to-view history. Provider logs/backups have independent retention. Resetting all traffic requires a separate deliberate owner procedure; ordinary deployment never resets keys.

## Redis schema and bounds

All keys use the server-controlled production prefix `no-bloom:traffic:v1`. Preview/staging uses `no-bloom:traffic:staging:v1`; automatic tests use random isolated `no-bloom:traffic:qa:<uuid>:v1` prefixes. Callers cannot select a namespace or environment.

| Suffix | Type | Retention |
|---|---|---|
| `views` | integer | Persistent historical page views |
| `browsers` | set of HMAC digests | No expiry; consistent with lifetime approximate unique count |
| `started-utc` | server timestamp | Persistent first accepted event |
| `event:<eventId>` | dedup marker |24 hours |
| `day:YYYY-MM-DD:views` | integer |400 days |
| `day:YYYY-MM-DD:browsers` | distinct HMAC set |400 days, same as daily aggregate |
| `paths` | finite allowlisted hash | Persistent |
| `countries` | country page-view hash | Persistent; finite two-letter categories plus unknown |
| `rate:minute:<bucket>` | request count |120 seconds |
| `rate:day:<UTC-date>` | request count |2 days |

One Lua script validates existing key types/counter representations, applies distributed request caps, deduplicates the event ID and updates all metrics without interleaving. A duplicate ID cannot replace fields or increment analytics totals. Atomicity/dedup guarantees cover normal retries inside the24-hour marker window; replaying an ID after expiry can count again, so client retries stop within30 seconds.

Defaults:120 accepted requests/minute,10000/day,100000 lifetime browser memberships. GET aggregate reads and POST attempts both consume request capacity. A new browser beyond the membership cap is rejected; existing IDs can still be recorded. Caps are server-configurable and validated. They are not bot-proof or hard billing guarantees: Vercel invocations and Upstash commands/plan quotas are separate. Use the approved free plan's spending controls; do not enable automatic paid upgrades. Daily/dedup/rate cleanup uses Redis TTL and needs no external scheduler. Persistent lifetime membership intentionally does not expire.

## Server setup and deployment

1. Select/create the approved Vercel project for `services/traffic/` and a dedicated Upstash Redis database. New paid resources or legal/marketplace terms require the owner's action/approval. No project/database is claimed deployed merely because code exists.
2. Link only this subdirectory: `vercel link --cwd services/traffic`. Framework is Other/null; Node24; `public/` is static output, and `api/traffic.ts` is the function. No Next.js `/api` is claimed to run on Pages.
3. Add server variables from `services/traffic/.env.example` through Vercel's environment controls: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `TRAFFIC_HASH_SALT`, `TRAFFIC_ALLOWED_ORIGINS`, optional caps/namespace. Never give these a NEXT_PUBLIC prefix. Generate a stable salt with Node crypto into an ignored local file, then set it securely; never paste credentials into chat or commit them.
4. Production origin must be exactly `https://duytruyenthong.github.io` (scheme/host, no repository path). Use local origin only in approved staging configuration. Preview environments must not use the production Redis namespace.
5. Run isolated Redis tests and verify the Vercel build before `vercel deploy --cwd services/traffic --prod`. The Pages workflow does not deploy this backend or run destructive database commands.
6. In GitHub repository **Variables**, set only `NEXT_PUBLIC_COUNTER_ENABLED=true` and `NEXT_PUBLIC_COUNTER_ENDPOINT=https://YOUR_PROJECT.vercel.app/api/traffic`. Keep `NEXT_PUBLIC_ANALYTICS_ENABLED=false`; the active counter also suppresses the historical collector when enabled. The existing Pages workflow and `/no-bloom` base path are preserved.
7. Publish the reviewed frontend through `main`. Verify HTTP/CORS, the real public aggregate response and one explicitly authorized consenting production event. Automated tests must use isolated data, not inflate production. Recheck the same Redis history after another frontend deployment.

## Private owner reporting

Run locally with server credentials in an ignored file; do not commit raw exports:

```powershell
node --env-file=services/traffic/.env.local --import tsx scripts/report-traffic.ts 2026-10-01 2026-10-21
```

The authenticated script reads total views, approximate unique browser membership, daily trends, top paths and country page views. Dates outside400-day daily retention are rejected. Days before the first accepted event are unavailable rather than fake zero. A failed request throws, never substitutes zero. Redirect output only to a private local file outside the public repository.

Deletion (UUID on stdin, not a command-line log):

```powershell
Get-Content -LiteralPath PRIVATE_UUID_FILE | node --env-file=services/traffic/.env.local --import tsx scripts/report-traffic.ts --forget-browser --confirm
```

## Verification

- `npm run typecheck`, `npm test`, `npm run qa:full` are the existing frontend gates; no lint config exists.
- `npx tsx --test tests/traffic.test.ts` checks tracking preferences/GPC, visibility, remount/reload/navigation/hash behavior, retries/withdrawal, storage failure, payload privacy, validation/CORS, UTC keys and dependency failures.
- `.github/workflows/traffic-tests.yml` runs actual Redis7.4 EVAL against an ephemeral CI service. `scripts/test-traffic-redis.ts` covers concurrent duplicates/unique events, daily UTC midnight, country page views, retention, key corruption, capacity and store recreation. It only deletes its own random test prefixes; it never flushes a database.
- For local actual Redis use `TRAFFIC_REDIS_TEST_URL=redis://127.0.0.1:6379` with `npx tsx scripts/test-traffic-redis.ts`. Docker/Redis are absent on this Windows machine. Alternatively use explicitly supplied isolated test REST credentials (`TRAFFIC_TEST_REDIS_REST_URL/TOKEN`); production prefixes are never accepted by that test.
- `scripts/test-exported-counter.mjs` tests a Pages export built with counter enabled, loopback endpoint `http://127.0.0.1:3205/api/traffic` and explicit `NEXT_PUBLIC_COUNTER_TEST_MODE=true`. It exercises actual browser navigation, lost-response retry, consent/GPC, different contexts, storage failure, withdrawal,320px top-left layout/axe and gift isolation against a local mock collector. Restore the normal export with `npm run qa:build` afterward. Test mode is never set in the Pages workflow.

Current source-bound results and remaining deployment limitations are recorded in `docs/quality-review/summary.json`. Source documentation: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel request headers](https://vercel.com/docs/headers/request-headers), [Upstash REST API](https://upstash.com/docs/redis/features/restapi), [Upstash EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval).
