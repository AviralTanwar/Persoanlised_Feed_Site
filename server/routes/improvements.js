const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM improvement_notes ORDER BY created_at DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { title, detail = '', priority = 'medium' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  const result = db
    .prepare('INSERT INTO improvement_notes (title, detail, priority) VALUES (?, ?, ?)')
    .run(title.trim(), detail.trim(), priority);

  const row = db.prepare('SELECT * FROM improvement_notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const { status, priority } = req.body;
  const { id } = req.params;

  if (status) db.prepare('UPDATE improvement_notes SET status = ? WHERE id = ?').run(status, id);
  if (priority) db.prepare('UPDATE improvement_notes SET priority = ? WHERE id = ?').run(priority, id);

  const row = db.prepare('SELECT * FROM improvement_notes WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM improvement_notes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.sendStatus(204);
});

module.exports = router;
