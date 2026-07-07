const express = require('express');
const router  = express.Router();
const db      = require('../db');
const bcrypt  = require('bcryptjs');

router.post('/verify', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ ok: false, error: 'password required' });
  const cred = db.prepare(
    "SELECT password FROM tbl_credentials WHERE description = 'todo' AND deleted_at = '0000-00-00 00:00:00' LIMIT 1"
  ).get();
  if (!cred) return res.status(404).json({ ok: false, error: 'No credential found' });
  res.json({ ok: bcrypt.compareSync(password, cred.password) });
});

module.exports = router;
