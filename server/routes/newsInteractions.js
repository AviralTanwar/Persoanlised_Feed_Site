const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all reactions as a map: { [article_id]: { reaction, title, source, ... } }
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM news_interactions ORDER BY updated_at DESC').all();
  const map = {};
  for (const r of rows) map[r.article_id] = r;
  res.json(map);
});

// POST upsert a reaction (with full article metadata)
router.post('/', (req, res) => {
  const { article_id, title, description = '', source = '', url = '', reaction } = req.body;
  if (!article_id || !title) return res.status(400).json({ error: 'article_id and title required' });

  // reaction can be 'like', 'dislike', or null (toggled off — keep row, clear reaction)
  db.prepare(`
    INSERT INTO news_interactions (article_id, title, description, source, url, reaction, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(article_id) DO UPDATE SET
      reaction    = excluded.reaction,
      updated_at  = CURRENT_TIMESTAMP
  `).run(article_id, title, description, source, url, reaction ?? null);

  const row = db.prepare('SELECT * FROM news_interactions WHERE article_id = ?').get(article_id);
  res.json(row);
});

module.exports = router;
