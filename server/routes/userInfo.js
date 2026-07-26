const express = require('express');
const router  = express.Router();
const supabase = require('../db');

const ACTIVE = '0000-00-00 00:00:00';
const COLS = 'user_id, firstname, lastname, username, title, location, timezone, salutation, tz_sign, tz_offset';

async function getUser() {
  return supabase
    .from('tbl_user_info')
    .select(COLS)
    .eq('active', 1)
    .eq('deleted_at', ACTIVE)
    .limit(1)
    .maybeSingle();
}

router.get('/', async (req, res) => {
  const { data, error } = await getUser();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No user' });
  res.json(data);
});

router.patch('/', async (req, res) => {
  const fields = ['firstname', 'lastname', 'username', 'title', 'location', 'timezone', 'salutation', 'tz_sign', 'tz_offset'];
  const patch = { updated_at: new Date().toISOString() };
  for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];

  const { error: upErr } = await supabase
    .from('tbl_user_info')
    .update(patch)
    .eq('active', 1)
    .eq('deleted_at', ACTIVE);
  if (upErr) return res.status(500).json({ error: upErr.message });

  const { data, error } = await getUser();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || { error: 'No user' });
});

module.exports = router;
