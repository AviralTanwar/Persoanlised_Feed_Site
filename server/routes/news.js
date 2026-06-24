const express = require('express');
const router = express.Router();

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Strip AMP paths and common tracking params, return canonical article URL.
// Falls back to a Google News search if the URL has no article path.
function canonicalUrl(rawUrl, title) {
  if (!rawUrl) return `https://news.google.com/search?q=${encodeURIComponent(title)}`;
  try {
    const u = new URL(rawUrl);
    // Remove AMP segments
    u.pathname = u.pathname
      .replace(/\/amp(\/|$)/i, '$1')
      .replace(/\.amp\.html$/i, '.html');
    // Strip tracking query params
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
     'ref','source','referrer','ncid','cid'].forEach(p => u.searchParams.delete(p));
    // If path is just "/" the URL is a homepage — fall back to search
    if (u.pathname === '/') {
      return `https://news.google.com/search?q=${encodeURIComponent(title)}`;
    }
    return u.toString();
  } catch {
    return `https://news.google.com/search?q=${encodeURIComponent(title)}`;
  }
}

// NewsAPI's /top-headlines?country=in frequently returns zero results on the
// free tier, and a single /everything?domains=... call gets dominated by
// whichever one outlet NewsAPI happens to have crawled most that day (we saw
// 84/87 results from a single source). Querying each domain separately and
// merging guarantees every source gets a fair shot at appearing.
//
// Free tier is also capped at 100 req/day and articles are delayed ~24h, so
// results cap out at "a day or two old" no matter what — that's a NewsAPI
// limitation, not something we can configure around. We cache the merged
// result for CACHE_TTL_MS so client polling/refresh doesn't multiply calls.
const INDIAN_DOMAINS = [
  'timesofindia.indiatimes.com',
  'ndtv.com',
  'hindustantimes.com',
  'thehindu.com',
  'indianexpress.com',
  'livemint.com',
  'indiatoday.in',
  'news18.com',
  'business-standard.com',
  'theprint.in',
];

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache = { data: null, expiresAt: 0 };

async function fetchDomain(domain, key, since) {
  const url = `https://newsapi.org/v2/everything?domains=${domain}&sortBy=publishedAt&from=${since}&pageSize=8&apiKey=${key}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.status !== 'ok') return [];
  return data.articles || [];
}

router.get('/', async (req, res) => {
  const key = process.env.NEWS_API_KEY;
  if (!key) return res.status(500).json({ error: 'NEWS_API_KEY not configured' });

  const count = Math.min(Number(req.query.count || req.query.pageSize) || 20, 40);

  if (cache.data && cache.expiresAt > Date.now()) {
    return res.json(cache.data.slice(0, count));
  }

  try {
    const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const results = await Promise.all(
      INDIAN_DOMAINS.map(domain => fetchDomain(domain, key, since))
    );

    const seen = new Set();
    const articles = results
      .flat()
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .map((a, i) => {
        const title = a.title?.replace(/ - [^-]+$/, '') || '';
        const link  = canonicalUrl(a.url, title) || `n${i}`;
        return {
          id:   link,
          title,
          src:  a.source?.name || 'Unknown',
          desc: a.description || a.content?.slice(0, 200) || '',
          time: timeAgo(a.publishedAt),
          url:  link,
        };
      })
      .filter(a => {
        if (!a.title || a.title === '[Removed]') return false;
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });

    cache = { data: articles, expiresAt: Date.now() + CACHE_TTL_MS };
    res.json(articles.slice(0, count));
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch news' });
  }
});

module.exports = router;
