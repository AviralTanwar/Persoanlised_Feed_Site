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

// Generic Google-News-RSS-shaped feed parser. Every KPI in tbl_news_kpi_data
// currently points at a Google News RSS URL, but this only assumes standard
// RSS <item> structure — any RSS feed works the same way.
function parseFeed(xml) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const seen = new Set();
  return blocks
    .map((block, i) => {
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
    })
    .filter(a => {
      if (!a.title) return false;
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const cacheByKpi = new Map(); // kpiId -> { data, expiresAt }

router.get('/:kpiId', async (req, res) => {
  const kpiId = Number(req.params.kpiId);
  const kpi = db.prepare('SELECT * FROM tbl_news_kpi_data WHERE id = ? AND deleted_at IS NULL').get(kpiId);
  if (!kpi) return res.status(404).json({ error: 'Unknown news KPI' });
  if (!kpi.live) return res.status(403).json({ error: 'This news KPI is not live' });

  const count = Math.min(Number(req.query.count || req.query.pageSize) || 20, 38);

  const cached = cacheByKpi.get(kpiId);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data.slice(0, count));
  }

  try {
    const response = await fetch(kpi.api_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!response.ok) return res.status(502).json({ error: `Feed returned ${response.status}` });
    const xml = await response.text();
    const articles = parseFeed(xml);

    // Never re-show an article already displayed for this KPI before.
    const alreadyShown = new Set(
      db.prepare('SELECT link FROM tbl_news_data WHERE news_api_id = ?').all(kpiId).map(r => r.link)
    );
    const freshArticles = articles.filter(a => !alreadyShown.has(a.id));

    cacheByKpi.set(kpiId, { data: freshArticles, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json(freshArticles.slice(0, count));
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch news' });
  }
});

module.exports = router;
