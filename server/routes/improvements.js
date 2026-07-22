const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM tbl_improvements ORDER BY created_at DESC').all());
});

const STATUSES = ['pending', 'in_progress', 'hold', 'done'];

router.post('/', (req, res) => {
  const { title, detail = '', remark = '', priority = 'medium', status = 'pending' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
  const safeStatus = STATUSES.includes(status) ? status : 'pending';
  const result = db.prepare('INSERT INTO tbl_improvements (title, detail, remark, priority, status) VALUES (?, ?, ?, ?, ?)')
    .run(title.trim(), detail.trim(), remark.trim(), priority, safeStatus);
  res.status(201).json(db.prepare('SELECT * FROM tbl_improvements WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const { status, priority, title, detail, remark, is_kpi } = req.body;
  const id = req.params.id;
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
    db.prepare('UPDATE tbl_improvements SET status=? WHERE id=?').run(status, id);
  }
  if (priority !== undefined) db.prepare('UPDATE tbl_improvements SET priority=? WHERE id=?').run(priority, id);
  if (title !== undefined)    db.prepare('UPDATE tbl_improvements SET title=? WHERE id=?').run(title, id);
  if (detail !== undefined)   db.prepare('UPDATE tbl_improvements SET detail=? WHERE id=?').run(detail, id);
  if (remark !== undefined)   db.prepare('UPDATE tbl_improvements SET remark=? WHERE id=?').run(remark, id);
  if (is_kpi !== undefined)   db.prepare('UPDATE tbl_improvements SET is_kpi=? WHERE id=?').run(is_kpi ? 1 : 0, id);
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
