const express = require('express');
const router = express.Router();

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

router.get('/', async (req, res) => {
  const key = process.env.NEWS_API_KEY;
  if (!key) return res.status(500).json({ error: 'NEWS_API_KEY not configured' });

  const country  = req.query.country || 'in';
  const pageSize = Math.min(Number(req.query.count || req.query.pageSize) || 8, 20);

  try {
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=${pageSize}&apiKey=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status !== 'ok') {
      return res.status(502).json({ error: data.message || 'NewsAPI error' });
    }

    const articles = (data.articles || [])
      .map((a, i) => ({
        id:   a.url || `n${i}`,
        title: a.title?.replace(/ - [^-]+$/, '') || '',
        src:  a.source?.name || 'Unknown',
        desc: a.description || a.content?.slice(0, 200) || '',
        time: timeAgo(a.publishedAt),
        url:  a.url || '',
      }))
      .filter(a => a.title && a.title !== '[Removed]');

    res.json(articles);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch news' });
  }
});

module.exports = router;
