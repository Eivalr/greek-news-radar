# Greek News Radar

Production-oriented Next.js dashboard that ingests Greek news daily and presents article links, Greek summaries, impact analysis, scoring, and a 30-day searchable archive.

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind
- Backend: Next.js API routes
- Storage: SQLite + Prisma
- Ingestion: RSS-first, HTML section parsing fallback, plus site-restricted search RSS fallback
- Scheduler: `node-cron` (default) with timezone support (`Europe/Athens`) and cron webhook endpoint for external schedulers

## Core Features

- Daily ingest from:
  - `kathimerini.gr`
  - `naftemporiki.gr`
  - `ot.gr`
- Dashboard with:
  - Manual `Refresh now`
  - Last refresh status/time
  - Date range controls (`Today`, `3d`, `7d`, `custom`)
  - Search/filter by category, source, impact threshold, tags
- Views:
  - `Today digest` (up to 3 items/category, max 15)
  - `Daily Brief` (top 5 by impact score)
  - `Archive` (30 days)
- Deduplication:
  - exact URL dedupe
  - near-duplicate normalized-title dedupe (48h window, cross-source)
- Confidence handling:
  - `HIGH` / `MED` / `LOW`
  - paywalled/limited text falls to lower confidence
- Greek summary + impact sections are generated from accessible article text/snippet (extractive, non-hallucinatory approach)

## Source Configuration

Edit source domains/feeds/sections in:

- [`/Users/vsak/Documents/Personal/Hobbies/Programming/Greek Dashboard/app/lib/ingestion/sources.ts`](/Users/vsak/Documents/Personal/Hobbies/Programming/Greek Dashboard/app/lib/ingestion/sources.ts)

Default feed/section candidates are included per source; runtime attempts RSS first, then section listing extraction.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Initialize SQLite schema:

```bash
npx prisma db push
npx prisma generate
```

4. Run development server:

```bash
npm run dev
```

The app auto-seeds on first load if DB is empty (`seedIfEmpty()`), and you can also seed manually:

```bash
npm run db:seed
```

## Daily Refresh (09:00 Europe/Athens)

Defaults:

- `NEWS_REFRESH_CRON="0 9 * * *"`
- `NEWS_REFRESH_TIMEZONE="Europe/Athens"`
- `SCHEDULER_MODE="node-cron"`
- `SCHEDULER_ENABLED="true"`
- `INGESTION_LOOKBACK_HOURS="36"`

## Deploy on Render

This repo includes [`/Users/vsak/Documents/Personal/Hobbies/Programming/Greek Dashboard/render.yaml`](/Users/vsak/Documents/Personal/Hobbies/Programming/Greek Dashboard/render.yaml) for Blueprint deployment.

1. Push this project to GitHub.
2. In Render select `New` -> `Blueprint` and choose the repo.
3. Render will create one web service with:
- Persistent disk at `/var/data`
- `DATABASE_URL=file:/var/data/dev.db`
- Prisma schema sync on boot (`npx prisma db push`)
- In-app daily scheduler at 09:00 `Europe/Athens`

Important: if your Render instance can sleep, the in-app scheduler can miss executions. Use an always-on plan for strict daily refresh behavior.

### External Scheduler Mode

If deploying to serverless, set:

- `SCHEDULER_MODE="external"`

Then schedule daily calls to:

- `GET /api/cron/refresh?secret=<CRON_SHARED_SECRET>`

or with `Authorization: Bearer <CRON_SHARED_SECRET>`.

## API Endpoints

- `GET /api/articles`
  - Query params: `view`, `range`, `from`, `to`, `q`, `category`, `source`, `minImpact`, `tags`
- `POST /api/refresh`
  - Starts manual refresh (non-blocking)
- `GET /api/refresh/status`
  - Latest refresh run state
- `GET|POST /api/cron/refresh`
  - Scheduled refresh trigger

## Tests

Run parser/dedupe helper tests:

```bash
npm test
```

Included tests:

- HTML parsing + enrichment transform
- near-duplicate title similarity

## Notes on Grounding and Confidence

- Summaries and impacts are generated only from extracted, accessible content (title/snippet/body).
- If accessible text is short or paywalled indicators are detected, confidence is downgraded (`LOW`) and impact text explicitly indicates reduced certainty.
- No generative claims are introduced beyond available text.
