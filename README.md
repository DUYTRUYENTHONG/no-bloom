# No-bloom happy vietnamese woman days

**NỞ — A flower, just for you.** A standalone digital gift for Vietnamese Women’s Day, 20 October.

## Local run

Requires Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Run `npm test`, `npm run test:e2e`, `npm run typecheck`, and `npm run build` for checks. The browser suite uses installed Chrome.

GitHub Actions exports the gift to GitHub Pages. Optional analytics, the visitor counter, and Groq guide use separate Supabase Edge Functions; Pages cannot execute those functions. The gift itself runs when they are unavailable.

## Current scope

The gift includes the invitation, name entry, flower bloom, Vietnamese and English greetings, replay, a still floral view, and personal links. These work without cloud services. The optional Groq guide requires a separately deployed function; PNG export and saved cards remain future work. See [architecture](docs/architecture.md) and the [rose bloom implementation](docs/rose-bloom.md).
Personal share links and the optional Groq guide are documented in [personal links and guide](docs/personal-links-and-guide.md). The guide falls back to local help until its server endpoint is configured.

Optional visitor analytics is prepared separately for Supabase and remains disabled until configured and deployed. See [visitor analytics](docs/visitor-analytics.md).

The optional recognized-browser counter is also prepared for Supabase and disabled by default. It shares the consent choice but has separate storage and counting semantics. See [visitor counter](docs/visitor-counter.md).
