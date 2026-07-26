const express = require('express');
const router = express.Router();
const supabase = require('../db');

const STATUSES = ['pending', 'in_progress', 'hold', 'done'];

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_improvements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { title, detail = '', remark = '', priority = 'medium', status = 'pending' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
  const safeStatus = STATUSES.includes(status) ? status : 'pending';
  const { data, error } = await supabase
    .from('tbl_improvements')
    .insert({ title: title.trim(), detail: detail.trim(), remark: remark.trim(), priority, status: safeStatus })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
  const { status, priority, title, detail, remark, is_kpi } = req.body;
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
  }
  const patch = {};
  if (status !== undefined)   patch.status = status;
  if (priority !== undefined) patch.priority = priority;
  if (title !== undefined)    patch.title = title;
  if (detail !== undefined)   patch.detail = detail;
  if (remark !== undefined)   patch.remark = remark;
  if (is_kpi !== undefined)   patch.is_kpi = is_kpi ? 1 : 0;

  const { data, error } = await supabase
    .from('tbl_improvements')
    .update(patch)
    .eq('id', Number(req.params.id))
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_improvements')
    .delete()
    .eq('id', Number(req.params.id))
    .select();
  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: 'Not found' });
  res.sendStatus(204);
});

module.exports = router;
