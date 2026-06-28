# API Explorer Dashboard

A personal mission-control dashboard: year progress KPI, live weather, a data-driven news section (national + tech, more sources addable via SQLite), OneNote reader, YouTube viewer with per-video notes, a web page annotator, and an improvements tracker. Glass UI with animated aurora background, dark/light theme, and 3D hover effects.

**Stack:** React 19 + Vite · Express + better-sqlite3 · OpenWeatherMap + Google News RSS

> **Do not use `axios`** — use native `fetch` instead. Axios was compromised in a supply chain attack.

---

## Features

| Section | What it does |
|---|---|
| 📅 Year KPI | Days left in the year + progress bar with colour-coded urgency |
| 🌤️ Weather | Live multi-city tiles with condition gradients and 3D hover tilt. Cities managed via SQLite (add/remove up to 6, permanent cities cannot be removed) |
| 📰 News | One panel per **live** row in `tbl_news_kpi_data` — currently National (India) and Tech, both via Google News RSS. Like/dislike, swipe to skip, expandable summaries, open-in-new-tab — every article and interaction is written to SQLite in real time. Add a row to the table and a new panel appears automatically, no code changes |
| 📓 OneNote | Sidebar + Markdown reader (edit `static/onenote_pages.json`) |
| 🎬 YouTube | Playlist + iframe embed + per-video timestamped notes |
| 🌐 Web Pages | Iframe viewer for arbitrary pages + per-page notes (SQLite-backed) |
| 💡 Improvements | Full CRUD goal tracker stored in SQLite |
| ☀️/🌙 | Dark / light theme toggle — top-right button |
| ⚙️ | Tweaks panel: accent colour (theme-aware), density, clock format — bottom-left button |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite 8 |
| Backend | Node.js · Express 5 |
| Database | better-sqlite3 (local at `server/db/dashboard.db`) |
| HTTP | Native `fetch` — no axios |
| APIs | OpenWeatherMap (weather) · Google News RSS (all news sources — no key, no quota) |

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
│   │       ├── News.jsx         # Outer card — fetches live KPIs, renders one NewsPanel per row
│   │       ├── NewsPanel.jsx    # Generic news panel (like/dislike/skip/more/open), reused per KPI
│   │       ├── OneNote.jsx      # Sidebar + Markdown renderer
│   │       ├── YouTube.jsx      # Playlist + iframe + notes
│   │       ├── WebPages.jsx     # Iframe viewer + per-page notes
│   │       └── Improvements.jsx # Full CRUD with SQLite backend
│   └── vite.config.js           # Proxies /api → localhost:3001
│
├── server/                      # Express API
│   ├── index.js
│   ├── db.js                    # better-sqlite3 setup + schema + migrations + seeds
│   └── routes/
│       ├── weather.js           # GET /api/weather             (OpenWeatherMap)
│       ├── weatherCities.js     # GET/POST/DELETE /api/weather-cities (SQLite)
│       ├── newsKpis.js          # GET /api/news-kpis           (live rows from tbl_news_kpi_data)
│       ├── news.js              # GET /api/news/:kpiId         (fetches kpi.api_url, dedupes, caches 15min)
│       ├── newsInteractions.js  # GET/POST /api/reactions      (tbl_news_data — like/dislike/open/more/live)
│       ├── staticData.js        # GET /api/static/:key         (serves static/*.json)
│       ├── webNotes.js          # GET/POST /api/web-notes      (SQLite)
│       ├── improvements.js      # GET/POST/PATCH/DELETE /api/improvements (SQLite)
│       └── quotes.js            # GET /api/quotes              (QUOTES_API_URL passthrough)
│
├── static/                      # Edit these to personalise your dashboard
│   ├── config.json              # Misc config
│   ├── youtube_videos.json      # Your YouTube embed URLs
│   ├── onenote_pages.json       # Your notes (Markdown supported)
│   ├── web_pages.json           # Pages to load in the Web Pages viewer
│   └── excuses.json             # Programmer excuses list
│
├── security/                    # GITIGNORED — store any auth files here
│
├── .env.example                 # Copy to server/.env
└── README.md
```

---

## Running Locally

You need **two terminals** open simultaneously.

### 1. Install dependencies

```bash
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Set up API keys

```bash
copy .env.example server\.env
```

Edit `server/.env`:

```env
OPENWEATHER_API_KEY=your_key    # openweathermap.org → free signup
QUOTES_API_URL=...              # any quotes API — default works out of the box
```

> News needs **no API key** — it pulls Google News RSS feeds directly. `NEWS_API_KEY` in `.env.example` is a legacy leftover from before the switch; safe to leave blank or delete.

### 3. Customise your data

**Weather cities** are managed at runtime via the dashboard UI (Add / Remove on the Weather tile). Permanent cities (seeded on first run) cannot be removed. To change the permanent seed cities, edit `server/db.js`.

**News sources** are managed entirely through the `tbl_news_kpi_data` table — there is no UI for it yet. To add a source: insert a row with `name`, `tag`, `logo` (emoji), `api_url` (any RSS feed URL), `api_name`, and `live = 1`. A new panel appears on next page load. Set `live = 0` to retire a source without deleting its history.

Edit files in `static/` to personalise other sections:

**`static/youtube_videos.json`** — use embed URLs:
```json
[{ "title": "My Video", "url": "https://www.youtube.com/embed/VIDEO_ID", "channel": "Channel Name" }]
```

**`static/onenote_pages.json`** — supports `##`, `###`, `**bold**`, `` `code` ``, fenced code blocks:
```json
[{ "id": "n1", "notebook": "Dev Notes", "modified": "2026-06-08", "title": "My Note", "body": "## Title\n- bullet" }]
```

### 4. Run

**Terminal 1 — Backend:**
```bash
cd server
node index.js
# → Server running on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173`. Vite proxies all `/api` calls to the server.

---

## Security Folder

`security/` is **gitignored** — nothing inside it will ever be committed. Store here:
- Microsoft Graph OAuth tokens (for real OneNote integration)
- Service account JSON files
- Any credentials that shouldn't go in `.env`

---

## Database

SQLite auto-created at `server/db/dashboard.db` on first run. `db.js` migrates the schema forward automatically on every server start (renames, new columns, new tables) — just restart the backend after pulling changes.

| Table | What it holds |
|---|---|
| `tbl_news_kpi_data` | News source registry — one row per panel shown in the News section. `live` controls whether it renders; `api_url` is what gets fetched |
| `tbl_news_data` | Every article ever shown, tagged by `news_api_id` (which KPI it came from). Tracks `response` (like/dislike/skip), `link_open`, `clicked_on_more`, `live` (currently on screen or not), `news_date` (real publish date), `shown` (most recent interaction code) |
| `improvement_notes` | Goals with title, detail, priority, status |
| `weathers` | Weather cities — permanent flag, soft-delete via `deleted_at` |
| `web_notes` | Per-page notes for the Web Pages viewer |
| `notes`, `highlights`, `interactions` | Legacy tables, currently unused by any route |

---

## Getting API Keys (Free)

| API | Where |
|---|---|
| OpenWeatherMap | `openweathermap.org` → Sign up → API Keys (activates ~10 min) |
| Google News RSS | No key needed — used directly via the URL stored in `tbl_news_kpi_data.api_url` |

---

## Theming

All colours are CSS custom properties defined in `client/src/index.css`:
- **Dark** — Catppuccin Mocha palette (default)
- **Light** — Catppuccin Latte palette
- **Accent** — 4 options: blue · mauve · peach (default) · teal — each resolves to a theme-appropriate shade automatically (the dark-mode pastel would fail contrast on the light background, so light mode uses the saturated Latte equivalent of whichever hue you pick)
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
- [x] News section generalized to a data-driven KPI registry (`tbl_news_kpi_data`) — panels are config, not code
- [ ] Admin UI for managing news KPIs (currently DB-only)
- [ ] Real OneNote via Microsoft Graph API
- [ ] Deploy backend on Railway / Render
- [ ] Deploy frontend on Vercel
- [ ] Switch SQLite → CockroachDB

---

## Notes

- `server/db/` and `server/.env` are gitignored — never committed
- `security/` folder is gitignored — safe to store credentials
- All static dashboard content in `static/` — commit-safe, no secrets
- **Do not use `axios`** — use native `fetch` (axios had a supply chain attack)

---

Made by [Aviral Tanwar](https://github.com/AviralTanwar)
