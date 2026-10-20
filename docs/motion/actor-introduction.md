# Actor introduction: executed motion brief

## Design prompt

On NỞ’s initial invitation, introduce the existing portrait-based guide as a warm host offering one pink rose. Enter from beyond the left edge along a short upward arc. Let gravity read through a faster descent and a restrained 5% landing compression. Recover without elastic bounce. Move toward the viewer with a 1.2× perspective-like scale and hold the flower offer long enough to understand. Return to the existing bottom-right companion position. Keep the forest/ivory/magenta direction, original identity, and all gift controls. No automatic music, AI call, particles, camera orbit or blocking intro screen.

Execute with a four-second, finite Web Animations timeline. Animate transform/opacity only. Read geometry once at start; do not measure or update React each frame. Decode the existing 14.8KB WebP, share its URL/cache with the dock, and abandon the intro if the asset is unavailable after 1.2 seconds. Do not add an animation framework, canvas, video or new image payload. Keep skip/Escape, bypass on reduced motion, stop on navigation/scroll/resize/user intent, pause when hidden, and cancel owned work on unmount. Greeting and guide must remain usable without this animation.

## Implementation

`ActorIntroduction.tsx` executes the brief with precomputed normalized keyframes. The artistically chosen ascent, descent, compression, offer hold and dock timing are original decisions. This is a 2.5D portrait animation, not an articulated skeleton, physically simulated jump or new facial rig. A truly articulated flower handoff requires an authorized authored model with hand/arm/facial animation; a still portrait does not contain that geometry.

- 0–0.8s: lateral leap and apex.
- 0.8–1.44s: descent, compression and recovery.
- 1.44–2.32s: move closer and offer.
- 2.32–3.2s: quiet hold.
- 3.2–4s: dock and hand back to the companion.

No analytics consent or personalization storage is changed. The intro runs once per mounted page experience; reload may introduce the host again. Direct recipient links bypass it as the celebration begins. Any pointer action outside the intro or keyboard Tab/Enter yields immediately. It never steals focus on automatic completion.

## Research used

- [web.dev: high-performance animations](https://web.dev/articles/animations-guide?hl=en): transform/opacity, inspect actual rendering cost. These properties help avoid layout/paint work but do not guarantee frame rate.
- [W3C: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide): automatic movement needs appropriate stopping behavior; this implementation is finite and additionally skippable.
- [WebKit reduced-motion example](https://webkit.org/blog-files/prefers-reduced-motion/prm.htm): nonessential spatial motion is omitted for reduced-motion preference.

## Verification

Run `npm run typecheck`, `npx playwright test`, and `npm run qa:build`. `tests/browser/introduction.spec.ts` covers timeline/viewport bounds, skip focus, reduced motion, user interruption and 1440/390/320/short-landscape checkpoint captures. Evidence is local under `artifacts/quality/introduction/`. Prior whole-site performance findings remain unresolved until a new production-export measurement is recorded; this feature must not be represented as achieving universal 60FPS or the existing LCP target.
