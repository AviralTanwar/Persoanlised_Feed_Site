# Project Reference - API Explorer Dashboard

Use this file when starting from scratch. It has everything you need to rebuild the project: folder structure, packages, API keys, database schema, routes, and setup steps.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| HTTP (server) | Native `fetch` (Node 18+) - DO NOT use axios (supply chain attack) |
| HTTP (client) | Native `fetch` (built into browser) |
| Styling | Plain CSS (Catppuccin dark theme, `#11111b` background) |

---

## Folder Structure

```
project-root/
├── server/
│   ├── index.js              # Express entry point
│   ├── db.js                 # SQLite setup + all CRUD functions
│   └── routes/
│       ├── weather.js        # GET /api/weather
│       ├── news.js           # GET /api/news/national
│       ├── techNews.js       # GET /api/tech-news
│       ├── notes.js          # GET/POST/DELETE /api/notes
│       ├── highlights.js     # GET/POST/DELETE /api/highlights
│       ├── improvements.js   # GET/POST/PATCH/DELETE /api/improvements
│       └── interactions.js   # POST /api/interactions
│
├── client/
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       └── components/
│           ├── Weather.jsx
│           ├── NationalNews.jsx
│           ├── TechNews.jsx
│           ├── YouTubeViewer.jsx
│           ├── WebPageViewer.jsx
│           └── Improvements.jsx
│
├── db/
│   └── dashboard.db          # auto-created on first server start (gitignored)
│
├── static/                   # user config, safe to commit
│   ├── config.json           # cities + news settings
│   ├── youtube_videos.json   # your YouTube video list
│   └── web_pages.json        # pages to annotate
│
├── .env                      # API keys - NEVER commit (gitignored)
├── .env.example              # template to commit
└── .gitignore
```

---

## Server - npm packages

```bash
npm init -y
npm install express cors dotenv better-sqlite3
```

No axios. No other HTTP library. Use native `fetch`.

---

## Client - npm packages

```bash
npm create vite@latest . -- --template react
npm install
```

No axios. No react-router (single page). No Redux.

---

## Environment Variables (.env)

```env
OPENWEATHER_API_KEY=        # openweathermap.org → free signup → My API Keys
NEWS_API_KEY=               # newsapi.org → Get API Key → verify email
MS_CLIENT_ID=               # optional - Azure Portal → App Registration (for OneNote)
MS_TENANT_ID=common         # leave as "common" unless you know your tenant ID
```

How to get each key:

| Key | Steps |
|---|---|
| `OPENWEATHER_API_KEY` | openweathermap.org → Sign up → API Keys tab → copy Default key (takes ~10 min to activate) |
| `NEWS_API_KEY` | newsapi.org → Get API Key → verify email → copy key |
| Hacker News | No key needed - open Firebase API, always free |
| `MS_CLIENT_ID` | Azure Portal → Microsoft Entra ID → App registrations → New → Redirect URI: `http://localhost` → API permissions → add `Notes.Read` from Microsoft Graph |

---

## Database Schema (SQLite)

All tables are created automatically when the server starts.

```sql
CREATE TABLE IF NOT EXISTS interactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id     TEXT NOT NULL,
    item_type   TEXT NOT NULL,       -- 'national_news' | 'tech_news'
    interaction TEXT NOT NULL,       -- 'like' | 'dislike'
    title       TEXT,
    url         TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    context_id   TEXT NOT NULL,      -- video ID or encoded page URL
    context_type TEXT NOT NULL,      -- 'youtube' | 'webpage'
    content      TEXT NOT NULL,
    created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS highlights (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    page_url      TEXT NOT NULL,
    selected_text TEXT NOT NULL,
    note          TEXT,
    color         TEXT DEFAULT 'yellow',  -- 'yellow' | 'cyan' | 'green' | 'pink'
    created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS improvement_notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    priority   TEXT DEFAULT 'medium',   -- 'high' | 'medium' | 'low'
    status     TEXT DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'done'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## API Routes (Express)

### Server runs on port 3001, React on port 5173

| Method | Route | What it does |
|---|---|---|
| GET | `/api/weather?city=Noida&country=IN&units=metric` | Proxies OpenWeatherMap |
| GET | `/api/news/national?country=in&pageSize=6` | Proxies NewsAPI top headlines |
| GET | `/api/tech-news` | Fetches top 12 Hacker News stories |
| GET | `/api/notes?context_id=X&context_type=youtube` | Get notes for a video/page |
| POST | `/api/notes` | Save a note `{ context_id, context_type, content }` |
| DELETE | `/api/notes/:id` | Delete a note |
| GET | `/api/highlights?url=X` | Get highlights for a page |
| POST | `/api/highlights` | Save highlight `{ page_url, selected_text, note, color }` |
| DELETE | `/api/highlights/:id` | Delete a highlight |
| GET | `/api/improvements` | Get all improvements (sorted by priority) |
| POST | `/api/improvements` | Add improvement `{ title, content, priority }` |
| PATCH | `/api/improvements/:id` | Update status `{ status }` |
| DELETE | `/api/improvements/:id` | Delete an improvement |
| POST | `/api/interactions` | Toggle like/dislike `{ item_id, item_type, interaction, title, url }` |

---

## server/index.js pattern

```js
require('dotenv').config({ path: '../.env' })
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/weather',      require('./routes/weather'))
app.use('/api/news',         require('./routes/news'))
app.use('/api/tech-news',    require('./routes/techNews'))
app.use('/api/notes',        require('./routes/notes'))
app.use('/api/highlights',   require('./routes/highlights'))
app.use('/api/improvements', require('./routes/improvements'))
app.use('/api/interactions', require('./routes/interactions'))

app.listen(3001, () => console.log('Server: http://localhost:3001'))
```

---

## Route pattern (every route file looks like this)

```js
const router = require('express').Router()
const db = require('../db')         // your better-sqlite3 instance

router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM table').all()
    res.json(rows)
})

router.post('/', (req, res) => {
    const { field1, field2 } = req.body
    const result = db.prepare('INSERT INTO table (field1, field2) VALUES (?,?)').run(field1, field2)
    res.json({ id: result.lastInsertRowid })
})

router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM table WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
})

module.exports = router
```

---

## React component pattern (every component looks like this)

```jsx
import { useEffect, useState } from 'react'

export default function MyComponent() {
    const [data, setData] = useState([])

    useEffect(() => {
        fetch('http://localhost:3001/api/something')
            .then(r => r.json())
            .then(setData)
    }, [])

    return <div>{/* render data */}</div>
}
```

**POST from React:**
```js
fetch('http://localhost:3001/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context_id: 'abc', context_type: 'youtube', content: 'my note' })
}).then(r => r.json()).then(d => console.log(d.id))
```

---

## .gitignore (required entries)

```
.env
.env.local
node_modules/
db/
dist/
.vite/
```

---

## Run commands

```bash
# Terminal 1 - backend
cd server
node index.js          # http://localhost:3001
# or: node --watch index.js   (auto-restart on save, Node 18+)

# Terminal 2 - frontend
cd client
npm run dev            # http://localhost:5173
```

---

## Static config files

**`static/config.json`**
```json
{
    "weather": [
        { "city": "Noida", "country": "IN", "units": "metric" },
        { "city": "Greater Noida", "country": "IN", "units": "metric" }
    ],
    "news": { "country": "in", "pageSize": 6 }
}
```

**`static/youtube_videos.json`**
```json
[
    { "title": "Video Title", "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
]
```

**`static/web_pages.json`**
```json
[
    { "title": "Page Title", "url": "https://example.com", "description": "optional" }
]
```

---

## Security rules

- Never commit `.env`
- Never use `axios` - use native `fetch` (axios had a supply chain attack)
- `db/` folder is gitignored - your SQLite data never leaves your machine
- MS_CLIENT_ID is optional - only needed if you want OneNote integration

---

## Reminders when starting fresh

- [ ] `cd server && npm install`
- [ ] `cd client && npm create vite@latest . -- --template react && npm install`
- [ ] Copy `.env.example` to `.env` and fill in API keys
- [ ] Edit `static/config.json` with your cities
- [ ] Edit `static/youtube_videos.json` with your videos
- [ ] Edit `static/web_pages.json` with your pages
- [ ] `node index.js` in server terminal
- [ ] `npm run dev` in client terminal
- [ ] Open `http://localhost:5173`
