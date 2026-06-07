const express = require('express');
const router = express.Router();

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

router.get('/', async (req, res) => {
  const count = Math.min(Number(req.query.count) || 12, 30);

  try {
    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const ids = await idsRes.json();

    const stories = await Promise.all(
      ids.slice(0, count).map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
      )
    );

    res.json(
      stories.filter(Boolean).map(s => ({
        id: s.id,
        title: s.title,
        score: s.score || 0,
        by: s.by || 'unknown',
        comments: s.descendants || 0,
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        domain: s.url ? getDomain(s.url) : 'news.ycombinator.com',
      }))
    );
  } catch {
    res.status(500).json({ error: 'Failed to fetch HN stories' });
  }
});

module.exports = router;
