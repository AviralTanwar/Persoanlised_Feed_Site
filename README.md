# 🚀 Personalised Feed Site — API Explorer Dashboard

A personal dashboard built with **Python + Streamlit** that pulls live data from multiple APIs into one place. Designed for daily use — weather, news, YouTube notes, web page annotations, and a personal improvement tracker, all in one dark-themed interface.

> **Currently:** Streamlit (Python) · **Next:** Migrating to React + FastAPI

---

## 📸 What It Looks Like

| Section | What it does |
|---|---|
| 🌤️ Weather | Live weather for multiple cities (tabs) |
| 📰 National News | Top Indian headlines with like/dislike |
| 💻 Tech News | Hacker News top stories, score-badged |
| 📓 OneNote | Fetch and read your OneNote pages |
| 🎬 YouTube Viewer | Watch videos with a draggable floating notes panel |
| 🌐 Web Page Viewer | Load any page with notes and highlights |
| 💡 Improvements | Personal tracker for things you want to improve |

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Python 3.x + Streamlit |
| Database | SQLite (local) → CockroachDB (production) |
| APIs | OpenWeatherMap, NewsAPI, Hacker News, Microsoft Graph (OneNote) |
| Auth | Microsoft MSAL device-code flow (for OneNote) |

---

## 🗂️ Project Structure

```
API Explorer Dashboard/
├── app.py                        # Main entry point
├── requirements.txt
├── .env.example                  # Copy to .env and fill in keys
│
├── static/                       # Your personal config — edit freely
│   ├── config.json               # Cities, news country
│   ├── youtube_videos.json       # Your YouTube video URLs
│   ├── web_pages.json            # Pages you want to annotate
│   └── onenote_pages.json        # OneNote page IDs
│
├── components/                   # One file per dashboard section
│   ├── weather.py
│   ├── national_news.py
│   ├── tech_news.py
│   ├── onenote.py
│   ├── youtube_viewer.py
│   ├── webpage_viewer.py
│   └── improvements.py
│
└── utils/
    ├── database.py               # SQLite CRUD (interactions, notes, highlights)
    └── api_helpers.py
```

---

## 🚀 Running Locally

### 1. Clone and set up

```bash
git clone https://github.com/AviralTanwar/Persoanlised_Feed_Site.git
cd "Persoanlised_Feed_Site"
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

### 2. Set up API keys

```bash
copy .env.example .env
```

Open `.env` and fill in:

```env
OPENWEATHER_API_KEY=your_key    # openweathermap.org → free signup
NEWS_API_KEY=your_key           # newsapi.org → free signup
MS_CLIENT_ID=                   # optional — only needed for OneNote
MS_TENANT_ID=common
```

### 3. Configure your personal data

Edit the files in `static/` to match your preferences:

**`static/config.json`** — your cities and news country
```json
{
    "weather": [
        { "city": "Noida", "country": "IN", "units": "metric" },
        { "city": "Greater Noida", "country": "IN", "units": "metric" }
    ],
    "news": { "country": "in", "page_size": 6 }
}
```

**`static/youtube_videos.json`** — YouTube videos you want on your dashboard
```json
[
    { "title": "Your Video", "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
]
```

**`static/web_pages.json`** — pages you want to read and annotate
```json
[
    { "title": "Page Title", "url": "https://example.com" }
]
```

### 4. Run

```bash
streamlit run app.py
```

Opens at `http://localhost:8501`

---

## 🗃️ Database

SQLite database is created automatically at `db/dashboard.db` on first run. It stores:

| Table | What it holds |
|---|---|
| `interactions` | Like / dislike on every news article |
| `notes` | Notes linked to YouTube videos or web pages |
| `highlights` | Text highlights on web pages with colour tags |
| `improvement_notes` | Personal improvement tracker with priority and status |

The `db/` folder is gitignored — your data stays local.

---

## 🔑 Getting API Keys (Free)

| API | Where to get it |
|---|---|
| OpenWeatherMap | `openweathermap.org` → Sign up → My API Keys (activates in ~10 min) |
| NewsAPI | `newsapi.org` → Get API Key → verify email |
| Hacker News | No key needed — fully open API |
| OneNote | Azure Portal → App Registration → `Notes.ReadWrite` permission |

---

## ✨ Features

- **Multi-city weather** — add as many cities as you want in `config.json`, each gets its own tab
- **Like / Dislike** on every news story — stored in SQLite
- **Floating draggable notes panel** on YouTube viewer — notes are scoped per video
- **Web page highlights** — copy text from any page, save with colour tags
- **Ctrl+Enter** to save notes anywhere on the dashboard
- **Improvement tracker** — prioritise and track status (Pending / In Progress / Done)
- All user data in `static/` — nothing hardcoded

---

## 🛣️ Roadmap

- [x] Streamlit MVP with all 7 sections
- [x] SQLite for likes, notes, highlights, improvements
- [x] Multi-city weather with tabs
- [ ] **Migrate to React + FastAPI** (in progress)
- [ ] Deploy backend on Railway / Render
- [ ] Deploy frontend on Vercel
- [ ] Switch SQLite → CockroachDB (10 GB free tier)
- [ ] AI self-analysis widget — insights from your interactions and notes

---

## 📝 Notes

- The `db/` folder and `.env` file are gitignored — never committed
- All personal config lives in `static/` — safe to commit, no secrets
- Tech News uses the [Hacker News API](https://github.com/HackerNews/API) — no key, always free
- **Do not use `axios`** for HTTP requests — use the native `fetch` API or another library instead (axios was compromised in a supply chain attack)

---

Made by [Aviral Tanwar](https://github.com/AviralTanwar)
