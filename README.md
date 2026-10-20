# No-bloom happy vietnamese woman days

**NỞ — A flower, just for you.** A standalone digital gift for Vietnamese Women’s Day, 20 October.

## Local run

Requires Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Run `npm test`, `npm run test:e2e`, `npm run typecheck`, and `npm run build` for checks. The browser suite uses installed Chrome.

The GitHub Actions workflow exports only this service-free slice to GitHub Pages. A normal local build keeps Next.js server features available for later slices. Once AI or card routes are implemented, their deployment must use a server-capable host.

## Current scope

Slice 1 includes the invitation, preferred-name flow, procedural 3D bloom, prepared Vietnamese and English greetings, replay, and a still floral view. It needs no environment variables or cloud service. AI, PNG export, saved links, and sharing are future slices. See [architecture](docs/architecture.md) and the [rose bloom implementation](docs/rose-bloom.md).

Optional visitor analytics is prepared separately for Supabase and remains disabled until configured and deployed. See [visitor analytics](docs/visitor-analytics.md).
