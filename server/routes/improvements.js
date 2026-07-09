const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM tbl_improvements ORDER BY created_at DESC').all());
});

router.post('/', (req, res) => {
  const { title, detail = '', priority = 'medium' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
  const result = db.prepare('INSERT INTO tbl_improvements (title, detail, priority) VALUES (?, ?, ?)')
    .run(title.trim(), detail.trim(), priority);
  res.status(201).json(db.prepare('SELECT * FROM tbl_improvements WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const { status, priority, title, detail } = req.body;
  const id = req.params.id;
  if (status)   db.prepare('UPDATE tbl_improvements SET status=? WHERE id=?').run(status, id);
  if (priority) db.prepare('UPDATE tbl_improvements SET priority=? WHERE id=?').run(priority, id);
  if (title)    db.prepare('UPDATE tbl_improvements SET title=? WHERE id=?').run(title, id);
  if (detail !== undefined) db.prepare('UPDATE tbl_improvements SET detail=? WHERE id=?').run(detail, id);
  const row = db.prepare('SELECT * FROM tbl_improvements WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tbl_improvements WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.sendStatus(204);
});

module.exports = router;
