const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  const { summaryId } = req.query;
  if (!summaryId) return res.status(400).json({ error: 'summaryId required' });
  res.json(db.prepare(
    "SELECT * FROM tbl_to_do WHERE summary_id=? AND deleted_at='0000-00-00 00:00:00' ORDER BY position ASC, created_at ASC"
  ).all(Number(summaryId)));
});

router.post('/', (req, res) => {
  const { summary_id, title, description='', status='pending', priority='medium', due_date=null, position=0 } = req.body;
  if (!summary_id || !title) return res.status(400).json({ error: 'summary_id and title required' });
  const info = db.prepare(
    'INSERT INTO tbl_to_do (summary_id,title,description,status,priority,due_date,position) VALUES (?,?,?,?,?,?,?)'
  ).run(summary_id, title, description, status, priority, due_date, position);
  res.json(db.prepare('SELECT * FROM tbl_to_do WHERE id=?').get(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const { title, description, status, priority, due_date, position } = req.body;
  db.prepare(`UPDATE tbl_to_do SET
    title=COALESCE(?,title), description=COALESCE(?,description),
    status=COALESCE(?,status), priority=COALESCE(?,priority),
    due_date=COALESCE(?,due_date), position=COALESCE(?,position),
    updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(title, description, status, priority, due_date, position, Number(req.params.id));
  res.json(db.prepare('SELECT * FROM tbl_to_do WHERE id=?').get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE tbl_to_do SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
