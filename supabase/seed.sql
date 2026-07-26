-- ============================================================================
-- API Explorer Dashboard — seed data
-- Run this AFTER schema.sql, in the Supabase SQL editor.
-- Every insert is idempotent (guarded by NOT EXISTS), so re-running is safe.
--
-- This seeds ONLY the baseline config the app needs to boot (news sources,
-- feeds, permanent weather cities, the weather API row, dashboard sections,
-- the two quote sources, one user profile, the to-do unlock credential, and
-- the four starter OneNote pages).
--
-- It does NOT migrate your existing local DATA — your saved improvements,
-- to-do boards/tasks, custom weather cities, web-page notes, uploaded PDFs,
-- and news history stay in the local SQLite file. Move those by hand later if
-- you want them in production.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- for bcrypt crypt() on the credential

-- ── News KPIs ──────────────────────────────────────────────────────────────
INSERT INTO tbl_news_kpi_data (logo, name, tag, api_url, api_name)
SELECT '📰', 'National News', 'India',
       'https://news.google.com/rss/headlines/section/geo/India?hl=en-IN&gl=IN&ceid=IN:en',
       'Google News RSS'
WHERE NOT EXISTS (SELECT 1 FROM tbl_news_kpi_data WHERE name = 'National News');

INSERT INTO tbl_news_kpi_data (logo, name, tag, api_url, api_name)
SELECT '💻', 'Tech News', 'Technology',
       'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en',
       'Google News RSS'
WHERE NOT EXISTS (SELECT 1 FROM tbl_news_kpi_data WHERE name = 'Tech News');

-- ── News feeds (referenced by KPI name) ────────────────────────────────────
INSERT INTO tbl_news_feeds (news_kpi_id, url, name)
SELECT k.id, v.url, v.name
FROM (VALUES
  ('https://feeds.feedburner.com/ndtvnews-india-news',               'NDTV'),
  ('https://www.thehindu.com/news/national/feeder/default.rss',      'The Hindu'),
  ('https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',     'Times of India'),
  ('https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml','Hindustan Times'),
  ('https://www.indiatoday.in/rss/1206550',                          'India Today')
) AS v(url, name)
CROSS JOIN (SELECT id FROM tbl_news_kpi_data WHERE name = 'National News') k
WHERE NOT EXISTS (SELECT 1 FROM tbl_news_feeds f WHERE f.url = v.url);

INSERT INTO tbl_news_feeds (news_kpi_id, url, name)
SELECT k.id, v.url, v.name
FROM (VALUES
  ('https://techcrunch.com/feed/',                              'TechCrunch'),
  ('https://www.theverge.com/rss/index.xml',                    'The Verge'),
  ('https://feeds.arstechnica.com/arstechnica/technology-lab',  'Ars Technica'),
  ('https://www.wired.com/feed/rss',                            'Wired')
) AS v(url, name)
CROSS JOIN (SELECT id FROM tbl_news_kpi_data WHERE name = 'Tech News') k
WHERE NOT EXISTS (SELECT 1 FROM tbl_news_feeds f WHERE f.url = v.url);

-- ── Weather: permanent cities + the API source ─────────────────────────────
INSERT INTO tbl_weathers_card (city, country, units, permanent)
SELECT 'Noida', 'IN', 'metric', 1
WHERE NOT EXISTS (SELECT 1 FROM tbl_weathers_card WHERE city = 'Noida');

INSERT INTO tbl_weathers_card (city, country, units, permanent)
SELECT 'Greater Noida', 'IN', 'metric', 1
WHERE NOT EXISTS (SELECT 1 FROM tbl_weathers_card WHERE city = 'Greater Noida');

INSERT INTO tbl_weathers (name, api)
SELECT 'OpenWeatherMap', 'https://api.openweathermap.org/data/2.5/weather'
WHERE NOT EXISTS (SELECT 1 FROM tbl_weathers WHERE deleted_at = '0000-00-00 00:00:00');

-- ── Dashboard sections (order matches the client's DEFAULT_VIEW_KPIS) ───────
INSERT INTO tbl_view_kpi (name, description, rank, section_key)
SELECT v.name, v.description, v.rank, v.section_key
FROM (VALUES
  ('Year Progress', 'Days-left counter and year progress ring', 1, 'year_kpi'),
  ('Time & Quotes', 'Live clock and motivational quotes',       2, 'hero_band'),
  ('Weather',       'Live weather for saved cities',            3, 'weather'),
  ('News',          'National and tech news feed',              4, 'news'),
  ('To-Do',         'Kanban task board',                        5, 'todo'),
  ('Web Pages',     'Web page viewer with notes',               6, 'web_pages'),
  ('YouTube',       'YouTube video viewer with notes',          7, 'youtube'),
  ('OneNote',       'Quick notes scratchpad',                   8, 'onenote'),
  ('Improvements',  'Goal and improvement tracker',             9, 'improvements')
) AS v(name, description, rank, section_key)
WHERE NOT EXISTS (SELECT 1 FROM tbl_view_kpi t WHERE t.section_key = v.section_key);

-- ── Quote sources (referenced by the hero_band section) ────────────────────
INSERT INTO tbl_quotes (view_id, type, title, logo, color, api)
SELECT vk.id, 'motivational', 'Motivational Spark', '✦', 'accent2',
       'https://motivational-spark-api.vercel.app/api/quotes/random'
FROM (SELECT id FROM tbl_view_kpi WHERE section_key = 'hero_band') vk
WHERE NOT EXISTS (SELECT 1 FROM tbl_quotes WHERE type = 'motivational' AND deleted_at = '0000-00-00 00:00:00');

INSERT INTO tbl_quotes (view_id, type, title, logo, color, api)
SELECT vk.id, 'developer', 'Developer Excuse', '⚡', 'accent',
       'http://developerexcuses.com/'
FROM (SELECT id FROM tbl_view_kpi WHERE section_key = 'hero_band') vk
WHERE NOT EXISTS (SELECT 1 FROM tbl_quotes WHERE type = 'developer' AND deleted_at = '0000-00-00 00:00:00');

-- ── User profile ───────────────────────────────────────────────────────────
INSERT INTO tbl_user_info (firstname, lastname, username)
SELECT 'Aviral', 'Tanwar', 'Aviral_Tanwar'
WHERE NOT EXISTS (SELECT 1 FROM tbl_user_info);

-- ── To-do unlock credential (bcrypt, same password as local: TanWar@951753) ─
-- CHANGE THIS if you don't want the known password in production.
INSERT INTO tbl_credentials (description, password)
SELECT 'todo', crypt('TanWar@951753', gen_salt('bf', 12))
WHERE NOT EXISTS (SELECT 1 FROM tbl_credentials WHERE description = 'todo');

-- ── OneNote starter pages ──────────────────────────────────────────────────
INSERT INTO tbl_onenote_pages (notebook_name, title, body)
SELECT 'Dev Notes', 'FastAPI Architecture Notes', $body$## FastAPI Architecture

### Key Concepts
- Async by default with Python asyncio
- **Pydantic** models for request/response validation
- Dependency injection via `Depends()`
- OpenAPI docs auto-generated at `/docs`

### Recommended Structure
```
app/
├── main.py
├── routers/
├── models/
└── dependencies.py
```

### Useful Patterns
- Use `APIRouter` to split routes by feature
- Background tasks via `BackgroundTasks`
- Lifespan events replace deprecated `on_startup`$body$
WHERE NOT EXISTS (SELECT 1 FROM tbl_onenote_pages WHERE title = 'FastAPI Architecture Notes');

INSERT INTO tbl_onenote_pages (notebook_name, title, body)
SELECT 'Dev Notes', 'React 19 - Key Changes', $body$## React 19 Changes

- **Server Actions** are now stable
- `use()` hook for Promises and Context
- New compiler (React Forget) auto-memoises components
- `<form action={serverFn}>` native support
- Improved Suspense boundaries + streaming

### Migration Notes
- `ReactDOM.render` fully removed - use `createRoot`
- `useFormState` → `useActionState`
- Ref as prop (no forwardRef needed)
- Improved error messages in dev mode$body$
WHERE NOT EXISTS (SELECT 1 FROM tbl_onenote_pages WHERE title = 'React 19 - Key Changes');

INSERT INTO tbl_onenote_pages (notebook_name, title, body)
SELECT 'Interview Prep', 'System Design: URL Shortener', $body$## URL Shortener Design

### Scale Requirements
- 100M new URLs / day (write)
- 10B redirects / day (100:1 read ratio)

### Key Decisions
- **Base62** encoding → 7-char IDs (~3.5 trillion combos)
- **Cassandra** for persistence (high write throughput)
- **Redis** hot cache with TTL for popular URLs
- **CDN** edge nodes for static redirect rules

### Flow
- Write: hash URL → check collision → store → return short code
- Read: lookup cache → fallback to DB → 301 redirect$body$
WHERE NOT EXISTS (SELECT 1 FROM tbl_onenote_pages WHERE title = 'System Design: URL Shortener');

INSERT INTO tbl_onenote_pages (notebook_name, title, body)
SELECT 'Personal', 'Books Reading List 2026', $body$## 2026 Reading List

✅ The Pragmatic Programmer
✅ Clean Code - R.C. Martin
✅ The Phoenix Project
📖 Designing Data-Intensive Applications (ch.7 / 12)
⏳ Staff Engineer - Will Larson
⏳ A Philosophy of Software Design

### Notes
- DDIA chapter 7 covers transactions and isolation levels
- Read chapter 9 before starting distributed systems work
- Staff Engineer is short - can finish in a weekend$body$
WHERE NOT EXISTS (SELECT 1 FROM tbl_onenote_pages WHERE title = 'Books Reading List 2026');
