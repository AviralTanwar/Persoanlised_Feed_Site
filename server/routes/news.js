const express = require('express');
const router = express.Router();
const db = require('../db');

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html) {
  // Google's <description> is HTML entity-encoded (&lt;ol&gt;...), so entities
  // must be decoded into real tags BEFORE stripping — stripping first finds no
  // literal "<" to match and leaves the tags to reappear after decoding.
  return decodeEntities(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : '';
}

// SQLite DATETIME columns expect 'YYYY-MM-DD HH:MM:SS' (same format CURRENT_TIMESTAMP writes)
function toSqliteDate(pubDate) {
  const d = new Date(pubDate);
  if (isNaN(d)) return null;
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

// Generic RSS <item> parser — every source in tbl_news_kpi_sources is a
// Google News RSS URL today, but any standard RSS feed parses the same way.
function parseFeed(xml) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return blocks.map((block, i) => {
    const rawTitle = decodeEntities(tag(block, 'title'));
    const src   = decodeEntities(tag(block, 'source')) || 'Unknown';
    const title = rawTitle.replace(/ - [^-]+$/, '') || rawTitle;
    const link  = tag(block, 'link').trim() || `n${i}`;
    const desc  = stripTags(tag(block, 'description')).slice(0, 220);
    const pubDate = tag(block, 'pubDate');
    return {
      id:   link,
      title,
      src,
      desc,
      time: timeAgo(pubDate),
      url:  link,
      newsDate: toSqliteDate(pubDate),
    };
  }).filter(a => a.title);
}

async function fetchSource(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!response.ok) return [];
    return parseFeed(await response.text());
  } catch {
    return [];
  }
}

// Merge every live source feed for a KPI into one deduped candidate list.
async function fetchAllSources(kpiId, fallbackUrl) {
  const sources = db.prepare(
    'SELECT api_url FROM tbl_news_kpi_sources WHERE kpi_id = ? AND live = 1 AND deleted_at IS NULL'
  ).all(kpiId);
  const urls = sources.length ? sources.map(s => s.api_url) : [fallbackUrl];

  const lists = await Promise.all(urls.map(fetchSource));
  const seen = new Set();
  const merged = [];
  for (const list of lists) {
    for (const a of list) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      merged.push(a);
    }
  }
  return merged;
}

function dbRowToArticle(row) {
  return {
    id: row.link,
    title: row.headline,
    src: row.source,
    desc: row.summary,
    url: row.link,
    time: timeAgo(row.news_date || row.created_at),
    newsDate: row.news_date,
  };
}

const CACHE_TTL_MS    = 15 * 60 * 1000;
const NO_FRESH_TTL_MS = 2 * 60 * 1000; // short — recheck the live feeds again soon, but not on every swipe
const cacheByKpi    = new Map(); // kpiId -> { data, expiresAt }
const noFreshUntil  = new Map(); // kpiId -> timestamp

router.get('/:kpiId/old', (req, res) => {
  const kpiId = Number(req.params.kpiId);
  const count = Math.min(Number(req.query.count || req.query.pageSize) || 20, 50);
  const rows = db.prepare(`
    SELECT * FROM tbl_news_data
    WHERE news_api_id = ? AND deleted_at IS NULL AND response != 0
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(kpiId, count);
  res.json(rows.map(dbRowToArticle));
});

router.get('/:kpiId', async (req, res) => {
  const kpiId = Number(req.params.kpiId);
  const kpi = db.prepare('SELECT * FROM tbl_news_kpi_data WHERE id = ? AND deleted_at IS NULL').get(kpiId);
  if (!kpi) return res.status(404).json({ error: 'Unknown news KPI' });
  if (!kpi.live) return res.status(403).json({ error: 'This news KPI is not live' });

  const count = Math.min(Number(req.query.count || req.query.pageSize) || 20, 38);

  try {
    const cached = cacheByKpi.get(kpiId);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ tier: 'fresh', articles: cached.data.slice(0, count) });
    }

    const skipFresh = (noFreshUntil.get(kpiId) || 0) > Date.now();
    if (!skipFresh) {
      const merged = await fetchAllSources(kpiId, kpi.api_url);
      const alreadyShown = new Set(
        db.prepare('SELECT link FROM tbl_news_data WHERE news_api_id = ?').all(kpiId).map(r => r.link)
      );
      const freshArticles = merged.filter(a => !alreadyShown.has(a.id));

      if (freshArticles.length > 0) {
        cacheByKpi.set(kpiId, { data: freshArticles, expiresAt: Date.now() + CACHE_TTL_MS });
        return res.json({ tier: 'fresh', articles: freshArticles.slice(0, count) });
      }
      // Live feeds have nothing new right now — don't hit them again for a
      // couple of minutes (e.g. while the user is rapidly swiping through a
      // small fallback batch), just fall through to the DB tiers below.
      noFreshUntil.set(kpiId, Date.now() + NO_FRESH_TTL_MS);
    }

    // Tier 1: shown before, never reacted to and never expanded — least "seen".
    const unseenOld = db.prepare(`
      SELECT * FROM tbl_news_data
      WHERE news_api_id = ? AND deleted_at IS NULL AND response = 0 AND clicked_on_more = 0
      ORDER BY news_date DESC
      LIMIT ?
    `).all(kpiId, count);
    if (unseenOld.length > 0) {
      return res.json({ tier: 'unseen-old', articles: unseenOld.map(dbRowToArticle) });
    }

    // Tier 2: shown before, expanded but never reacted to.
    const glancedOld = db.prepare(`
      SELECT * FROM tbl_news_data
      WHERE news_api_id = ? AND deleted_at IS NULL AND response = 0 AND clicked_on_more = 1
      ORDER BY news_date DESC
      LIMIT ?
    `).all(kpiId, count);
    if (glancedOld.length > 0) {
      return res.json({ tier: 'glanced-old', articles: glancedOld.map(dbRowToArticle) });
    }

    res.json({ tier: 'exhausted', articles: [] });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch news' });
  }
});

module.exports = router;
