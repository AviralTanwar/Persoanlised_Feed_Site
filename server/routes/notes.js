const express = require('express');
const router  = express.Router();
const supabase = require('../db');

const ACTIVE = '0000-00-00 00:00:00';

// ── tbl_notes (entity wrappers) ───────────────────────────────────────────

// GET /api/notes?entityType=web_page&entityId=<url>
router.get('/', async (req, res) => {
  const { entityType, entityId, viewId } = req.query;
  let query = supabase.from('tbl_notes').select('*').eq('deleted_at', ACTIVE);

  if (entityType && entityId) {
    query = query.eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: true });
  } else if (entityType) {
    query = query.eq('entity_type', entityType).order('updated_at', { ascending: false });
  } else if (viewId) {
    query = query.eq('view_id', Number(viewId)).order('updated_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { entity_type, entity_id, view_id, title = '', description = '', url = '' } = req.body;
  if (!entity_type || !entity_id || !view_id) {
    return res.status(400).json({ error: 'entity_type, entity_id and view_id required' });
  }
  const { data, error } = await supabase
    .from('tbl_notes')
    .insert({ entity_type, entity_id: String(entity_id), view_id: Number(view_id), title, description, url })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/:id', async (req, res) => {
  const { title, description, url } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (title !== undefined)       patch.title = title;
  if (description !== undefined) patch.description = description;
  if (url !== undefined)         patch.url = url;

  const { data, error } = await supabase
    .from('tbl_notes')
    .update(patch)
    .eq('id', Number(req.params.id))
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('tbl_notes')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', Number(req.params.id));
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── tbl_notes_data (content entries per note entity) ─────────────────────

// GET /api/notes/:notesId/data
router.get('/:notesId/data', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_notes_data')
    .select('*')
    .eq('entity_id', Number(req.params.notesId))
    .eq('deleted_at', ACTIVE)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:notesId/data', async (req, res) => {
  const { title = '', description = '', content = '' } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  const { data, error } = await supabase
    .from('tbl_notes_data')
    .insert({ entity_id: Number(req.params.notesId), title, description, content: content.trim() })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/data/:id', async (req, res) => {
  const { title, description, content } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (title !== undefined)       patch.title = title;
  if (description !== undefined) patch.description = description;
  if (content !== undefined)     patch.content = content;

  const { data, error } = await supabase
    .from('tbl_notes_data')
    .update(patch)
    .eq('id', Number(req.params.id))
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/data/:id', async (req, res) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('tbl_notes_data')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', Number(req.params.id));
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
