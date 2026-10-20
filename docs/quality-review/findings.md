# Findings register

| ID | Journey / observation | Impact / priority | Correction / acceptance | Status |
|---|---|---|---|---|
| UX-001 | English copy retained `html lang=vi` | Pronunciation / P1 | Synchronize document language; VI→EN→VI test in Chromium/WebKit | Verified |
| UX-002 | Guide had unnamed generic panel, Escape/focus return missing | Keyboard access / P1 | Named nonmodal dialog, explicit trigger relationship, global Escape, logical focus return, mounted conversation log | PASS final Chromium/WebKit regression |
| UX-003 | Consent panel removed focused controls | Keyboard access / P1 | Announce optional choice without stealing focus; explicit open/Escape/choice returns focus | PASS enabled export: axe and preference focus |
| UX-004 | Clipboard denial only said retry | Sharing recovery / P2 | Selectable URL, explanatory status, focus/select fallback | Verified Chromium/WebKit |
| UX-005 | Existing validation stayed in old language | Clarity / P2 | Store issue code and derive localized copy | Verified |
| MOTION-001 | Every petal root occupied same radial Z axis | Connected flower / P1 | Angular parent → radial offset → root pivot; verify real checkpoint scene | Fixed, independent review confirmed roots |
| MOTION-002 | Secondary leaves floated off stem | Connected flower / P1 | Derive roots from the exact stem curve | Verified by motion reviewer |
| MOTION-003 | Photo bud faded over unrelated procedural stems | Double bouquet / P1 | Keep reference invitation; explicit 3D preview on personalization; remove crossfade | Verified no double exposure |
| MOTION-004 | Static/reduced mode allocated WebGL | Accessibility/resources / P1 | Gate canvas and support probing; static artwork immediately available | Verified |
| MOTION-005 | Open petals too flat / serrated | Core visual / P1 | Reduce opening/curl, keep upright inner cup, soften broad edge; real p0/.25/.5/.75/1 review | PASS independent final checkpoint review; stylized material remains |
| MOTION-006 | Replay timer raced rendered closing pose | Motion continuity / P1 | Scene closing-complete event controls replay; no fixed parent timer | PASS independent live trace: 1 → .73 → .39 → 0, then bloom |
| MOTION-007 | Hover, scroll and acting overwrote transform | Interaction / P2 | Separate motion wrappers and bounded scroll settle | Fixed; final regression recorded in summary.json |
| PERF-001 | Initial photo/actor PNGs and eager 3D: lab LCP median 28,188ms | Slow connection / P1 | WebP display assets, late scene initialization, typed internal payload without eager external validator | FAIL target: LCP median 5,652ms after vs 28,188ms baseline; transfer 945,324B vs 5,516,113B |
| DANCE-001 | Newly requested dance/music | Authorized new feature | Four rendered sprite poses; finite silent dance; official player opt-in; play/pause drives dance; no copied recording | Local player-fixture tests pass; live audio unverified |
| SCOPE-001 | Game/export/saved cards absent | Scope fact | Record as planned, do not add entire missing products during audit | Deferred |
| ASSET-001 | Actor has no skeletal/facial rig | Product limitation | Describe as rendered sprite likeness; no claim of true rigged 3D | Blocked on authored model |
| CLOUD-001 | No Supabase project or Groq key configured | Integration verification | Local SQL/handler/stub tests only; no production mutations | BLOCKED cloud verification |

Evidence: baseline commit `3f6c096`, `artifacts/quality/baseline/`, independent journey/motion reviewer reports, `tests/browser/quality.spec.ts`, `scripts/qa-motion.mjs`. Final statuses and fingerprint are in `summary.json` after verification. This register does not turn a missing or old check into PASS.
