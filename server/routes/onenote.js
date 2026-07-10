const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM tbl_onenote_pages WHERE deleted_at='0000-00-00 00:00:00' ORDER BY updated_at DESC"
  ).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { notebook_name = 'Dev Notes', title, body = '' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  const info = db.prepare(
    'INSERT INTO tbl_onenote_pages (notebook_name, title, body) VALUES (?,?,?)'
  ).run(notebook_name.trim(), title.trim(), body);
  res.status(201).json(db.prepare('SELECT * FROM tbl_onenote_pages WHERE id=?').get(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const { notebook_name, title, body } = req.body;
  db.prepare(`UPDATE tbl_onenote_pages SET
    notebook_name=COALESCE(?,notebook_name), title=COALESCE(?,title),
    body=COALESCE(?,body), updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(notebook_name ?? null, title ?? null, body ?? null, Number(req.params.id));
  res.json(db.prepare('SELECT * FROM tbl_onenote_pages WHERE id=?').get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare(
    "UPDATE tbl_onenote_pages SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
