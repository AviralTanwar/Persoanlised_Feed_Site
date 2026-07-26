const express = require('express');
const router  = express.Router();
const supabase = require('../db');

const ACTIVE = '0000-00-00 00:00:00';

router.get('/', async (req, res) => {
  const { summaryId } = req.query;
  if (!summaryId) return res.status(400).json({ error: 'summaryId required' });
  const { data, error } = await supabase
    .from('tbl_to_do')
    .select('*')
    .eq('summary_id', Number(summaryId))
    .eq('deleted_at', ACTIVE)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { summary_id, title, description = '', status = 'pending', priority = 'medium', due_date = null, position = 0, remark = '' } = req.body;
  if (!summary_id || !title) return res.status(400).json({ error: 'summary_id and title required' });
  const { data, error } = await supabase
    .from('tbl_to_do')
    .insert({ summary_id, title, description, status, priority, due_date, position, remark })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/:id', async (req, res) => {
  const { title, description, status, priority, due_date, position, remark } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (title !== undefined)       patch.title = title;
  if (description !== undefined) patch.description = description;
  if (status !== undefined)      patch.status = status;
  if (priority !== undefined)    patch.priority = priority;
  if (due_date !== undefined)    patch.due_date = due_date;
  if (position !== undefined)    patch.position = position;
  if (remark !== undefined)      patch.remark = remark;

  const { data, error } = await supabase
    .from('tbl_to_do')
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
    .from('tbl_to_do')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', Number(req.params.id));
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
