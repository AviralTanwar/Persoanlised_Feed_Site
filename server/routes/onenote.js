const express = require('express');
const router  = express.Router();
const supabase = require('../db');

const ACTIVE = '0000-00-00 00:00:00';

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_onenote_pages')
    .select('*')
    .eq('deleted_at', ACTIVE)
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { notebook_name = 'Dev Notes', title, body = '' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  const { data, error } = await supabase
    .from('tbl_onenote_pages')
    .insert({ notebook_name: notebook_name.trim(), title: title.trim(), body })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
  const { notebook_name, title, body } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (notebook_name !== undefined) patch.notebook_name = notebook_name;
  if (title !== undefined)         patch.title = title;
  if (body !== undefined)          patch.body = body;

  const { data, error } = await supabase
    .from('tbl_onenote_pages')
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
    .from('tbl_onenote_pages')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', Number(req.params.id));
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
