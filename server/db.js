const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const db = new Database(path.join(dbDir, 'dashboard.db'));

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

  CREATE TABLE IF NOT EXISTS tbl_national_news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headline TEXT NOT NULL,
    source TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    link TEXT NOT NULL UNIQUE,
    response INTEGER NOT NULL CHECK(response IN (-1, 0, 1)) DEFAULT 0,
    link_open INTEGER NOT NULL CHECK(link_open IN (0, 1)) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
  );

  DROP TABLE IF EXISTS news_interactions;

  CREATE TABLE IF NOT EXISTS web_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id TEXT NOT NULL,
    page_title TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Migration: add clicked_on_more if upgrading from an older tbl_national_news
const newsCols = db.prepare('PRAGMA table_info(tbl_national_news)').all().map(c => c.name);
if (!newsCols.includes('clicked_on_more')) {
  db.exec(`ALTER TABLE tbl_national_news ADD COLUMN clicked_on_more INTEGER NOT NULL DEFAULT 0 CHECK(clicked_on_more IN (0, 1))`);
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

module.exports = db;
