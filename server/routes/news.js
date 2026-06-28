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
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
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

// Google News RSS — no API key, no quota, updated within minutes of
// publication (unlike NewsAPI's free tier, which is ~24h delayed and
// dominated by whichever single outlet it crawled most that day). Each
// item already names its source outlet, so this is naturally multi-source.
const FEED_URL = process.env.GOOGLE_NEWS_RSS_URL;

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache = { data: null, expiresAt: 0 };

router.get('/', async (req, res) => {
  if (!FEED_URL) return res.status(500).json({ error: 'GOOGLE_NEWS_RSS_URL not configured' });

  const count = Math.min(Number(req.query.count || req.query.pageSize) || 20, 38);

  if (cache.data && cache.expiresAt > Date.now()) {
    return res.json(cache.data.slice(0, count));
  }

  try {
    const response = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!response.ok) return res.status(502).json({ error: `Feed returned ${response.status}` });
    const xml = await response.text();

    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const seen = new Set();
    const articles = blocks
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

    // Never show an article that's already been displayed before (any row
    // existing in tbl_national_news means it was shown at some point).
    const alreadyShown = new Set(
      db.prepare('SELECT link FROM tbl_national_news').all().map(r => r.link)
    );
    const freshArticles = articles.filter(a => !alreadyShown.has(a.id));

    cache = { data: freshArticles, expiresAt: Date.now() + CACHE_TTL_MS };
    res.json(freshArticles.slice(0, count));
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch news' });
  }
});

module.exports = router;
