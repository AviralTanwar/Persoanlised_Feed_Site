const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const db = new Database(path.join(dbDir, 'dashboard.db'));
db.pragma('journal_mode = WAL');

// Migration: rename the old single-source table to the new multi-source name.
// Must run BEFORE the CREATE TABLE IF NOT EXISTS below, otherwise that
// statement creates an empty tbl_news_data first and this rename never fires.
const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
if (tableNames.includes('tbl_national_news') && !tableNames.includes('tbl_news_data')) {
  db.exec('ALTER TABLE tbl_national_news RENAME TO tbl_news_data');
}

// Migration: rename weathers → tbl_weathers_card (naming convention; the api
// source now lives separately in tbl_weathers)
if (tableNames.includes('weathers') && !tableNames.includes('tbl_weathers_card')) {
  db.exec('ALTER TABLE weathers RENAME TO tbl_weathers_card');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_url TEXT NOT NULL,
    reaction TEXT CHECK(reaction IN ('like', 'dislike')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_url TEXT NOT NULL,
    text TEXT NOT NULL,
    colour TEXT DEFAULT 'yellow',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tbl_news_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_api_id INTEGER,
    headline TEXT NOT NULL,
    source TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    link TEXT NOT NULL UNIQUE,
    response INTEGER NOT NULL CHECK(response IN (-1, 0, 1)) DEFAULT 0,
    link_open INTEGER NOT NULL CHECK(link_open IN (0, 1)) DEFAULT 0,
    clicked_on_more INTEGER NOT NULL CHECK(clicked_on_more IN (0, 1)) DEFAULT 0,
    live INTEGER NOT NULL CHECK(live IN (0, 1)) DEFAULT 1,
    news_date DATETIME,
    shown INTEGER NOT NULL CHECK(shown IN (0, 1, 2, 3, 4, 5)) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
  );

  -- Registry of news sources/KPIs. Each live row becomes one panel on the
  -- dashboard, fetched from api_url and tagged into tbl_news_data via news_api_id.
  CREATE TABLE IF NOT EXISTS tbl_news_kpi_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    live INTEGER NOT NULL CHECK(live IN (0, 1)) DEFAULT 1,
    logo TEXT DEFAULT '',
    name TEXT NOT NULL,
    tag TEXT DEFAULT '',
    api_url TEXT NOT NULL,
    api_name TEXT DEFAULT ''
  );

  DROP TABLE IF EXISTS tbl_news_kpi_sources;
  DROP TABLE IF EXISTS news_interactions;
  -- Legacy unused tables (replaced by tbl_notes / tbl_news_data)
  DROP TABLE IF EXISTS notes;
  DROP TABLE IF EXISTS highlights;
  DROP TABLE IF EXISTS interactions;
  DROP TABLE IF EXISTS web_notes;

  -- User profile (single-row personal dashboard)
  -- deleted_at = '0000-00-00 00:00:00' means active (sentinel, not NULL)
  CREATE TABLE IF NOT EXISTS tbl_user_info (
    user_id     INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
    firstname   TEXT     NOT NULL,
    lastname    TEXT     NOT NULL,
    title       TEXT     DEFAULT '',
    description TEXT     DEFAULT '',
    number      TEXT     DEFAULT '',
    email       TEXT     DEFAULT '',
    username    TEXT     DEFAULT '',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TEXT     NOT NULL DEFAULT '0000-00-00 00:00:00',
    active      INTEGER  NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
  );

  -- Stored credentials (password protected to-do unlock)
  CREATE TABLE IF NOT EXISTS tbl_credentials (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
    description TEXT     DEFAULT '',
    user_name   TEXT     DEFAULT '',
    password    TEXT     NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TEXT     NOT NULL DEFAULT '0000-00-00 00:00:00'
  );

  -- Kanban boards
  CREATE TABLE IF NOT EXISTS tbl_to_do_summary (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
    name        TEXT     NOT NULL,
    description TEXT     DEFAULT '',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TEXT     NOT NULL DEFAULT '0000-00-00 00:00:00'
  );

  -- Kanban task cards (status = column)
  CREATE TABLE IF NOT EXISTS tbl_to_do (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
    summary_id  INTEGER  NOT NULL REFERENCES tbl_to_do_summary(id),
    title       TEXT     NOT NULL,
    description TEXT     DEFAULT '',
    status      TEXT     NOT NULL DEFAULT 'pending'
                         CHECK(status IN ('pending','in_progress','done')),
    priority    TEXT     NOT NULL DEFAULT 'medium'
                         CHECK(priority IN ('low','medium','high')),
    due_date    TEXT     DEFAULT NULL,
    position    INTEGER  DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TEXT     NOT NULL DEFAULT '0000-00-00 00:00:00'
  );

  -- Controls which views/sections are visible and in what order.
  -- rank is UNIQUE so no two views can share the same display position.
  CREATE TABLE IF NOT EXISTS tbl_view_kpi (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
    name        TEXT     NOT NULL,
    description TEXT     DEFAULT '',
    rank        INTEGER  NOT NULL UNIQUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TEXT     NOT NULL DEFAULT '0000-00-00 00:00:00'
  );

  -- Unified note entity wrapper: web pages, youtube videos, improvements
  -- entity_id = URL (web/yt) or improvement row id; url populated for web/yt only.
  -- view_id → tbl_view_kpi.id (which dashboard section this entity belongs to).
  CREATE TABLE IF NOT EXISTS tbl_notes (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
    entity_type TEXT     NOT NULL CHECK(entity_type IN ('web_page','youtube','improvement')),
    entity_id   TEXT     NOT NULL,
    view_id     INTEGER  NOT NULL REFERENCES tbl_view_kpi(id),
    title       TEXT     DEFAULT '',
    description TEXT     DEFAULT '',
    url         TEXT     DEFAULT '',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TEXT     NOT NULL DEFAULT '0000-00-00 00:00:00'
  );

  -- Actual note content entries (up to 5 per entity in UI for now)
  CREATE TABLE IF NOT EXISTS tbl_notes_data (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
    entity_id   INTEGER  NOT NULL REFERENCES tbl_notes(id),
    title       TEXT     DEFAULT '',
    content     TEXT     NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TEXT     NOT NULL DEFAULT '0000-00-00 00:00:00'
  );

  -- Weather city cards shown on the dashboard (renamed from "weathers")
  CREATE TABLE IF NOT EXISTS tbl_weathers_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'IN',
    units TEXT NOT NULL DEFAULT 'metric',
    permanent INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
  );

  -- Weather API source(s) — each active row is an upstream weather.js proxies.
  CREATE TABLE IF NOT EXISTS tbl_weathers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name       TEXT    NOT NULL,
    api        TEXT    NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT    NOT NULL DEFAULT '0000-00-00 00:00:00'
  );

  -- Personal notes pages (markdown-based scratchpad, replaces static onenote_pages.json)
  CREATE TABLE IF NOT EXISTS tbl_onenote_pages (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
    notebook_name TEXT   NOT NULL DEFAULT 'Dev Notes',
    title       TEXT     NOT NULL,
    body        TEXT     DEFAULT '',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TEXT     NOT NULL DEFAULT '0000-00-00 00:00:00'
  );
`);

// Migration: rename improvement_notes → tbl_improvements (naming convention),
// or drop it outright if tbl_improvements already exists — it was a dead
// table recreated + reseeded on every startup with no route ever reading it.
const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
if (allTables.includes('improvement_notes')) {
  if (!allTables.includes('tbl_improvements')) {
    db.exec('ALTER TABLE improvement_notes RENAME TO tbl_improvements');
  } else {
    db.exec('DROP TABLE improvement_notes');
  }
}
// Create tbl_improvements if it doesn't exist at all (fresh install)
db.exec(`CREATE TABLE IF NOT EXISTS tbl_improvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  detail TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  priority TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('pending','in_progress','hold','done')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Migration: add is_kpi flag to tbl_improvements
{
  const impCols = db.prepare('PRAGMA table_info(tbl_improvements)').all().map(c => c.name);
  if (!impCols.includes('is_kpi')) {
    db.exec(`ALTER TABLE tbl_improvements ADD COLUMN is_kpi INTEGER NOT NULL DEFAULT 0 CHECK(is_kpi IN (0, 1))`);
  }
}

// Migration: add remark column (a note shown directly on the improvement card)
{
  const impCols = db.prepare('PRAGMA table_info(tbl_improvements)').all().map(c => c.name);
  if (!impCols.includes('remark')) {
    db.exec(`ALTER TABLE tbl_improvements ADD COLUMN remark TEXT DEFAULT ''`);
  }
}

// Migration: widen the status CHECK to allow 'hold'. SQLite can't ALTER a CHECK
// constraint, so rebuild the table only if the current definition lacks 'hold'.
{
  const impSql = db.prepare("SELECT sql FROM sqlite_master WHERE name='tbl_improvements'").get().sql;
  if (!impSql.includes("'hold'")) {
    const rebuild = db.transaction(() => {
      db.exec(`CREATE TABLE tbl_improvements_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        detail TEXT DEFAULT '',
        remark TEXT DEFAULT '',
        priority TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
        status TEXT CHECK(status IN ('pending','in_progress','hold','done')) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_kpi INTEGER NOT NULL DEFAULT 0 CHECK(is_kpi IN (0, 1))
      )`);
      db.exec(`INSERT INTO tbl_improvements_new (id, title, detail, remark, priority, status, created_at, is_kpi)
               SELECT id, title, detail, COALESCE(remark,''), priority, status, created_at, is_kpi FROM tbl_improvements`);
      db.exec('DROP TABLE tbl_improvements');
      db.exec('ALTER TABLE tbl_improvements_new RENAME TO tbl_improvements');
    });
    rebuild();
  }
}

// Migration: add section_key column so each row knows which dashboard component it drives
const viewCols = db.prepare('PRAGMA table_info(tbl_view_kpi)').all().map(c => c.name);
if (!viewCols.includes('section_key')) {
  db.exec(`ALTER TABLE tbl_view_kpi ADD COLUMN section_key TEXT NOT NULL DEFAULT ''`);
  // Stamp existing rows and slide their ranks to 6-8 to make room for the new sections above them
  db.prepare("UPDATE tbl_view_kpi SET section_key='web_pages',    rank=6 WHERE id=1").run();
  db.prepare("UPDATE tbl_view_kpi SET section_key='youtube',      rank=7 WHERE id=2").run();
  db.prepare("UPDATE tbl_view_kpi SET section_key='improvements', rank=8 WHERE id=3").run();
}

// Seed tbl_view_kpi - all dashboard sections, idempotent by section_key
const existingKeys = new Set(
  db.prepare("SELECT section_key FROM tbl_view_kpi WHERE section_key != ''")
    .all().map(r => r.section_key)
);
const viewSeeds = [
  { name: 'Year Progress', description: 'Days-left counter and year progress ring',  rank: 1, section_key: 'year_kpi'      },
  { name: 'Time & Quotes', description: 'Live clock and motivational quotes',         rank: 2, section_key: 'hero_band'     },
  { name: 'Weather',       description: 'Live weather for saved cities',              rank: 3, section_key: 'weather'       },
  { name: 'News',          description: 'National and tech news feed',                rank: 4, section_key: 'news'          },
  { name: 'To-Do',         description: 'Kanban task board',                          rank: 5, section_key: 'todo'          },
  { name: 'Web Pages',     description: 'Web page viewer with notes',                 rank: 6, section_key: 'web_pages'    },
  { name: 'YouTube',       description: 'YouTube video viewer with notes',            rank: 7, section_key: 'youtube'      },
  { name: 'Improvements',  description: 'Goal and improvement tracker',               rank: 8, section_key: 'improvements' },
  { name: 'OneNote',       description: 'Quick notes scratchpad',                     rank: 9, section_key: 'onenote'      },
];
{
  const insertView = db.prepare(
    'INSERT INTO tbl_view_kpi (name, description, rank, section_key) VALUES (@name, @description, @rank, @section_key)'
  );
  for (const seed of viewSeeds) {
    if (!existingKeys.has(seed.section_key)) insertView.run(seed);
  }
}

// Migrations: add columns if upgrading from an older tbl_news_data
const newsCols = db.prepare('PRAGMA table_info(tbl_news_data)').all().map(c => c.name);
if (!newsCols.includes('clicked_on_more')) {
  db.exec(`ALTER TABLE tbl_news_data ADD COLUMN clicked_on_more INTEGER NOT NULL DEFAULT 0 CHECK(clicked_on_more IN (0, 1))`);
}
if (!newsCols.includes('live')) {
  // 1 = currently rendered on the dashboard right now, 0 = was shown before but isn't on screen anymore
  db.exec(`ALTER TABLE tbl_news_data ADD COLUMN live INTEGER NOT NULL DEFAULT 1 CHECK(live IN (0, 1))`);
}
if (!newsCols.includes('news_date')) {
  // The article's actual publish date (from the feed), distinct from created_at (when we stored the row)
  db.exec(`ALTER TABLE tbl_news_data ADD COLUMN news_date DATETIME`);
}
if (!newsCols.includes('shown')) {
  // Most recent interaction: 0 displayed/no interaction, 1 link opened, 2 more clicked, 3 liked, 4 disliked, 5 removed/skipped
  db.exec(`ALTER TABLE tbl_news_data ADD COLUMN shown INTEGER NOT NULL DEFAULT 0 CHECK(shown IN (0, 1, 2, 3, 4, 5))`);
}
if (!newsCols.includes('news_api_id')) {
  db.exec(`ALTER TABLE tbl_news_data ADD COLUMN news_api_id INTEGER`);
}

// Migration: add remark column to tbl_to_do if upgrading from earlier schema
const todoCols = db.prepare('PRAGMA table_info(tbl_to_do)').all().map(c => c.name);
if (!todoCols.includes('remark')) {
  db.exec(`ALTER TABLE tbl_to_do ADD COLUMN remark TEXT DEFAULT ''`);
}

// Migration: add description column to tbl_notes_data (notes now have title + description + content)
const notesDataCols = db.prepare('PRAGMA table_info(tbl_notes_data)').all().map(c => c.name);
if (!notesDataCols.includes('description')) {
  db.exec(`ALTER TABLE tbl_notes_data ADD COLUMN description TEXT DEFAULT ''`);
}

// Seed news KPIs on first run - National + Tech, both via Google News RSS (no key, no quota)
const { n: kpiCount } = db.prepare('SELECT COUNT(*) as n FROM tbl_news_kpi_data').get();
if (kpiCount === 0) {
  const insertKpi = db.prepare(`
    INSERT INTO tbl_news_kpi_data (logo, name, tag, api_url, api_name, live)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertKpi.run(
    '📰', 'National News', 'India',
    'https://news.google.com/rss/headlines/section/geo/India?hl=en-IN&gl=IN&ceid=IN:en',
    'Google News RSS'
  );
  insertKpi.run(
    '💻', 'Tech News', 'Technology',
    'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en',
    'Google News RSS'
  );
}



// Migration: add updated_at to tbl_weathers_card if upgrading from the old "weathers" schema
{
  const cardCols = db.prepare('PRAGMA table_info(tbl_weathers_card)').all().map(c => c.name);
  if (!cardCols.includes('updated_at')) {
    db.exec(`ALTER TABLE tbl_weathers_card ADD COLUMN updated_at DATETIME`);
    db.exec(`UPDATE tbl_weathers_card SET updated_at = created_at`);
  }
}

// Seed permanent cities on first run - these used to live in static/config.json
const { n: weatherCount } = db.prepare('SELECT COUNT(*) as n FROM tbl_weathers_card').get();
if (weatherCount === 0) {
  const insertCity = db.prepare(
    'INSERT INTO tbl_weathers_card (city, country, units, permanent) VALUES (?, ?, ?, 1)'
  );
  insertCity.run('Noida', 'IN', 'metric');
  insertCity.run('Greater Noida', 'IN', 'metric');
}

// Seed the weather API source on first run
const { n: weatherApiCount } = db.prepare("SELECT COUNT(*) as n FROM tbl_weathers WHERE deleted_at='0000-00-00 00:00:00'").get();
if (weatherApiCount === 0) {
  db.prepare('INSERT INTO tbl_weathers (name, api) VALUES (?, ?)')
    .run('OpenWeatherMap', 'https://api.openweathermap.org/data/2.5/weather');
}


// Seed user profile on first run
const { n: userCount } = db.prepare('SELECT COUNT(*) as n FROM tbl_user_info').get();
if (userCount === 0) {
  db.prepare('INSERT INTO tbl_user_info (firstname, lastname, username) VALUES (?, ?, ?)')
    .run('Aviral', 'Tanwar', 'Aviral_Tanwar');
}

// Seed to-do unlock password (bcrypt-hashed, seeded once)
const { n: credCount } = db.prepare('SELECT COUNT(*) as n FROM tbl_credentials').get();
if (credCount === 0) {
  const hash = bcrypt.hashSync('TanWar@951753', 12);
  db.prepare(
    "INSERT INTO tbl_credentials (description, password) VALUES ('todo', ?)"
  ).run(hash);
}

// Migration: add location + timezone to tbl_user_info
const userCols = db.prepare('PRAGMA table_info(tbl_user_info)').all().map(c => c.name);
if (!userCols.includes('location')) {
  db.exec(`ALTER TABLE tbl_user_info ADD COLUMN location TEXT DEFAULT 'Noida, India'`);
}
if (!userCols.includes('timezone')) {
  db.exec(`ALTER TABLE tbl_user_info ADD COLUMN timezone TEXT DEFAULT 'IST (UTC+5:30)'`);
}
if (!userCols.includes('salutation')) {
  db.exec(`ALTER TABLE tbl_user_info ADD COLUMN salutation TEXT DEFAULT 'Mr'`);
  db.prepare("UPDATE tbl_user_info SET salutation = 'Mr'").run();
}
if (!userCols.includes('tz_sign')) {
  db.exec(`ALTER TABLE tbl_user_info ADD COLUMN tz_sign TEXT DEFAULT '+'`);
  db.prepare("UPDATE tbl_user_info SET tz_sign = '+'").run();
}
if (!userCols.includes('tz_offset')) {
  db.exec(`ALTER TABLE tbl_user_info ADD COLUMN tz_offset TEXT DEFAULT '5:30'`);
  db.prepare("UPDATE tbl_user_info SET tz_offset = '5:30'").run();
}

// Seed onenote pages (migrate from static/onenote_pages.json, idempotent)
const { n: onCount } = db.prepare("SELECT COUNT(*) as n FROM tbl_onenote_pages WHERE deleted_at='0000-00-00 00:00:00'").get();
if (onCount === 0) {
  const insertOn = db.prepare('INSERT INTO tbl_onenote_pages (notebook_name, title, body) VALUES (?,?,?)');
  insertOn.run('Dev Notes', 'FastAPI Architecture Notes',
    '## FastAPI Architecture\n\n### Key Concepts\n- Async by default with Python asyncio\n- **Pydantic** models for request/response validation\n- Dependency injection via `Depends()`\n- OpenAPI docs auto-generated at `/docs`\n\n### Recommended Structure\n```\napp/\n├── main.py\n├── routers/\n├── models/\n└── dependencies.py\n```\n\n### Useful Patterns\n- Use `APIRouter` to split routes by feature\n- Background tasks via `BackgroundTasks`\n- Lifespan events replace deprecated `on_startup`');
  insertOn.run('Dev Notes', 'React 19 - Key Changes',
    '## React 19 Changes\n\n- **Server Actions** are now stable\n- `use()` hook for Promises and Context\n- New compiler (React Forget) auto-memoises components\n- `<form action={serverFn}>` native support\n- Improved Suspense boundaries + streaming\n\n### Migration Notes\n- `ReactDOM.render` fully removed - use `createRoot`\n- `useFormState` → `useActionState`\n- Ref as prop (no forwardRef needed)\n- Improved error messages in dev mode');
  insertOn.run('Interview Prep', 'System Design: URL Shortener',
    '## URL Shortener Design\n\n### Scale Requirements\n- 100M new URLs / day (write)\n- 10B redirects / day (100:1 read ratio)\n\n### Key Decisions\n- **Base62** encoding → 7-char IDs (~3.5 trillion combos)\n- **Cassandra** for persistence (high write throughput)\n- **Redis** hot cache with TTL for popular URLs\n- **CDN** edge nodes for static redirect rules\n\n### Flow\n- Write: hash URL → check collision → store → return short code\n- Read: lookup cache → fallback to DB → 301 redirect');
  insertOn.run('Personal', 'Books Reading List 2026',
    '## 2026 Reading List\n\n✅ The Pragmatic Programmer\n✅ Clean Code - R.C. Martin\n✅ The Phoenix Project\n📖 Designing Data-Intensive Applications (ch.7 / 12)\n⏳ Staff Engineer - Will Larson\n⏳ A Philosophy of Software Design\n\n### Notes\n- DDIA chapter 7 covers transactions and isolation levels\n- Read chapter 9 before starting distributed systems work\n- Staff Engineer is short - can finish in a weekend');
}

// Multi-feed table: multiple RSS sources per news KPI
db.exec(`CREATE TABLE IF NOT EXISTS tbl_news_feeds (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  news_kpi_id INTEGER NOT NULL REFERENCES tbl_news_kpi_data(id),
  url         TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  live        INTEGER NOT NULL DEFAULT 1 CHECK(live IN (0, 1)),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Seed Indian national news feeds (idempotent per KPI)
const { n: natFeedCount } = db.prepare('SELECT COUNT(*) as n FROM tbl_news_feeds WHERE news_kpi_id = 1').get();
if (natFeedCount === 0) {
  const insF = db.prepare('INSERT INTO tbl_news_feeds (news_kpi_id, url, name) VALUES (?, ?, ?)');
  insF.run(1, 'https://feeds.feedburner.com/ndtvnews-india-news',              'NDTV');
  insF.run(1, 'https://www.thehindu.com/news/national/feeder/default.rss',     'The Hindu');
  insF.run(1, 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',    'Times of India');
  insF.run(1, 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml','Hindustan Times');
  insF.run(1, 'https://www.indiatoday.in/rss/1206550',                         'India Today');
}

// Seed tech news feeds (idempotent per KPI)
const { n: techFeedCount } = db.prepare('SELECT COUNT(*) as n FROM tbl_news_feeds WHERE news_kpi_id = 2').get();
if (techFeedCount === 0) {
  const insT = db.prepare('INSERT INTO tbl_news_feeds (news_kpi_id, url, name) VALUES (?, ?, ?)');
  insT.run(2, 'https://techcrunch.com/feed/',                                'TechCrunch');
  insT.run(2, 'https://www.theverge.com/rss/index.xml',                     'The Verge');
  insT.run(2, 'https://feeds.arstechnica.com/arstechnica/technology-lab',   'Ars Technica');
  insT.run(2, 'https://www.wired.com/feed/rss',                             'Wired');
}

// Migration: fix articles stored with source='Unknown' before kpiName was wired
db.prepare(`UPDATE tbl_news_data SET source='TechCrunch' WHERE news_api_id=2 AND source='Unknown'`).run();
db.prepare(`UPDATE tbl_news_data SET source='NDTV'       WHERE news_api_id=1 AND source='Unknown'`).run();

// Migration: move onenote above improvements (swap ranks so onenote appears first)
{
  const on = db.prepare("SELECT id, rank FROM tbl_view_kpi WHERE section_key='onenote'").get();
  const im = db.prepare("SELECT id, rank FROM tbl_view_kpi WHERE section_key='improvements'").get();
  if (on && im && on.rank > im.rank) {
    db.prepare('UPDATE tbl_view_kpi SET rank=99 WHERE id=?').run(on.id);
    db.prepare('UPDATE tbl_view_kpi SET rank=? WHERE id=?').run(on.rank, im.id);
    db.prepare('UPDATE tbl_view_kpi SET rank=? WHERE id=?').run(im.rank, on.id);
  }
}

// Seed YouTube videos into tbl_notes (migrate from static/youtube_videos.json, idempotent per URL)
{
  const ytView = db.prepare("SELECT id FROM tbl_view_kpi WHERE section_key='youtube' AND deleted_at='0000-00-00 00:00:00'").get();
  if (ytView) {
    const ytSeeds = [
      { title: 'React in 100 Seconds',   url: 'https://www.youtube.com/embed/Tn6-PIqc4UM', channel: 'Fireship' },
      { title: 'Python in 100 Seconds',  url: 'https://www.youtube.com/embed/x7X9w_GIm1s', channel: 'Fireship' },
      { title: 'FastAPI in 100 Seconds', url: 'https://www.youtube.com/embed/iWS9ogMPOI0', channel: 'Fireship' },
    ];
    const insertYt = db.prepare(
      "INSERT INTO tbl_notes (entity_type, entity_id, view_id, title, description, url) VALUES ('youtube',?,?,?,?,?)"
    );
    for (const v of ytSeeds) {
      const exists = db.prepare(
        "SELECT id FROM tbl_notes WHERE entity_type='youtube' AND entity_id=? AND deleted_at='0000-00-00 00:00:00'"
      ).get(v.url);
      if (!exists) insertYt.run(v.url, ytView.id, v.title, v.channel, v.url);
    }
  }
}

// Migration: shift Personal Feed Dashboard (tbl_to_do_summary id=7) tasks → tbl_improvements
// Only runs once — guarded by tbl_improvements being empty AND board tasks existing
{
  const impCount = db.prepare('SELECT COUNT(*) as n FROM tbl_improvements').get().n;
  if (impCount === 0) {
    const pfbBoard = db.prepare("SELECT id FROM tbl_to_do_summary WHERE id=7 AND deleted_at='0000-00-00 00:00:00'").get();
    if (pfbBoard) {
      const pfbTasks = db.prepare(
        "SELECT * FROM tbl_to_do WHERE summary_id=7 AND deleted_at='0000-00-00 00:00:00'"
      ).all();
      if (pfbTasks.length > 0) {
        const insertImp = db.prepare(
          'INSERT INTO tbl_improvements (title, detail, priority, status, is_kpi) VALUES (?, ?, ?, ?, 0)'
        );
        for (const t of pfbTasks) {
          insertImp.run(t.title, t.description || '', t.priority || 'medium', t.status || 'pending');
        }
        db.prepare("UPDATE tbl_to_do_summary SET deleted_at=datetime('now') WHERE id=7").run();
      }
    }
  }
}

// Quotes sources — each active row is an API the server proxies.
// type: 'motivational' | 'developer' — matches the two panels in QuoteBanner.
// view_id links back to the hero_band row in tbl_view_kpi.
db.exec(`CREATE TABLE IF NOT EXISTS tbl_quotes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  view_id    INTEGER NOT NULL REFERENCES tbl_view_kpi(id),
  type       TEXT    NOT NULL DEFAULT 'motivational',
  title      TEXT    NOT NULL,
  logo       TEXT    NOT NULL DEFAULT '💬',
  color      TEXT    NOT NULL DEFAULT 'accent',
  api        TEXT    NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT    NOT NULL DEFAULT '0000-00-00 00:00:00'
)`);

// Migration: add type/logo/color columns if table already existed without them
{
  const qtCols = db.prepare('PRAGMA table_info(tbl_quotes)').all().map(c => c.name);
  if (!qtCols.includes('type')) {
    db.exec(`ALTER TABLE tbl_quotes ADD COLUMN type TEXT NOT NULL DEFAULT 'motivational'`);
  }
  if (!qtCols.includes('logo')) {
    db.exec(`ALTER TABLE tbl_quotes ADD COLUMN logo TEXT NOT NULL DEFAULT '💬'`);
  }
  if (!qtCols.includes('color')) {
    db.exec(`ALTER TABLE tbl_quotes ADD COLUMN color TEXT NOT NULL DEFAULT 'accent'`);
  }
}

// Seed both quote types (idempotent per type) — title, logo, color and api
// are ALL sourced from this table; QuoteBanner has no hardcoded per-type styling.
{
  const heroView = db.prepare("SELECT id FROM tbl_view_kpi WHERE section_key='hero_band' AND deleted_at='0000-00-00 00:00:00'").get();
  if (heroView) {
    const hasMotivational = db.prepare("SELECT id FROM tbl_quotes WHERE type='motivational' AND deleted_at='0000-00-00 00:00:00'").get();
    if (!hasMotivational) {
      db.prepare("INSERT INTO tbl_quotes (view_id, type, title, logo, color, api) VALUES (?, ?, ?, ?, ?, ?)")
        .run(heroView.id, 'motivational', 'Motivational Spark', '✦', 'accent2', 'https://motivational-spark-api.vercel.app/api/quotes/random');
    } else {
      // Backfill logo/color on rows created before those columns existed
      db.prepare("UPDATE tbl_quotes SET logo='✦', color='accent2', updated_at=CURRENT_TIMESTAMP WHERE type='motivational' AND deleted_at='0000-00-00 00:00:00' AND (logo='💬' OR color='accent')")
        .run();
    }
    const hasDeveloper = db.prepare("SELECT id FROM tbl_quotes WHERE type='developer' AND deleted_at='0000-00-00 00:00:00'").get();
    if (!hasDeveloper) {
      db.prepare("INSERT INTO tbl_quotes (view_id, type, title, logo, color, api) VALUES (?, ?, ?, ?, ?, ?)")
        .run(heroView.id, 'developer', 'Developer Excuse', '⚡', 'accent', 'http://developerexcuses.com/');
    } else {
      // Swap any pre-existing row off the old JokeAPI URL onto developerexcuses.com,
      // and backfill logo/color on rows created before those columns existed
      db.prepare("UPDATE tbl_quotes SET api=?, updated_at=CURRENT_TIMESTAMP WHERE type='developer' AND deleted_at='0000-00-00 00:00:00' AND api != ?")
        .run('http://developerexcuses.com/', 'http://developerexcuses.com/');
      db.prepare("UPDATE tbl_quotes SET logo='⚡', color='accent', updated_at=CURRENT_TIMESTAMP WHERE type='developer' AND deleted_at='0000-00-00 00:00:00' AND logo='💬'")
        .run();
    }
  }
}

// Uploaded files (PDFs) attached to a web page. The bytes live in the `data`
// BLOB column; note_id links to the tbl_notes web_page row it belongs to.
db.exec(`CREATE TABLE IF NOT EXISTS tbl_web_pge_downloads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  note_id    INTEGER REFERENCES tbl_notes(id),
  filename   TEXT    NOT NULL,
  mime_type  TEXT    NOT NULL DEFAULT 'application/pdf',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  data       BLOB    NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT    NOT NULL DEFAULT '0000-00-00 00:00:00'
)`);

module.exports = db;
