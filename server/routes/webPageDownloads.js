const express = require('express');
const router  = express.Router();
const supabase = require('../db');

const ACTIVE = '0000-00-00 00:00:00';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB cap per file

// Raw binary body parser scoped to this router — accepts PDF bytes directly,
// no multipart/multer dependency needed. Metadata rides in query params.
const rawPdf = express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: MAX_BYTES });

// Postgres bytea over PostgREST is exchanged as a hex string: '\x' + hex.
const bufToHex = buf => '\\x' + buf.toString('hex');
const hexToBuf = hex => Buffer.from(String(hex).replace(/^\\x/, ''), 'hex');

// GET /api/web-page-downloads?note_id=  → metadata only (never the blob)
router.get('/', async (req, res) => {
  const { note_id } = req.query;
  let query = supabase
    .from('tbl_web_pge_downloads')
    .select('id, note_id, filename, mime_type, size_bytes, created_at, updated_at')
    .eq('deleted_at', ACTIVE)
    .order('created_at', { ascending: false });
  if (note_id) query = query.eq('note_id', Number(note_id));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/web-page-downloads?note_id=&filename=  (raw PDF bytes in body)
router.post('/', rawPdf, async (req, res) => {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    return res.status(400).json({ error: 'PDF bytes required in request body (Content-Type: application/pdf)' });
  }
  if (buf.slice(0, 4).toString('latin1') !== '%PDF') {
    return res.status(415).json({ error: 'File is not a valid PDF' });
  }

  const noteId   = req.query.note_id ? Number(req.query.note_id) : null;
  const filename = (req.query.filename || 'document.pdf').toString().slice(0, 255);

  const { data, error } = await supabase
    .from('tbl_web_pge_downloads')
    .insert({ note_id: noteId, filename, mime_type: 'application/pdf', size_bytes: buf.length, data: bufToHex(buf) })
    .select('id, note_id, filename, mime_type, size_bytes, created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/web-page-downloads/:id  → stream the PDF bytes (inline for viewer)
router.get('/:id', async (req, res) => {
  const { data: row, error } = await supabase
    .from('tbl_web_pge_downloads')
    .select('filename, mime_type, data')
    .eq('id', Number(req.params.id))
    .eq('deleted_at', ACTIVE)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: 'File not found' });

  const bytes = hexToBuf(row.data);
  res.set('Content-Type', row.mime_type);
  res.set('Content-Disposition', `inline; filename="${row.filename.replace(/"/g, '')}"`);
  res.set('Content-Length', String(bytes.length));
  res.send(bytes);
});

// DELETE /api/web-page-downloads/:id  → soft-delete
router.delete('/:id', async (req, res) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('tbl_web_pge_downloads')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', Number(req.params.id));
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
