# 🚀 API Explorer Dashboard

A personal mission-control dashboard: live weather, national + tech news, OneNote reader, YouTube viewer with per-video notes, and an improvements tracker. Glass UI with animated aurora background, dark/light theme, and 3D hover effects.

**Stack:** React 19 + Vite · Express + better-sqlite3 · OpenWeatherMap + NewsAPI + Hacker News

> **Do not use `axios`** — use native `fetch` instead. Axios was compromised in a supply chain attack.

---

## 🖥️ Features

| Section | What it does |
|---|---|
| 🌤️ Weather | Live multi-city tiles with condition gradients and 3D hover tilt |
| 📰 National News | Top Indian headlines — expandable summaries, like/dislike |
| 💻 Tech News | Hacker News top stories with colour-coded score badges |
| 📓 OneNote | Sidebar + Markdown reader (edit `static/onenote_pages.json`) |
| 🎬 YouTube | Playlist + iframe embed + per-video timestamped notes |
| 💡 Improvements | Full CRUD goal tracker stored in SQLite |
| ☀️/🌙 | Dark / light theme toggle — top-right button |
| ⚙️ | Tweaks panel: accent colour, density, clock format — bottom-left button |

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite 8 |
| Backend | Node.js · Express 5 |
| Database | better-sqlite3 (local at `server/db/dashboard.db`) |
| HTTP | Native `fetch` — no axios |
| APIs | OpenWeatherMap · NewsAPI · Hacker News Firebase API |

---

## 🗂️ Project Structure

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
│   │       ├── Hero.jsx         # Live clock + greeting
│   │       ├── QuoteBanner.jsx  # Developer excuses + motivational quotes
│   │       ├── Weather.jsx      # Tiles + add/remove cities
│   │       ├── NationalNews.jsx
│   │       ├── TechNews.jsx
│   │       ├── OneNote.jsx      # Sidebar + Markdown renderer
│   │       ├── YouTube.jsx      # Playlist + iframe + notes
│   │       └── Improvements.jsx # Full CRUD with SQLite backend
│   └── vite.config.js           # Proxies /api → localhost:3001
│
├── server/                      # Express API
│   ├── index.js
│   ├── db.js                    # better-sqlite3 setup + seed improvements
│   └── routes/
│       ├── weather.js           # GET /api/weather
│       ├── news.js              # GET /api/news  (NewsAPI with mock fallback)
│       ├── hn.js                # GET /api/hn    (Hacker News)
│       ├── staticData.js        # GET /api/static/:key → serves static/*.json
│       └── improvements.js      # GET/POST/PATCH/DELETE /api/improvements
│
├── static/                      # Edit these to personalise your dashboard
│   ├── config.json              # Cities, news country
│   ├── youtube_videos.json      # Your YouTube embed URLs
│   ├── onenote_pages.json       # Your notes (Markdown supported)
│   └── excuses.json             # Programmer excuses list
│
├── security/                    # 🔒 GITIGNORED — store any auth files here
│
├── .env.example                 # Copy to server/.env
└── README.md
```

---

## 🚀 Running Locally

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
NEWS_API_KEY=your_key           # newsapi.org → free (dev/localhost only)
```

> NewsAPI free tier works from localhost only. On production, use a paid plan or a different news source. If no key is set, the server returns mock news automatically.

### 3. Customise your data

Edit files in `static/` to personalise your dashboard:

**`static/config.json`** — your cities:
```json
{
  "weather": [
    { "city": "Noida", "country": "IN", "units": "metric" }
  ],
  "news": { "country": "in" }
}
```

**`static/youtube_videos.json`** — use embed URLs:
```json
[{ "title": "My Video", "url": "https://www.youtube.com/embed/VIDEO_ID", "channel": "Channel Name" }]
```

**`static/onenote_pages.json`** — your notes (supports `##`, `###`, `**bold**`, `` `code` ``, fenced code blocks):
```json
[{ "id": "n1", "notebook": "Dev Notes", "modified": "2026-06-07", "title": "My Note", "body": "## Title\n- bullet" }]
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

## 🔒 Security Folder

`security/` is **gitignored** — nothing inside it will ever be committed. Store here:
- Microsoft Graph OAuth tokens (for real OneNote integration)
- Service account JSON files
- Any credentials that shouldn't go in `.env`

---

## 🗃️ Database

SQLite auto-created at `server/db/dashboard.db` on first run. Seeded with 5 sample improvement items.

| Table | What it holds |
|---|---|
| `improvement_notes` | Goals with title, detail, priority, status |
| `interactions` | Reserved for news reactions (currently localStorage) |
| `notes` | Reserved for web page notes |
| `highlights` | Reserved for web page highlights |

---

## 🔑 Getting API Keys (Free)

| API | Where |
|---|---|
| OpenWeatherMap | `openweathermap.org` → Sign up → API Keys (activates ~10 min) |
| NewsAPI | `newsapi.org` → Get API Key → verify email |
| Hacker News | No key needed — fully open API |

---

## 🎨 Theming

All colours are CSS custom properties defined in `client/src/index.css`:
- **Dark** — Catppuccin Mocha palette (default)
- **Light** — Catppuccin Latte palette
- **Accent** — 4 options: blue · mauve · peach (default) · teal
- Preferences persist in `localStorage` automatically

---

## 🛣️ Roadmap

- [x] Express + React full-stack migration from Python/Streamlit
- [x] Dark / light theme toggle
- [x] Glass cards with 3D cursor tilt + spotlight
- [x] Animated aurora background with mouse parallax
- [x] Improvements tracker with SQLite CRUD
- [x] `security/` folder (gitignored)
- [ ] Move news reactions from localStorage → SQLite
- [ ] Real OneNote via Microsoft Graph API
- [ ] Deploy backend on Railway / Render
- [ ] Deploy frontend on Vercel
- [ ] Switch SQLite → CockroachDB

---

## 📝 Notes

- `server/db/` and `server/.env` are gitignored — never committed
- `security/` folder is gitignored — safe to store credentials
- All dashboard content in `static/` — commit-safe, no secrets
- HN data is live from the [Hacker News API](https://github.com/HackerNews/API) — no key, always free
- **Do not use `axios`** — use native `fetch` (axios had a supply chain attack)

---

Made by [Aviral Tanwar](https://github.com/AviralTanwar)
