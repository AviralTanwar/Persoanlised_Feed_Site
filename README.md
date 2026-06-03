# Personalised Feed Site — API Explorer Dashboard

A personal dashboard that pulls live data from multiple APIs into one place. Designed for daily use — weather, news, YouTube notes, web page annotations, and a personal improvement tracker, all in one dark-themed interface.

> **Stack:** React + Node.js (Express) + SQLite

---

## What It Does

| Section | What it does |
|---|---|
| Weather | Live weather for multiple cities (tabs) |
| National News | Top Indian headlines with like/dislike |
| Tech News | Hacker News top stories, score-badged |
| YouTube Viewer | Watch videos with a notes panel |
| Web Page Viewer | Load any page with notes and highlights |
| Improvements | Personal tracker for things you want to improve |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (`better-sqlite3`) |
| HTTP requests | Native `fetch` — no axios |
| APIs | OpenWeatherMap, NewsAPI, Hacker News (free), Microsoft Graph (OneNote) |

---

## Project Structure

```
project/
├── server/
│   ├── index.js              # Express entry point (port 3001)
│   ├── db.js                 # SQLite setup + CRUD
│   └── routes/               # one file per section
│
├── client/
│   └── src/
│       ├── App.jsx
│       └── components/       # one file per section
│
├── db/                       # gitignored — auto-created on first run
├── static/                   # your personal config — safe to commit
│   ├── config.json           # cities, news country
│   ├── youtube_videos.json   # your YouTube video URLs
│   └── web_pages.json        # pages to annotate
│
├── .env                      # API keys — never committed
└── .env.example              # template
```

---

## Running Locally

### 1. Clone

```bash
git clone https://github.com/AviralTanwar/Persoanlised_Feed_Site.git
cd Persoanlised_Feed_Site
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Set up API keys

```bash
copy .env.example .env
```

Fill in `.env`:

```env
OPENWEATHER_API_KEY=    # openweathermap.org → free signup
NEWS_API_KEY=           # newsapi.org → free signup
MS_CLIENT_ID=           # optional — only for OneNote
MS_TENANT_ID=common
```

### 4. Configure your data

Edit `static/config.json` with your cities, `static/youtube_videos.json` with your videos, `static/web_pages.json` with pages to annotate.

### 5. Run

Two terminals:

```bash
# Terminal 1 — backend
cd server
node index.js          # http://localhost:3001

# Terminal 2 — frontend
cd client
npm run dev            # http://localhost:5173
```

---

## Database

SQLite at `db/dashboard.db`, created automatically on first server start.

| Table | What it holds |
|---|---|
| `interactions` | Like / dislike on every news article |
| `notes` | Notes per YouTube video or web page |
| `highlights` | Text highlights with colour tags |
| `improvement_notes` | Personal tracker with priority + status |

The `db/` folder is gitignored — your data stays local.

---

## Getting API Keys (Free)

| API | Where |
|---|---|
| OpenWeatherMap | openweathermap.org → Sign up → My API Keys |
| NewsAPI | newsapi.org → Get API Key |
| Hacker News | No key — fully open API |
| OneNote | Azure Portal → App Registration → `Notes.Read` permission |

---

## Notes

- `.env` and `db/` are gitignored — never committed
- Do not use `axios` — native `fetch` only (axios had a supply chain attack)
- All personal config is in `static/` — safe to commit, no secrets
- See `PROJECT_REFERENCE.md` for the full technical reference (schemas, routes, patterns)

---

Made by [Aviral Tanwar](https://github.com/AviralTanwar)
