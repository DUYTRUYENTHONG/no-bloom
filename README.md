# No-bloom happy vietnamese woman days

**NỞ — A flower, just for you.** A standalone digital gift for Vietnamese Women’s Day, 20 October.

## Local run

Requires Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Run `npm test`, `npm run test:e2e`, `npm run typecheck`, and `npm run build` for checks. The browser suite uses installed Chrome.

GitHub Actions exports the gift to GitHub Pages. The active visitor counter uses a separate Vercel function with Upstash Redis. Historical Supabase analytics and the prepared Groq guide remain unprovisioned; Pages cannot execute server functions. The gift itself runs when they are unavailable.

## Current scope

The gift includes the invitation, name entry, flower bloom, Vietnamese and English greetings, replay, a still floral view, and personal links. These work without cloud services. The optional Groq guide requires a separately deployed function; PNG export and saved cards remain future work. See [architecture](docs/architecture.md) and the [rose bloom implementation](docs/rose-bloom.md).
Personal share links and the optional Groq guide are documented in [personal links and guide](docs/personal-links-and-guide.md). The guide falls back to local help until its server endpoint is configured.

Optional visitor analytics is prepared separately for Supabase and remains disabled until configured and deployed. See [visitor analytics](docs/visitor-analytics.md).

The optional traffic counter is prepared for Vercel + Upstash Redis and disabled until connected. It reports consenting page views and approximate unique browsers in a small top-left header display. It honors existing permission and Global Privacy Control, sends no role/name/greeting, and has private local reporting. See [visitor counter](docs/visitor-counter.md).
