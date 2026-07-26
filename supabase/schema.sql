-- ============================================================================
-- API Explorer Dashboard — Supabase Postgres schema
-- Run this ONCE by hand in the Supabase SQL editor (Project → SQL Editor).
-- Seeds live separately in seed.sql; run this file first, seed.sql second.
--
-- Translation notes (SQLite → Postgres):
--   • INTEGER PRIMARY KEY AUTOINCREMENT → BIGINT GENERATED ALWAYS AS IDENTITY.
--   • created_at / updated_at → TIMESTAMPTZ DEFAULT now().
--   • deleted_at is TWO different conventions in this app, preserved as-is:
--       – NULL sentinel (news_data, weathers_card, news_kpi_data) → TIMESTAMPTZ NULL.
--       – string sentinel '0000-00-00 00:00:00' (all tbl_* soft-delete tables)
--         → kept as TEXT, because that string is not a valid Postgres timestamp
--         and the app compares against it literally.
--   • 0/1 flag columns kept as SMALLINT 0/1 (not BOOLEAN) so the existing
--     server logic and client `=== 1` checks keep working unchanged.
--   • response (-1/0/1) and shown (0..5) are multi-valued ints, left INTEGER.
--   • PDF bytes (tbl_web_pge_downloads.data) → BYTEA.
--   • Legacy tables notes / highlights / interactions / web_notes are NOT
--     recreated — they were already dropped and are used by no route.
-- ============================================================================

-- ── News sources (one row per dashboard news panel) ────────────────────────
CREATE TABLE tbl_news_kpi_data (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,                 -- NULL = active
  live       SMALLINT NOT NULL DEFAULT 1 CHECK (live IN (0, 1)),
  logo       TEXT DEFAULT '',
  name       TEXT NOT NULL,
  tag        TEXT DEFAULT '',
  api_url    TEXT NOT NULL,
  api_name   TEXT DEFAULT ''
);

-- ── RSS feed URLs per news KPI (many feeds → one KPI) ──────────────────────
CREATE TABLE tbl_news_feeds (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  news_kpi_id BIGINT NOT NULL REFERENCES tbl_news_kpi_data(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  name        TEXT NOT NULL,
  live        SMALLINT NOT NULL DEFAULT 1 CHECK (live IN (0, 1)),
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_news_feeds_kpi ON tbl_news_feeds(news_kpi_id);

-- ── Article pool + per-article reactions (history is NOT migrated) ─────────
CREATE TABLE tbl_news_data (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  headline        TEXT NOT NULL,
  source          TEXT DEFAULT '',
  summary         TEXT DEFAULT '',
  link            TEXT NOT NULL UNIQUE,           -- conflict key for interaction upsert
  response        INTEGER NOT NULL DEFAULT 0 CHECK (response IN (-1, 0, 1)),
  link_open       SMALLINT NOT NULL DEFAULT 0 CHECK (link_open IN (0, 1)),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ,                    -- NULL = active
  clicked_on_more SMALLINT NOT NULL DEFAULT 0 CHECK (clicked_on_more IN (0, 1)),
  live            SMALLINT NOT NULL DEFAULT 1 CHECK (live IN (0, 1)),
  news_date       TIMESTAMPTZ,
  shown           INTEGER NOT NULL DEFAULT 0 CHECK (shown IN (0, 1, 2, 3, 4, 5)),
  news_api_id     BIGINT                          -- loose ref to tbl_news_kpi_data.id (never FK-enforced)
);
CREATE INDEX idx_news_data_api_id ON tbl_news_data(news_api_id);
CREATE INDEX idx_news_data_live   ON tbl_news_data(live);
CREATE INDEX idx_news_data_shown  ON tbl_news_data(shown);
CREATE INDEX idx_news_data_updated ON tbl_news_data(updated_at DESC);

-- ── Dashboard section registry (order + visibility) ────────────────────────
CREATE TABLE tbl_view_kpi (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  rank        INTEGER NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
  section_key TEXT NOT NULL DEFAULT ''
);

-- ── Quote sources for the hero band (motivational / developer) ─────────────
CREATE TABLE tbl_quotes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  view_id    BIGINT NOT NULL REFERENCES tbl_view_kpi(id),
  type       TEXT NOT NULL DEFAULT 'motivational',
  title      TEXT NOT NULL,
  api        TEXT NOT NULL,
  logo       TEXT NOT NULL DEFAULT '💬',
  color      TEXT NOT NULL DEFAULT 'accent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);
CREATE INDEX idx_quotes_type ON tbl_quotes(type);

-- ── Unified note wrappers (web pages, youtube, improvements) ───────────────
CREATE TABLE tbl_notes (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('web_page', 'youtube', 'improvement')),
  entity_id   TEXT NOT NULL,
  view_id     BIGINT NOT NULL REFERENCES tbl_view_kpi(id),
  title       TEXT DEFAULT '',
  description TEXT DEFAULT '',
  url         TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);
CREATE INDEX idx_notes_entity_type ON tbl_notes(entity_type);
CREATE INDEX idx_notes_view_id     ON tbl_notes(view_id);

-- ── Note content entries (many per wrapper) ────────────────────────────────
CREATE TABLE tbl_notes_data (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_id   BIGINT NOT NULL REFERENCES tbl_notes(id),
  title       TEXT DEFAULT '',
  description TEXT DEFAULT '',
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);
CREATE INDEX idx_notes_data_entity ON tbl_notes_data(entity_id);

-- ── Kanban boards ──────────────────────────────────────────────────────────
CREATE TABLE tbl_to_do_summary (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);

-- ── Kanban task cards ──────────────────────────────────────────────────────
CREATE TABLE tbl_to_do (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  summary_id  BIGINT NOT NULL REFERENCES tbl_to_do_summary(id),
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  priority    TEXT NOT NULL DEFAULT 'medium'  CHECK (priority IN ('low', 'medium', 'high')),
  due_date    TEXT,
  position    INTEGER DEFAULT 0,
  remark      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);
CREATE INDEX idx_todo_summary ON tbl_to_do(summary_id);

-- ── Uploaded PDFs (bytes stored inline as BYTEA) ───────────────────────────
CREATE TABLE tbl_web_pge_downloads (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  note_id    BIGINT REFERENCES tbl_notes(id),
  filename   TEXT NOT NULL,
  mime_type  TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);
CREATE INDEX idx_downloads_note ON tbl_web_pge_downloads(note_id);

-- ── Improvements & feedback tracker (hard-deleted; no deleted_at) ──────────
CREATE TABLE tbl_improvements (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      TEXT NOT NULL,
  detail     TEXT DEFAULT '',
  remark     TEXT DEFAULT '',
  priority   TEXT DEFAULT 'medium'  CHECK (priority IN ('low', 'medium', 'high')),
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'hold', 'done')),
  is_kpi     SMALLINT NOT NULL DEFAULT 0 CHECK (is_kpi IN (0, 1)),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Weather city cards ─────────────────────────────────────────────────────
CREATE TABLE tbl_weathers_card (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city       TEXT NOT NULL,
  country    TEXT NOT NULL DEFAULT 'IN',
  units      TEXT NOT NULL DEFAULT 'metric',
  permanent  SMALLINT NOT NULL DEFAULT 0 CHECK (permanent IN (0, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ                          -- NULL = active
);

-- ── Weather API source(s) the server proxies ───────────────────────────────
CREATE TABLE tbl_weathers (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  api        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);

-- ── Single-row user profile ────────────────────────────────────────────────
CREATE TABLE tbl_user_info (
  user_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firstname   TEXT NOT NULL,
  lastname    TEXT NOT NULL,
  title       TEXT DEFAULT '',
  description TEXT DEFAULT '',
  number      TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  username    TEXT DEFAULT '',
  location    TEXT DEFAULT 'Noida, India',
  timezone    TEXT DEFAULT 'IST (UTC+5:30)',
  salutation  TEXT DEFAULT 'Mr',
  tz_sign     TEXT DEFAULT '+',
  tz_offset   TEXT DEFAULT '5:30',
  active      SMALLINT NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);

-- ── Stored credential (bcrypt hash for the to-do unlock) ────────────────────
CREATE TABLE tbl_credentials (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  description TEXT DEFAULT '',
  user_name   TEXT DEFAULT '',
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);

-- ── OneNote-style scratchpad pages ─────────────────────────────────────────
CREATE TABLE tbl_onenote_pages (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notebook_name TEXT NOT NULL DEFAULT 'Dev Notes',
  title         TEXT NOT NULL,
  body          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TEXT NOT NULL DEFAULT '0000-00-00 00:00:00'
);

-- ── Row Level Security ─────────────────────────────────────────────────────
-- All access is server-side via the service_role key, which BYPASSES RLS.
-- We keep RLS ENABLED with no policies: the service role still works, and the
-- anon/public key (were it ever exposed) gets zero access. Do NOT add a
-- permissive "USING (true)" policy — that would open every table to anon.
ALTER TABLE tbl_news_kpi_data     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_news_feeds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_news_data         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_view_kpi          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_quotes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_notes_data        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_to_do_summary     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_to_do             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_web_pge_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_improvements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_weathers_card     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_weathers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_user_info         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_credentials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_onenote_pages     ENABLE ROW LEVEL SECURITY;
