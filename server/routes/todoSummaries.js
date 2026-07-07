const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  const boards = db.prepare(
    "SELECT * FROM tbl_to_do_summary WHERE deleted_at = '0000-00-00 00:00:00' ORDER BY created_at ASC"
  ).all();
  const counts = db.prepare(
    "SELECT summary_id, status, COUNT(*) n FROM tbl_to_do WHERE deleted_at = '0000-00-00 00:00:00' GROUP BY summary_id, status"
  ).all();
  const countMap = {};
  for (const { summary_id, status, n } of counts) {
    if (!countMap[summary_id]) countMap[summary_id] = { pending: 0, in_progress: 0, done: 0, total: 0 };
    countMap[summary_id][status] = n;
    countMap[summary_id].total += n;
  }
  res.json(boards.map(b => ({ ...b, counts: countMap[b.id] || { pending: 0, in_progress: 0, done: 0, total: 0 } })));
});

router.post('/', (req, res) => {
  const { name, description = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = db.prepare('INSERT INTO tbl_to_do_summary (name, description) VALUES (?, ?)').run(name, description);
  res.json(db.prepare('SELECT * FROM tbl_to_do_summary WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const { name, description } = req.body;
  db.prepare(`UPDATE tbl_to_do_summary SET name=COALESCE(?,name), description=COALESCE(?,description), updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name, description, Number(req.params.id));
  res.json(db.prepare('SELECT * FROM tbl_to_do_summary WHERE id = ?').get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE tbl_to_do_summary SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
