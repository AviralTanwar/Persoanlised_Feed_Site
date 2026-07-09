const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const db = new Database(path.join(dbDir, 'dashboard.db'));

// Migration: rename the old single-source table to the new multi-source name.
// Must run BEFORE the CREATE TABLE IF NOT EXISTS below, otherwise that
// statement creates an empty tbl_news_data first and this rename never fires.
const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
if (tableNames.includes('tbl_national_news') && !tableNames.includes('tbl_news_data')) {
  db.exec('ALTER TABLE tbl_national_news RENAME TO tbl_news_data');
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

  CREATE TABLE IF NOT EXISTS improvement_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    detail TEXT DEFAULT '',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status TEXT CHECK(status IN ('pending', 'in_progress', 'done')) DEFAULT 'pending',
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

  CREATE TABLE IF NOT EXISTS weathers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'IN',
    units TEXT NOT NULL DEFAULT 'metric',
    permanent INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
  );
`);

// Migration: rename improvement_notes → tbl_improvements (naming convention)
const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
if (allTables.includes('improvement_notes') && !allTables.includes('tbl_improvements')) {
  db.exec('ALTER TABLE improvement_notes RENAME TO tbl_improvements');
}
// Create tbl_improvements if it doesn't exist at all (fresh install)
db.exec(`CREATE TABLE IF NOT EXISTS tbl_improvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  detail TEXT DEFAULT '',
  priority TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('pending','in_progress','done')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Seed tbl_view_kpi (each section that uses tbl_notes gets a view row)
const { n: viewCount } = db.prepare('SELECT COUNT(*) as n FROM tbl_view_kpi').get();
if (viewCount === 0) {
  const insertView = db.prepare('INSERT INTO tbl_view_kpi (name, description, rank) VALUES (?, ?, ?)');
  insertView.run('Web Pages',    'Web page viewer with notes', 1);
  insertView.run('YouTube',      'YouTube video viewer with notes', 2);
  insertView.run('Improvements', 'Goal and improvement tracker', 3);
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

// Seed news KPIs on first run — National + Tech, both via Google News RSS (no key, no quota)
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



// Seed permanent cities on first run — these used to live in static/config.json
const { n: weatherCount } = db.prepare('SELECT COUNT(*) as n FROM weathers').get();
if (weatherCount === 0) {
  const insertCity = db.prepare(
    'INSERT INTO weathers (city, country, units, permanent) VALUES (?, ?, ?, 1)'
  );
  insertCity.run('Noida', 'IN', 'metric');
  insertCity.run('Greater Noida', 'IN', 'metric');
}

// Seed improvements on first run
const { n } = db.prepare('SELECT COUNT(*) as n FROM improvement_notes').get();
if (n === 0) {
  const insert = db.prepare(
    'INSERT INTO improvement_notes (title, detail, priority, status) VALUES (?, ?, ?, ?)'
  );
  const seeds = [
    ['Master React Server Components', 'RSC patterns, Suspense, streaming SSR. React 19 RFC + Next.js 15 docs.', 'high', 'in_progress'],
    ['Daily DSA — 2 Problems / Day', 'Graphs and dynamic programming. NeetCode 150.', 'high', 'pending'],
    ['Migrate Dashboard — FastAPI + React', 'Follow README roadmap. FastAPI endpoints first, then migrate frontend.', 'high', 'pending'],
    ['Read Designing Data-Intensive Applications', 'Chapter 7+ — consistency models and replication strategies.', 'medium', 'in_progress'],
    ['Morning run — 5 km daily', 'Build from 3 km over 2 weeks. Before 6:30 AM.', 'medium', 'pending'],
  ];
  for (const row of seeds) insert.run(...row);
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

module.exports = db;
