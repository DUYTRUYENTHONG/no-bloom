# NỞ / No-bloom — architecture decision 001

## Slice 1

The existing workspace contains unrelated products, so this campaign lives in its own `no-bloom` Git repository. Next.js App Router and TypeScript provide a route and metadata structure that can later host server-side AI and card operations. Slice 1 has no API or database. A small client state machine owns invitation, personalization, bloom, and greeting. The curated message is present locally in Vietnamese and English; the preferred name is normalized and stored only in the current browser session.

Three matched images of the same fuchsia rose arrangement show a closed bud, an opening rose, and the final flower. CSS perspective and 3D transforms move the floral composition through the 2.7 second bloom; opacity changes reveal the matching stages. The image sequence works without WebGL. Reduced-motion and manually selected still mode show the appropriate stage without animation. The flower is decorative; all meaning and actions remain in HTML.

GitHub Pages publishes this service-free slice with a build-only `GITHUB_PAGES=true` static export. Normal local builds retain the server-ready Next.js configuration. A later AI route or persistent card route requires server-capable hosting; GitHub Pages cannot run Next.js Route Handlers. The URL can remain a public invitation link, while a future server deployment needs a separate hosting decision.

## Content and assets

The bud and opening artwork are AI edits of the final fuchsia rose artwork, which was generated for this project from the user-provided visual reference. The three aligned images are stored as optimized WebP files in `public/`. Google Fonts serves DM Sans and Playfair Display, both licensed under the SIL Open Font License. No audio or stock photos are used.

The AI writer instruction is preserved in [ai-greeting-writer.md](ai-greeting-writer.md) for Slice 2; Slice 1 makes no provider call.

## Botanical UI contract

The gift now emits a validated `GENERATIVE_UI_RESPONSE` envelope as a `no-bloom:a2ui` browser `CustomEvent` whenever its meaningful UI state changes. The sole approved component in this site's catalog is `FloralGreeting`. `BUD` covers the invitation, `SPROUT` the name step, `BLOOMING` the 2.7 second 3D reveal, `FULL_BLOOM` the interactive greeting, and `WITHER_RELOAD` a correction or replay/reset. Replay contracts the flower for 450 ms before it blooms again; reduced-motion and still-flower modes advance immediately. The contract validates component names, state, colors, timing, and greeting data with Zod before dispatch.

This envelope follows the requested application schema; it is not the A2UI protocol's wire format (`createSurface`, `updateComponents`, and `updateDataModel`). An external A2UI host would need an adapter. The current gift uses local curated content and sends no name or message to a server.
