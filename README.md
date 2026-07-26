# API Explorer Dashboard

A personal mission-control dashboard: year progress KPI, live weather, a data-driven news section (national + tech, more sources addable via SQLite), OneNote reader, YouTube viewer with per-video notes, a web page annotator, and an improvements tracker. Glass UI with animated aurora background, dark/light theme, and 3D hover effects.

**Stack:** React 19 + Vite · Express 5 (serverless on Vercel) · Supabase Postgres · OpenWeatherMap + Google News RSS

> **Architecture:** the React client and the Express API deploy as **one Vercel project** (same origin — the client calls `/api/*` relatively). Data lives in **Supabase Postgres**, reached server-side via `@supabase/supabase-js` with the service-role key. Locally you run the same Express app with `node server/index.js` and the Vite dev server, both pointing at the same Supabase project.

> **Do not use `axios`** - use native `fetch` instead. Axios was compromised in a supply chain attack.

---

## Features

| Section | What it does |
|---|---|
| 📅 Year KPI | Days left in the year + progress bar with colour-coded urgency |
| 🌤️ Weather | Live multi-city tiles with condition gradients and 3D hover tilt. Cities managed via SQLite (add/remove up to 6, permanent cities cannot be removed) |
| 📰 News | One panel per **live** row in `tbl_news_kpi_data` - currently National (India) and Tech, both via Google News RSS. Like/dislike, swipe to skip, expandable summaries, open-in-new-tab - every article and interaction is written to SQLite in real time. Add a row to the table and a new panel appears automatically, no code changes |
| 📓 OneNote | Sidebar + Markdown reader (edit `static/onenote_pages.json`) |
| 🎬 YouTube | Playlist + iframe embed + per-video timestamped notes |
| 🌐 Web Pages | Iframe viewer for arbitrary pages + per-page notes (SQLite-backed) |
| 💡 Improvements | Full CRUD goal tracker stored in SQLite |
| ☀️/🌙 | Dark / light theme toggle - top-right button |
| ⚙️ | Tweaks panel: accent colour (theme-aware), density, clock format - bottom-left button |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite 8 |
| Backend | Node.js · Express 5 (exported as a Vercel serverless function via `api/index.js`) |
| Database | Supabase Postgres, via `@supabase/supabase-js` (service-role key, server-side only) |
| Hosting | Vercel (one project serves both client and `/api/*`) |
| HTTP | Native `fetch` - no axios |
| APIs | OpenWeatherMap (weather) · Google News RSS (all news sources - no key, no quota) |

> NewsAPI was used originally for news but is **no longer used**: its free tier is ~24h delayed, gets dominated by a single crawled source, and rate-limits at 100 requests/day. Google News RSS has none of those limits and updates within minutes of publication.

---

## Project Structure

```
API Explorer Dashboard/
├── client/                      # React app (Vite)
│   ├── src/
│   │   ├── App.jsx              # Root: layout, aurora, scroll-spy, tweaks panel
│   │   ├── App.css              # Tweaks panel + fixed button styles
│   │   ├── index.css            # CSS token system (dark + light themes, all global styles)
│   │   ├── hooks/
│   │   │   ├── useLocalStorage.js
│   │   │   ├── useTime.js
│   │   │   └── useCountUp.js
│   │   └── components/
│   │       ├── shared/          # Card (3D glass), Chip, SectionHeader
│   │       ├── layout/          # SideNav (drawer, theme toggle, scroll-spy)
│   │       ├── YearKPI.jsx      # Days-left-in-year KPI bar (top of page)
│   │       ├── Hero.jsx         # Live clock + greeting + scanline
│   │       ├── QuoteBanner.jsx  # Developer excuses + motivational quotes
│   │       ├── Weather.jsx      # Tiles + add/remove cities (SQLite-backed)
│   │       ├── News.jsx         # Outer card - fetches live KPIs, renders one NewsPanel per row
│   │       ├── NewsPanel.jsx    # Generic news panel (like/dislike/skip/more/open), reused per KPI
│   │       ├── OneNote.jsx      # Sidebar + Markdown renderer
│   │       ├── YouTube.jsx      # Playlist + iframe + notes
│   │       ├── WebPages.jsx     # Iframe viewer + per-page notes
│   │       └── Improvements.jsx # Full CRUD with SQLite backend
│   └── vite.config.js           # Proxies /api → localhost:3001
│
├── api/
│   └── index.js                 # Vercel serverless entry: re-exports server/app.js
│
├── server/                      # Express API
│   ├── app.js                   # builds + EXPORTS the Express app (no listen) - used by both local + Vercel
│   ├── index.js                 # LOCAL only: require('./app').listen(3001)
│   ├── db.js                    # thin @supabase/supabase-js client (no schema/migrations/seeds)
│   └── routes/                  # all async, all on Supabase:
│       ├── weather.js           # /api/weather              (OpenWeatherMap; base URL from tbl_weathers)
│       ├── weatherCities.js     # /api/weather-cities       (tbl_weathers_card)
│       ├── newsKpis.js          # /api/news-kpis            (live rows from tbl_news_kpi_data)
│       ├── news.js              # /api/news/:kpiId          (merges tbl_news_feeds, dedupes, 15min in-mem cache)
│       ├── newsInteractions.js  # /api/reactions            (tbl_news_data upsert)
│       ├── quotes.js            # /api/quotes/*             (tbl_quotes; proxies each source)
│       ├── improvements.js      # /api/improvements         (tbl_improvements)
│       ├── todoSummaries.js     # /api/todo-summaries       (tbl_to_do_summary)
│       ├── todos.js             # /api/todos                (tbl_to_do)
│       ├── notes.js             # /api/notes                (tbl_notes + tbl_notes_data)
│       ├── onenote.js           # /api/onenote              (tbl_onenote_pages)
│       ├── viewKpis.js          # /api/view-kpis            (tbl_view_kpi)
│       ├── userInfo.js          # /api/user-info            (tbl_user_info)
│       ├── credentials.js       # /api/credentials/verify   (bcrypt against tbl_credentials)
│       ├── webPageDownloads.js  # /api/web-page-downloads   (PDF BYTEA in tbl_web_pge_downloads)
│       ├── proxy.js             # /api/proxy                (outbound page proxy - no DB)
│       └── staticData.js        # /api/static/:key          (serves static/*.json - no DB)
│
├── supabase/
│   ├── schema.sql               # run first in the Supabase SQL editor
│   └── seed.sql                 # run second (baseline data, idempotent)
│
├── static/                      # Edit these to personalise your dashboard
│   ├── config.json              # Misc config
│   ├── youtube_videos.json      # Your YouTube embed URLs
│   ├── onenote_pages.json       # Your notes (Markdown supported)
│   ├── web_pages.json           # Pages to load in the Web Pages viewer
│   └── excuses.json             # Programmer excuses list
│
├── security/                    # GITIGNORED - store any auth files here
│
├── .env.example                 # Copy to server/.env
└── README.md
```

---

## Running Locally

You need a **Supabase project** (see [Deployment](#deployment) step 1–2 to create it and load the schema), then **two terminals**.

### 1. Install dependencies

Server runtime deps live in the **repo-root** `package.json` now (so Vercel can resolve them). Install once at the root, plus the client:

```bash
npm install            # repo root - installs express, @supabase/supabase-js, etc.
cd client && npm install && cd ..
```

### 2. Set up env vars

```bash
copy .env.example server\.env
```

Edit `server/.env`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Project Settings → API → service_role (server-side only!)
OPENWEATHER_API_KEY=your_key           # openweathermap.org → free signup
```

> News, quotes, and the weather API URL all live in the database (`tbl_news_feeds` / `tbl_quotes` / `tbl_weathers`), so there are no `NEWS_API_KEY`, `QUOTES_API_URL`, or `MS_*` variables anymore.

### 3. Customise your data

**Weather cities** are managed at runtime via the dashboard UI (Add / Remove on the Weather tile). Permanent cities (seeded on first run) cannot be removed. To change the permanent seed cities, edit `server/db.js`.

**News sources** are managed entirely through the `tbl_news_kpi_data` table - there is no UI for it yet. To add a source: insert a row with `name`, `tag`, `logo` (emoji), `api_url` (any RSS feed URL), `api_name`, and `live = 1`. A new panel appears on next page load. Set `live = 0` to retire a source without deleting its history.

Edit files in `static/` to personalise other sections:

**`static/youtube_videos.json`** - use embed URLs:
```json
[{ "title": "My Video", "url": "https://www.youtube.com/embed/VIDEO_ID", "channel": "Channel Name" }]
```

**`static/onenote_pages.json`** - supports `##`, `###`, `**bold**`, `` `code` ``, fenced code blocks:
```json
[{ "id": "n1", "notebook": "Dev Notes", "modified": "2026-06-08", "title": "My Note", "body": "## Title\n- bullet" }]
```

### 4. Run

**Terminal 1 - Backend:**
```bash
cd server
node index.js
# → Server running on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173`. Vite proxies all `/api` calls to the server.

---

## Deployment

Deployed as **one Vercel project** (client + API, same origin) backed by **Supabase Postgres**.

### 1. Create the Supabase project
- supabase.com → New project. Note the **Project URL** and the **service_role key** (Project Settings → API).

### 2. Load the schema + seed
- Supabase → SQL Editor → paste and run **`supabase/schema.sql`**, then **`supabase/seed.sql`** (in that order).
- This creates all tables and the baseline data. It does **not** migrate your existing local SQLite data — move any saved improvements / to-dos / notes / custom cities by hand if you want them in prod.

### 3. Connect the repo to Vercel
- Vercel → New Project → import this Git repo. `vercel.json` already sets the build (`cd client && npm install && npm run build`), the output dir (`client/dist`), and the `/api/(.*) → /api` rewrite. Root `package.json` provides the serverless function's dependencies.

### 4. Set environment variables (Vercel → Settings → Environment Variables)
Because `.env` is gitignored, add these in the dashboard for Production (and Preview if you use it):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — **never** prefix with `VITE_` |
| `OPENWEATHER_API_KEY` | your OpenWeatherMap key |

Deploy. The client calls `/api/*` relatively, so no client-side URL config is needed.

> **Known limitation:** the Web Pages proxy (`/api/proxy`) uses outbound fetches up to 20s; Vercel Hobby functions cap at ~10s, so proxying slow sites may time out in production even though it works locally.

---

## Security Folder

`security/` is **gitignored** - nothing inside it will ever be committed. Store here:
- Microsoft Graph OAuth tokens (for real OneNote integration)
- Service account JSON files
- Any credentials that shouldn't go in `.env`

---

## Database

**Supabase Postgres.** The schema is applied by hand once from `supabase/schema.sql`, then baseline data from `supabase/seed.sql` — there are **no runtime migrations** (serverless has no startup to run them on). All access is server-side through the service-role key, which bypasses Row Level Security; RLS is left enabled with no policies so the anon key gets zero access.

| Table | What it holds |
|---|---|
| `tbl_news_kpi_data` | News source registry - one row per News panel. `live` controls rendering |
| `tbl_news_feeds` | RSS feed URLs per news KPI (many feeds → one KPI); the News panel merges them |
| `tbl_news_data` | Every article ever shown, tagged by `news_api_id`. Tracks `response`, `link_open`, `clicked_on_more`, `live`, `news_date`, `shown` |
| `tbl_view_kpi` | Dashboard section registry - order (`rank`) + visibility of each section |
| `tbl_quotes` | Hero-band quote sources (motivational / developer), each with title, logo, color, api |
| `tbl_notes`, `tbl_notes_data` | Web-page / YouTube / improvement note wrappers + their content entries |
| `tbl_to_do_summary`, `tbl_to_do` | Kanban boards and their task cards |
| `tbl_web_pge_downloads` | Uploaded PDFs stored inline as `BYTEA` |
| `tbl_improvements` | Improvements & feedback tracker (status incl. `hold`, plus a `remark`) |
| `tbl_weathers_card` | Weather cities (permanent flag, soft-delete) |
| `tbl_weathers` | Weather API source URL the server proxies |
| `tbl_user_info` | Single-row user profile (name, timezone offset, etc.) |
| `tbl_credentials` | bcrypt hash for the to-do unlock |
| `tbl_onenote_pages` | OneNote-style scratchpad pages |

**Two `deleted_at` conventions are preserved from the original SQLite schema:** most `tbl_*` tables use the string sentinel `'0000-00-00 00:00:00'` (kept as `TEXT`, since that string is not a valid Postgres timestamp), while `tbl_news_data`, `tbl_weathers_card`, and `tbl_news_kpi_data` use `NULL` (kept as `TIMESTAMPTZ`). 0/1 flag columns are kept as `SMALLINT` (not `BOOLEAN`) so existing server logic and client `=== 1` checks keep working.

> The legacy `notes`, `highlights`, `interactions`, and `web_notes` tables from earlier versions are **not** recreated in Postgres — no route uses them.

---

## Getting API Keys (Free)

| API | Where |
|---|---|
| OpenWeatherMap | `openweathermap.org` → Sign up → API Keys (activates ~10 min) |
| Google News RSS | No key needed - used directly via the URL stored in `tbl_news_kpi_data.api_url` |

---

## Theming

All colours are CSS custom properties defined in `client/src/index.css`:
- **Dark** - Catppuccin Mocha palette (default)
- **Light** - Catppuccin Latte palette
- **Accent** - 4 options: blue · mauve · peach (default) · teal - each resolves to a theme-appropriate shade automatically (the dark-mode pastel would fail contrast on the light background, so light mode uses the saturated Latte equivalent of whichever hue you pick)
- Preferences persist in `localStorage` automatically

---

## Roadmap

- [x] Express + React full-stack migration from Python/Streamlit
- [x] Dark / light theme toggle
- [x] Glass cards with 3D cursor tilt + spotlight
- [x] Animated aurora background with mouse parallax
- [x] Improvements tracker with SQLite CRUD
- [x] `security/` folder (gitignored)
- [x] News reactions persisted in SQLite
- [x] Weather cities managed in SQLite (add/remove, soft-delete, permanent flag)
- [x] Year progress KPI card
- [x] Switched all news sources from NewsAPI to Google News RSS (no key, no quota, real-time)
- [x] News section generalized to a data-driven KPI registry (`tbl_news_kpi_data`) - panels are config, not code
- [x] Migrated SQLite → Supabase Postgres (all routes on `@supabase/supabase-js`)
- [x] Restructured for single-project Vercel deploy (client + API same origin)
- [ ] Move the news RSS cache from in-memory into Postgres (Phase 3 — needed for serverless)
- [ ] Daily keep-alive cron so Supabase free tier doesn't pause (Phase 4)
- [ ] Admin UI for managing news KPIs (currently DB-only)
- [ ] Real OneNote via Microsoft Graph API

---

## Notes

- `server/db/` and `server/.env` are gitignored - never committed
- `security/` folder is gitignored - safe to store credentials
- All static dashboard content in `static/` - commit-safe, no secrets
- **Do not use `axios`** - use native `fetch` (axios had a supply chain attack)

---

Made by [Aviral Tanwar](https://github.com/AviralTanwar)
