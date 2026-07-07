const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  const user = db.prepare(
    "SELECT user_id, firstname, lastname, username, title FROM tbl_user_info WHERE active = 1 AND deleted_at = '0000-00-00 00:00:00' LIMIT 1"
  ).get();
  if (!user) return res.status(404).json({ error: 'No user' });
  res.json(user);
});

module.exports = router;
