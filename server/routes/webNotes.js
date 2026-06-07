const express = require('express');
const router = express.Router();
const db = require('../db');

// GET notes for a page
router.get('/', (req, res) => {
  const { page_id } = req.query;
  if (!page_id) return res.status(400).json({ error: 'page_id required' });
  const rows = db.prepare('SELECT * FROM web_notes WHERE page_id = ? ORDER BY created_at DESC').all(page_id);
  res.json(rows);
});

// POST create note
router.post('/', (req, res) => {
  const { page_id, page_title = '', content } = req.body;
  if (!page_id || !content?.trim()) return res.status(400).json({ error: 'page_id and content required' });

  const result = db
    .prepare('INSERT INTO web_notes (page_id, page_title, content) VALUES (?, ?, ?)')
    .run(page_id, page_title, content.trim());

  const row = db.prepare('SELECT * FROM web_notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// DELETE a note
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM web_notes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.sendStatus(204);
});

module.exports = router;
