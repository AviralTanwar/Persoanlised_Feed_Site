const express = require('express');
const router = express.Router();
const db = require('../db');

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripTags(html) {
  return decodeEntities(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : '';
}

function toSqliteDate(pubDate) {
  const d = new Date(pubDate);
  if (isNaN(d)) return null;
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

function parseFeed(xml, kpiName = '') {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return blocks.map((block, i) => {
    const rawTitle = decodeEntities(tag(block, 'title'));
    const src   = decodeEntities(tag(block, 'source'))
               || decodeEntities(tag(block, 'dc:creator'))
               || kpiName
               || 'Unknown';
    const title = rawTitle.replace(/ - [^-]+$/, '') || rawTitle;
    const link  = tag(block, 'link').trim() || `n${i}`;
    const desc  = stripTags(tag(block, 'description')).slice(0, 220);
    const pubDate = tag(block, 'pubDate');
    return { id: link, title, src, desc, time: timeAgo(pubDate), url: link, newsDate: toSqliteDate(pubDate) };
  }).filter(a => a.title);
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
const NO_FRESH_TTL_MS = 2 * 60 * 1000;
const cacheByKpi   = new Map();
const noFreshUntil = new Map();

router.get('/:kpiId/old', (req, res) => {
  const kpiId = Number(req.params.kpiId);
  const count = Math.min(Number(req.query.count) || 30, 100);
  // Return everything ever seen for this KPI - both reacted and unreacted -
  // except articles that are currently live on screen (already in the main panel).
  const rows = db.prepare(`
    SELECT * FROM tbl_news_data
    WHERE news_api_id = ? AND deleted_at IS NULL AND NOT (response = 0 AND live = 1)
    ORDER BY updated_at DESC LIMIT ?
  `).all(kpiId, count);
  res.json(rows.map(dbRowToArticle));
});

router.get('/:kpiId', async (req, res) => {
  const kpiId = Number(req.params.kpiId);
  const kpi = db.prepare('SELECT * FROM tbl_news_kpi_data WHERE id = ? AND deleted_at IS NULL').get(kpiId);
  if (!kpi) return res.status(404).json({ error: 'Unknown news KPI' });
  if (!kpi.live) return res.status(403).json({ error: 'This news KPI is not live' });

  const count = Math.min(Number(req.query.count) || 20, 38);

  // Reset stale live=1 flags for unreacted articles — if the tab was closed or crashed,
  // those flags never got cleared and would permanently block the article pool.
  db.prepare(`
    UPDATE tbl_news_data SET live = 0, updated_at = CURRENT_TIMESTAMP
    WHERE news_api_id = ? AND live = 1 AND response = 0 AND deleted_at IS NULL
  `).run(kpiId);

  try {
    const cached = cacheByKpi.get(kpiId);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ tier: 'fresh', articles: cached.data.slice(0, count) });
    }

    if ((noFreshUntil.get(kpiId) || 0) <= Date.now()) {
      const response = await fetch(kpi.api_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!response.ok) return res.status(502).json({ error: `Feed returned ${response.status}` });
      const articles = parseFeed(await response.text(), kpi.name);

      // "Fresh" = never appeared in this feed before. Any article already in the DB
      // has been seen (markLive inserts it the moment it hits the screen).
      // Liked/disliked/swiped all stay excluded. New RSS articles that weren't in DB
      // are always fresh. When the whole feed is known → exhausted state.
      const excluded = new Set(
        db.prepare(`
          SELECT link FROM tbl_news_data
          WHERE news_api_id = ? AND deleted_at IS NULL
        `).all(kpiId).map(r => r.link)
      );
      const fresh = articles.filter(a => !excluded.has(a.id));

      if (fresh.length > 0) {
        cacheByKpi.set(kpiId, { data: fresh, expiresAt: Date.now() + CACHE_TTL_MS });
        return res.json({ tier: 'fresh', articles: fresh.slice(0, count) });
      }
      noFreshUntil.set(kpiId, Date.now() + NO_FRESH_TTL_MS);
    }

    // No fresh news - tell the client to show the "seen everything" state.
    // Old/previously-seen articles are served separately via /:kpiId/old
    // only when the user explicitly clicks "Review old news".
    res.json({ tier: 'exhausted', articles: [] });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch news' });
  }
});

module.exports = router;
