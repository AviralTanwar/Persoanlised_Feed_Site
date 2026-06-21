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
// free tier (India top-headlines coverage is unreliable). /everything filtered
// to major Indian outlets has consistent coverage instead.
const INDIAN_DOMAINS = [
  'timesofindia.indiatimes.com',
  'ndtv.com',
  'hindustantimes.com',
  'thehindu.com',
  'indianexpress.com',
].join(',');

router.get('/', async (req, res) => {
  const key = process.env.NEWS_API_KEY;
  if (!key) return res.status(500).json({ error: 'NEWS_API_KEY not configured' });

  const pageSize = Math.min(Number(req.query.count || req.query.pageSize) || 8, 20);

  try {
    const url = `https://newsapi.org/v2/everything?domains=${INDIAN_DOMAINS}&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status !== 'ok') {
      return res.status(502).json({ error: data.message || 'NewsAPI error' });
    }

    const articles = (data.articles || [])
      .map((a, i) => {
        const title = a.title?.replace(/ - [^-]+$/, '') || '';
        return {
          id:   a.url || `n${i}`,
          title,
          src:  a.source?.name || 'Unknown',
          desc: a.description || a.content?.slice(0, 200) || '',
          time: timeAgo(a.publishedAt),
          url:  canonicalUrl(a.url, title),
        };
      })
      .filter(a => a.title && a.title !== '[Removed]');

    res.json(articles);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch news' });
  }
});

module.exports = router;
