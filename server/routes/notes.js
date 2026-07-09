const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── tbl_notes (entity wrappers) ───────────────────────────────────────────

// GET /api/notes?entityType=web_page&entityId=<url>
router.get('/', (req, res) => {
  const { entityType, entityId, viewId } = req.query;
  let rows;
  if (entityType && entityId) {
    rows = db.prepare(
      "SELECT * FROM tbl_notes WHERE entity_type=? AND entity_id=? AND deleted_at='0000-00-00 00:00:00' ORDER BY created_at ASC"
    ).all(entityType, entityId);
  } else if (entityType) {
    rows = db.prepare(
      "SELECT * FROM tbl_notes WHERE entity_type=? AND deleted_at='0000-00-00 00:00:00' ORDER BY updated_at DESC"
    ).all(entityType);
  } else if (viewId) {
    rows = db.prepare(
      "SELECT * FROM tbl_notes WHERE view_id=? AND deleted_at='0000-00-00 00:00:00' ORDER BY updated_at DESC"
    ).all(Number(viewId));
  } else {
    rows = db.prepare(
      "SELECT * FROM tbl_notes WHERE deleted_at='0000-00-00 00:00:00' ORDER BY created_at DESC"
    ).all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { entity_type, entity_id, view_id, title='', description='', url='' } = req.body;
  if (!entity_type || !entity_id || !view_id) {
    return res.status(400).json({ error: 'entity_type, entity_id and view_id required' });
  }
  const info = db.prepare(
    'INSERT INTO tbl_notes (entity_type, entity_id, view_id, title, description, url) VALUES (?,?,?,?,?,?)'
  ).run(entity_type, String(entity_id), Number(view_id), title, description, url);
  res.json(db.prepare('SELECT * FROM tbl_notes WHERE id=?').get(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const { title, description, url } = req.body;
  db.prepare(`UPDATE tbl_notes SET
    title=COALESCE(?,title), description=COALESCE(?,description),
    url=COALESCE(?,url), updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(title??null, description??null, url??null, Number(req.params.id));
  res.json(db.prepare('SELECT * FROM tbl_notes WHERE id=?').get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare(
    "UPDATE tbl_notes SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(Number(req.params.id));
  res.json({ ok: true });
});

// ── tbl_notes_data (content entries per note entity) ─────────────────────

// GET /api/notes/:notesId/data
router.get('/:notesId/data', (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM tbl_notes_data WHERE entity_id=? AND deleted_at='0000-00-00 00:00:00' ORDER BY created_at ASC"
  ).all(Number(req.params.notesId));
  res.json(rows);
});

router.post('/:notesId/data', (req, res) => {
  const { title='', content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  const info = db.prepare(
    'INSERT INTO tbl_notes_data (entity_id, title, content) VALUES (?,?,?)'
  ).run(Number(req.params.notesId), title, content.trim());
  res.json(db.prepare('SELECT * FROM tbl_notes_data WHERE id=?').get(info.lastInsertRowid));
});

router.patch('/data/:id', (req, res) => {
  const { title, content } = req.body;
  db.prepare(`UPDATE tbl_notes_data SET
    title=COALESCE(?,title), content=COALESCE(?,content),
    updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(title??null, content??null, Number(req.params.id));
  res.json(db.prepare('SELECT * FROM tbl_notes_data WHERE id=?').get(Number(req.params.id)));
});

router.delete('/data/:id', (req, res) => {
  db.prepare(
    "UPDATE tbl_notes_data SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
