const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  const user = db.prepare(
    "SELECT user_id, firstname, lastname, username, title, location, timezone, salutation FROM tbl_user_info WHERE active = 1 AND deleted_at = '0000-00-00 00:00:00' LIMIT 1"
  ).get();
  if (!user) return res.status(404).json({ error: 'No user' });
  res.json(user);
});

router.patch('/', (req, res) => {
  const { firstname, lastname, username, title, location, timezone, salutation } = req.body;
  db.prepare(`UPDATE tbl_user_info SET
    firstname=COALESCE(?,firstname), lastname=COALESCE(?,lastname),
    username=COALESCE(?,username), title=COALESCE(?,title),
    location=COALESCE(?,location), timezone=COALESCE(?,timezone),
    salutation=COALESCE(?,salutation),
    updated_at=CURRENT_TIMESTAMP WHERE active=1 AND deleted_at='0000-00-00 00:00:00'`)
    .run(firstname??null, lastname??null, username??null, title??null, location??null, timezone??null, salutation??null);
  const user = db.prepare(
    "SELECT user_id, firstname, lastname, username, title, location, timezone, salutation FROM tbl_user_info WHERE active=1 AND deleted_at='0000-00-00 00:00:00' LIMIT 1"
  ).get();
  res.json(user || { error: 'No user' });
});

module.exports = router;
