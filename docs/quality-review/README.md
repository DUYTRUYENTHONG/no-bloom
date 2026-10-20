# NỞ quality review

Baseline: `3f6c096`, branch `codex/visitor-analytics`, clean before review. Next.js 16.4.2, React 19.2, npm + package-lock, Three 0.186/R3F 9.8, TypeScript 5.9, Playwright 1.64, embedded PGlite SQL tests. Windows / installed Chrome; WebKit is available and will be tried. Static Pages export uses `/no-bloom/`; Supabase collectors and optional Groq guide are separate undeployed functions. No production traffic or mutations are permitted.

## Inventory

| Feature | Status | Notes |
|---|---|---|
| Invitation, name, anonymous entry | Implemented | One page, state-based screens |
| Seven flower choices / bloom / skip / replay | Partially implemented | Actual procedural meshes; photo bud overlay does not align with geometry; no recipient pause control |
| Prepared VI/EN greeting | Implemented | HTML text; AI does not generate the greeting |
| Personal URL / clipboard sharing | Partially implemented | Validated `?for=` and flower; name intentionally shareable, clipboard denial lacks recovery |
| Matching game, export, native share, saved/revoked cards | Planned | No implementation; not added merely to fill audit checklist |
| Guide | Partially implemented | Local help; optional server Groq chat; rendered sprite poses, not rigged 3D |
| Optional page views and browser counter | Unverified cloud / implemented local | Consent + migrations + handlers + SQL tests; no connected Supabase project |
| Owner reports | Implemented SQL | Private Dashboard/SQL Editor, no admin login |
| Dance and song | Newly authorized | Explicit opt-in official player; no music before user action |

## Baseline checks

PASS: unit tests (3 name + 18 TypeScript), three embedded SQL suites, TypeScript, static export build, 10 existing Chromium journeys. These do not establish accessibility conformance, real database concurrency, phone performance, or live cloud deployment.

## Design specification

Retain forest `#071008`, ivory `#F7F3E9`, magenta `#D42A88`, lime `#B5D34B`. Use the existing serif for headings and sans for controls. Preserve 8px-based spacing, readable body text, 44px comfortable controls and high-contrast focus rings. Keep the greeting as a paper-like light surface. At <=800px, stack artwork then story without allowing artwork to cover controls. Guide uses a named dismissible panel with deliberate focus return. Motion is finite, root-attached, fixed-camera, with visible skip/pause and genuine static alternatives. No magnetic controls or automatic audio.

## Cycle budget

1. Keyboard, language, validation, clipboard recovery and stable status regions.
2. Root placement, leaf attachment, static/WebGL lifecycle and transition continuity.
3. Measure and reduce initial loading costs; repeat identical cold-load measurements.
4. Opt-in song/dance and compliment, then full regression and independent review.

Existing QA/UI/performance skills were reused; no duplicate skill framework was needed. Native hook support was checked against installed Codex CLI 0.137.0 and current official documentation. Any prepared local hooks remain subject to the normal review/trust mechanism; explicit npm commands work independently of hooks.

## Final local verification (2026-10-20)

PASS: typecheck; 3 name and 19 TypeScript tests; embedded analytics/counter/guide SQL suites; static Pages build; 26 Chromium/WebKit journeys; automated axe scan (12 states, zero violations); 27 responsive/pose screenshots; deterministic motion capture, pause and replay checks. Browser suite is bounded to two workers after an overloaded initial run; isolated WebKit also passed 10/10.

Performance gate FAIL: three matching cold-load lab runs show median LCP 5,652ms (5,448–5,964), versus baseline 28,188ms (28,108–28,212). Transfer median is 945,324 bytes versus 5,516,113. CLS .0118 passes. Target remains LCP <=2,500ms; no threshold was relaxed. These are headless desktop lab measurements, not real-phone or field p75 results. Observed scene: 84 draw calls, 20,248 triangles; frame counter stays unchanged after settling; geometry count remains 72 across replay.

Remaining limits: no connected cloud/Groq verification, live YouTube playback unverified, no physical-device/software-keyboard test, no lint configuration, and no rigged 3D actor. The optional UX skill Python catalog search was unavailable (Python absent); no Python was installed. Existing skill guidance and Node-based QA remained usable.

Hook fixture returned the expected stale-evidence warning and exited safely. Native hooks remain pending normal trust review; no bypass or automatic restart was used. See [official hook documentation](https://learn.chatgpt.com/docs/hooks) and [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference).

Run `npm run qa:full` for sequential checks; `qa:status` rejects a stale report. Large screenshots/videos remain local under `artifacts/quality/final/`; manifests record hashes and dimensions. The checked-in summary records source fingerprints and actual gate results.

Optional exported-service checks also passed against local stubs: analytics (consent/focus/axe, reload, withdrawal), counter (repeat browser and second context), guide (request/name isolation and axe). The guide-only test harness required an explicit browser context for axe; its isolated rerun passed. Summary preserves the earlier full-run fingerprints and documents this test-only delta. Default export was rebuilt afterward.

## Actor entrance and framing follow-up

Added a finite four-second 2.5D entrance, skip/reduced-motion/interrupt behavior, and the executed brief in docs/motion/actor-introduction.md. Corrected intrinsic grid image overflow and adopted a taller, width-bounded floral stage; docs/motion/flower-framing.md records the measured defect and designer acceptance. Final build,56 Chromium/WebKit journeys,axe scan,27 visual captures and motion checks pass.34 additional intro/framing checkpoint captures have hashed dimensions in the local interaction manifest. Final3-run lab LCP median5,192ms (5,188–5,192),CLS .01015,transfer median949,935B: the2,500ms LCP gate still FAILS. This remains a feature-branch review, not a production-ready claim. Supabase/Groq/live audio/physical-device limitations remain unchanged.

## Gift, photographic media and mobile follow-up (2026-10-20)

- Replaced the invitation action with an original accessible purple gift box and finite opening sequence.
- Added eight authored bilingual compliment variants; new entries avoid the prior variant, replay preserves it, and allowlisted share links retain it. The selected letter itself pops in with finite edge confetti; reduced motion remains static.
- Retired the rejected procedural renderer from the recipient route. All seven choices use species-checked real media. Orchid and Alstroemeria have visually inspected, local recorded bud-to-open clips. The other five are photographic reveals, **not actual blooming**. The owner approved free verified footage and explicitly flagging missing coverage.
- Removed the source accordion, flower counter/title strip and static-mode switch from the celebration. Retained media rights/provenance in the separate credits route and public manifest.
- Corrected the mobile actor at <=800px to a 56px dock that scrolls away from the greeting/actions; compact landscape dialog. Geometry and interaction checks cover 320,375,491 and667×375.
- WebKit native media network traffic is not consistently visible to Playwright. Media tests retain actual playback/time/pause assertions and use an explicitly documented API request for MIME/status evidence when necessary. A missing actual media URL tests native error recovery. No retry or timeout increase hides failures.

Current final gate results and exact source fingerprint are in summary.json. Historical performance failures above describe earlier renderers, not a current measurement. True skeletal 3D actor, physical device testing, live audio and connected-cloud verification remain unavailable.

Final current-source verification: all seven gates PASS at fingerprint185e3cbc84d16df3a17198f334ad149628eeb4b14d0338642684280590443c83. 3 name +21 TypeScript tests,3 embedded SQL suites,90 Chromium/WebKit journeys,zero axe findings,27 responsive captures,photographic motion checks and2 actual recorded blooms from the Pages export passed. Three cold-load lab runs: LCP median1924ms (1920–1984),CLS .01021,transfer745899B. Existing2500ms LCP/.1 CLS thresholds were not changed. Click-to-field median1108ms includes deliberate gift opening and is not INP. This establishes local scope acceptance, not connected-cloud deployment, real-phone performance or completion of the five missing bloom clips.
