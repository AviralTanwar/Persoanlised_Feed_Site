const express = require('express');
const router  = express.Router();
const supabase = require('../db');

const ACTIVE = '0000-00-00 00:00:00';

router.get('/', async (req, res) => {
  const { data: boards, error: bErr } = await supabase
    .from('tbl_to_do_summary')
    .select('*')
    .eq('deleted_at', ACTIVE)
    .order('created_at', { ascending: true });
  if (bErr) return res.status(500).json({ error: bErr.message });

  // Counts per board/status — PostgREST has no GROUP BY, so aggregate in JS.
  const { data: tasks, error: tErr } = await supabase
    .from('tbl_to_do')
    .select('summary_id, status')
    .eq('deleted_at', ACTIVE);
  if (tErr) return res.status(500).json({ error: tErr.message });

  const countMap = {};
  for (const { summary_id, status } of tasks) {
    if (!countMap[summary_id]) countMap[summary_id] = { pending: 0, in_progress: 0, done: 0, total: 0 };
    if (countMap[summary_id][status] !== undefined) countMap[summary_id][status] += 1;
    countMap[summary_id].total += 1;
  }
  res.json(boards.map(b => ({ ...b, counts: countMap[b.id] || { pending: 0, in_progress: 0, done: 0, total: 0 } })));
});

router.post('/', async (req, res) => {
  const { name, description = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const { data, error } = await supabase
    .from('tbl_to_do_summary')
    .insert({ name, description })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/:id', async (req, res) => {
  const { name, description } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (name !== undefined)        patch.name = name;
  if (description !== undefined) patch.description = description;

  const { data, error } = await supabase
    .from('tbl_to_do_summary')
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
    .from('tbl_to_do_summary')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', Number(req.params.id));
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
