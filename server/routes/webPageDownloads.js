const express = require('express');
const router  = express.Router();
const db      = require('../db');

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB cap per file

// Raw binary body parser scoped to this router — accepts PDF bytes directly,
// no multipart/multer dependency needed. Metadata rides in query params.
const rawPdf = express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: MAX_BYTES });

// GET /api/web-page-downloads?note_id=  → metadata only (never the blob)
router.get('/', (req, res) => {
  const { note_id } = req.query;
  const where = note_id
    ? "WHERE note_id=? AND deleted_at='0000-00-00 00:00:00'"
    : "WHERE deleted_at='0000-00-00 00:00:00'";
  const stmt = db.prepare(
    `SELECT id, note_id, filename, mime_type, size_bytes, created_at, updated_at
     FROM tbl_web_pge_downloads ${where} ORDER BY created_at DESC`
  );
  res.json(note_id ? stmt.all(Number(note_id)) : stmt.all());
});

// POST /api/web-page-downloads?note_id=&filename=  (raw PDF bytes in body)
router.post('/', rawPdf, (req, res) => {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    return res.status(400).json({ error: 'PDF bytes required in request body (Content-Type: application/pdf)' });
  }
  // %PDF magic number — reject anything that isn't actually a PDF
  if (buf.slice(0, 4).toString('latin1') !== '%PDF') {
    return res.status(415).json({ error: 'File is not a valid PDF' });
  }

  const noteId   = req.query.note_id ? Number(req.query.note_id) : null;
  const filename = (req.query.filename || 'document.pdf').toString().slice(0, 255);

  const info = db.prepare(
    `INSERT INTO tbl_web_pge_downloads (note_id, filename, mime_type, size_bytes, data)
     VALUES (?, ?, 'application/pdf', ?, ?)`
  ).run(noteId, filename, buf.length, buf);

  const row = db.prepare(
    'SELECT id, note_id, filename, mime_type, size_bytes, created_at FROM tbl_web_pge_downloads WHERE id=?'
  ).get(info.lastInsertRowid);
  res.status(201).json(row);
});

// GET /api/web-page-downloads/:id  → stream the PDF bytes (inline for iframe/viewer)
router.get('/:id', (req, res) => {
  const row = db.prepare(
    "SELECT filename, mime_type, data FROM tbl_web_pge_downloads WHERE id=? AND deleted_at='0000-00-00 00:00:00'"
  ).get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'File not found' });

  res.set('Content-Type', row.mime_type);
  res.set('Content-Disposition', `inline; filename="${row.filename.replace(/"/g, '')}"`);
  res.set('Content-Length', String(row.data.length));
  res.send(row.data);
});

// DELETE /api/web-page-downloads/:id  → soft-delete
router.delete('/:id', (req, res) => {
  db.prepare(
    "UPDATE tbl_web_pge_downloads SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
