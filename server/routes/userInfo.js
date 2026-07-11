const express = require('express');
const router  = express.Router();
const db      = require('../db');

const SELECT = "SELECT user_id, firstname, lastname, username, title, location, timezone, salutation, tz_sign, tz_offset FROM tbl_user_info WHERE active = 1 AND deleted_at = '0000-00-00 00:00:00' LIMIT 1";

router.get('/', (req, res) => {
  const user = db.prepare(SELECT).get();
  if (!user) return res.status(404).json({ error: 'No user' });
  res.json(user);
});

router.patch('/', (req, res) => {
  const { firstname, lastname, username, title, location, timezone, salutation, tz_sign, tz_offset } = req.body;
  db.prepare(`UPDATE tbl_user_info SET
    firstname=COALESCE(?,firstname), lastname=COALESCE(?,lastname),
    username=COALESCE(?,username), title=COALESCE(?,title),
    location=COALESCE(?,location), timezone=COALESCE(?,timezone),
    salutation=COALESCE(?,salutation),
    tz_sign=COALESCE(?,tz_sign), tz_offset=COALESCE(?,tz_offset),
    updated_at=CURRENT_TIMESTAMP WHERE active=1 AND deleted_at='0000-00-00 00:00:00'`)
    .run(firstname??null, lastname??null, username??null, title??null,
         location??null, timezone??null, salutation??null,
         tz_sign??null, tz_offset??null);
  res.json(db.prepare(SELECT).get() || { error: 'No user' });
});

module.exports = router;
