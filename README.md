# Greek News Radar

Stateless Next.js app that fetches Greek news on demand when you open the site or click `Refresh now`.

## What changed

- No database
- No archive storage
- No background scheduler
- No always-on requirement

The app processes sources live and keeps results only in server memory for the current runtime instance.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- API routes for live ingestion
- RSS + section parsing + site-restricted fallback

## Features

- Sources: `kathimerini.gr`, `naftemporiki.gr`, `ot.gr`
- Categories (exactly one per item):
  - Trade
  - Transportation / Logistics / Shipping / Aviation
  - Economics / Business / Markets
  - Geopolitical / Security / Energy
  - Major daily Greek news
- On-demand refresh with dedupe and confidence labels
- Views:
  - Today digest (up to 3 per category, max 15)
  - Daily Brief (top 5)
- Filters: date range, search, category, source, impact threshold, tags

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Netlify

1. Push to GitHub (already done for this repo).
2. In Netlify: `Add new site` -> `Import an existing project`.
3. Select `Eivalr/greek-news-radar`.
4. Netlify will use [`netlify.toml`](/Users/vsak/Documents/Personal/Hobbies/Programming/Greek Dashboard/netlify.toml):
- Build command: `npm run build`
- Next.js runtime plugin: `@netlify/plugin-nextjs`
- Node version: `22`
5. In Site settings -> Environment variables, set:
- `INGESTION_LOOKBACK_HOURS=36`
6. Deploy.

## API

- `GET /api/refresh` -> fetches current snapshot (runs ingestion if empty)
- `POST /api/refresh` -> forces a fresh ingestion run
- `GET /api/articles` -> lightweight list wrapper over current snapshot rows

## Environment

- `INGESTION_LOOKBACK_HOURS` (default `36`)

## Tests

```bash
npm test
```

Current tests cover parsing and near-duplicate title similarity helpers.
