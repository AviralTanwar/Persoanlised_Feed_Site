const express = require('express');
const router  = express.Router();
const supabase = require('../db');
const bcrypt  = require('bcryptjs');

const ACTIVE = '0000-00-00 00:00:00';

router.post('/verify', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ ok: false, error: 'password required' });

  const { data, error } = await supabase
    .from('tbl_credentials')
    .select('password')
    .eq('description', 'todo')
    .eq('deleted_at', ACTIVE)
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  if (!data) return res.status(404).json({ ok: false, error: 'No credential found' });

  res.json({ ok: bcrypt.compareSync(password, data.password) });
});

module.exports = router;
