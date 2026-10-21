# Shared traffic integration review — 2026-10-21

## Authorized release follow-up

The owner subsequently authorized commit and deployment. Shared API commit `81b11a2` is published to the existing API project, with only the new NỞ hashing secret added. Production-safe GET verified `{pageViews:0,uniqueBrowsers:0}` before frontend activation, unknown projects are rejected, and visit/guide method checks remain intact. The public Pages variables are configured; publication follows the existing gated workflow. Review-stage evidence below remains the original scope and is not relabelled as live ingestion evidence. No automated production page-view event is generated.

Prepared locally against NỞ `1acd596` and the inspected existing `Alinguyen-portfolio/visitor-api` checkout. Both working trees were clean before this change. No new account, database or API project was created. No production configuration, deployment, commit or push was made for this candidate.

## Changes in NỞ

- `lib/traffic/client.ts`: public project ID on POST and aggregate GET; project-scoped browser identity; invalid/missing project configuration sends nothing and cannot clear unrelated storage. Existing consent/GPC, visibility, remount/reload behavior, bounded retries and path filtering remain.
- `.env.example`, `.github/workflows/pages.yml`: shared endpoint and public project-ID build variable.
- `tests/traffic.test.ts`: four-field payload contract, missing-project safety and independent project IDs.
- `scripts/test-exported-counter.mjs`: validates the shared contract; optional actual shared-handler/Redis browser mode, restricted to random test namespaces.
- `README.md`, `docs/visitor-counter.md`: active candidate, private reporting, limits and activation requirements; standalone deployment instructions explicitly historical.

## Changes in shared API repository

Within `visitor-api`:

- `api/traffic.js`: new validated native Request endpoint and approved public aggregate GET.
- `lib/traffic-projects.js`, `lib/traffic-store.js`: server registry, per-project secrets/origins/paths/keys, atomic Lua and shared/project limits.
- `lib/traffic-report.js`, `scripts/report-traffic.mjs`, `scripts/forget-traffic-browser.mjs`: owner-authorized local reporting and explicit membership deletion.
- `test/traffic.test.js`, `test/visit.test.js`, `scripts/test-traffic-redis.mjs`: boundaries, project authorization/isolation, real Redis concurrency/retention and existing endpoint regression.
- `.env.example`, `.gitignore`, `.vercelignore`, `vercel.json`, `package.json`: secret placeholders/exclusions, traffic-only duration cap and explicit isolated-test command.
- `README.md`, `TRAFFIC_INTEGRATION.md`: registration, metrics/privacy, private reports, capacity, retention, rollback and exact verification.

`api/visit.js`, `api/guide.js`, portfolio frontend source, existing portfolio/guide secrets and `portfolio:*` data remain unchanged.

## Actual results

| Check | Result |
|---|---|
| Shared API tests |16/16 PASS |
| Real Redis isolated tests | PASS: concurrency, duplicates, isolation, UTC, retention, distinct reports, limits |
| Shared API Biome lint | PASS,9 new JS files |
| Shared Vercel local build | PASS; visit,guide,traffic on Node24; traffic-only10s cap |
| Portfolio typecheck/lint/build | PASS |
| NỞ typecheck | PASS |
| NỞ tests |3 name +30 TypeScript +3 embedded SQL suites PASS |
| Exported browser with local collector | PASS |
| Exported browser +actual shared handler +real Redis | PASS, including zero320px axe findings |
| Enabled test export / restored normal export | PASS |
| Live candidate ingestion | Not run: candidate not deployed |

All automated writes used random isolated prefixes and were cleaned up. No production visit was generated. The pre-existing full UI/performance report concerns an earlier release; it is not relabelled as evidence for this candidate. This slice uses the relevant checks above and does not change the celebration design.

## Remaining activation steps

1. Review both working-tree diffs.
2. Generate/configure a distinct server-only `TRAFFIC_NO_BLOOM_HASH_SALT` on **ali-portfolio-visitor-api**. Its existing Redis variables are verified working and stay there.
3. Following release authorization, deploy that existing shared API directory; preserve visit/guide behavior and existing configuration.
4. Set NỞ public values: enabled=true, endpoint=`https://ali-portfolio-visitor-api.vercel.app/api/traffic`, project ID=`no-bloom`; keep historical analytics disabled. Rebuild/publish Pages.
5. Verify the public aggregate GET, one separately authorized consenting event, retry/reload behavior and history after another frontend publication. Keep ordinary automated tests isolated.

Metrics are consenting recorded page views and estimated browsers, not verified people. Reports use UTC half-open dates. Country metrics count views. Shared capacity/failure, indefinite lifetime membership,400-day daily retention,24-hour deduplication,30-second client retry window and explicit deletion behavior are documented in the shared API guide.

## Compact number and private city totals

The header now displays only total page views, with a localized screen-reader label and tooltip. Consent copy names approximate city/country. Cities remain private aggregate data in the existing shared API report, grouped by country/city from trusted Vercel metadata, without stored IPs, coordinates or identity/location mappings. Historical visits cannot be assigned a city; report cityTrackingStartedAt marks the start. The existing public API contract and consent/GPC behavior are unchanged.

Verification for this update: qa:fast passed; enabled Pages export passed; actual shared-handler + isolated Redis browser test passed (compact accessible number, 320px axe/layout, consent, retries, reload, withdrawal and gift isolation); default export passed; Chrome/WebKit journeys 111/111; accessibility 0 findings. Shared API tests 17/17, real Redis city deduplication/history compatibility/cardinality tests, Biome and Vercel production build passed. Production-safe reads preserve existing counts and validate the private report; no synthetic production views were inserted.
