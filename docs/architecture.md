# NỞ / No-bloom — architecture decision 001

## Slice 1

The existing workspace contains unrelated products, so this campaign lives in its own `no-bloom` Git repository. Next.js App Router and TypeScript provide a route and metadata structure that can later host server-side AI and card operations. Slice 1 has no API or database. A small client state machine owns invitation, personalization, bloom, and greeting. The curated message is present locally in Vietnamese and English; the preferred name is normalized and stored only in the current browser session.

React Three Fiber renders shared curved petal geometry. CSS and SVG provide a complete still version on reduced-motion devices, unavailable WebGL, context loss, or manual selection. The 3D scene loads after the HTML interface. Rendering stops when idle. The flower is decorative; all meaning and actions remain in HTML.

GitHub Pages publishes this service-free slice with a build-only `GITHUB_PAGES=true` static export. Normal local builds retain the server-ready Next.js configuration. A later AI route or persistent card route requires server-capable hosting; GitHub Pages cannot run Next.js Route Handlers. The URL can remain a public invitation link, while a future server deployment needs a separate hosting decision.

## Content and assets

The floral geometry, SVG illustration, and CSS are original project code. The fuchsia rose cutout is an AI-generated project asset based on the user-provided visual reference; it is displayed after the 3D reveal and in the still greeting. Google Fonts serves DM Sans and Playfair Display, both licensed under the SIL Open Font License. No audio or stock photos are used.

The AI writer instruction is preserved in [ai-greeting-writer.md](ai-greeting-writer.md) for Slice 2; Slice 1 makes no provider call.

## Botanical UI contract

The gift now emits a validated `GENERATIVE_UI_RESPONSE` envelope as a `no-bloom:a2ui` browser `CustomEvent` whenever its meaningful UI state changes. The sole approved component in this site's catalog is `FloralGreeting`. `BUD` covers the invitation, `SPROUT` the name step, `BLOOMING` the 2.7 second 3D reveal, `FULL_BLOOM` the interactive greeting, and `WITHER_RELOAD` a correction or replay/reset. Replay contracts the flower for 450 ms before it blooms again; reduced-motion and still-flower modes advance immediately. The contract validates component names, state, colors, timing, and greeting data with Zod before dispatch.

This envelope follows the requested application schema; it is not the A2UI protocol's wire format (`createSurface`, `updateComponents`, and `updateDataModel`). An external A2UI host would need an adapter. The current gift uses local curated content and sends no name or message to a server.
