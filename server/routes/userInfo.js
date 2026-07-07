const express = require('express');
const router  = express.Router();
const db      = require('../db');
const bcrypt  = require('bcryptjs');

// GET /api/user-info — returns the single active user, or 404 if none set up yet
router.get('/', (req, res) => {
  const user = db.prepare(
    "SELECT * FROM tbl_user_info WHERE active = 1 AND deleted_at = '0000-00-00 00:00:00' LIMIT 1"
  ).get();
  if (!user) return res.status(404).json({ error: 'No user' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// POST /api/user-info/setup — first-run only: create user profile + to-do credential
router.post('/setup', (req, res) => {
  const existing = db.prepare(
    "SELECT user_id FROM tbl_user_info WHERE deleted_at = '0000-00-00 00:00:00' LIMIT 1"
  ).get();
  if (existing) return res.status(409).json({ error: 'User already set up' });

  const { firstname, lastname, username = '', title = '', description = '', number = '', email = '', password } = req.body;
  if (!firstname || !lastname) return res.status(400).json({ error: 'firstname and lastname required' });
  if (!password) return res.status(400).json({ error: 'password required' });

  const hash = bcrypt.hashSync(password, 12);

  const info = db.prepare(
    'INSERT INTO tbl_user_info (firstname, lastname, username, title, description, number, email) VALUES (?,?,?,?,?,?,?)'
  ).run(firstname, lastname, username, title, description, number, email);

  db.prepare(
    "INSERT INTO tbl_credentials (description, user_name, password) VALUES ('todo', ?, ?)"
  ).run(username || firstname, hash);

  const user = db.prepare('SELECT * FROM tbl_user_info WHERE user_id = ?').get(info.lastInsertRowid);
  res.json(user);
});

// PATCH /api/user-info/:id — update profile fields
router.patch('/:id', (req, res) => {
  const { firstname, lastname, username, title, description, number, email } = req.body;
  db.prepare(`
    UPDATE tbl_user_info SET
      firstname   = COALESCE(?, firstname),
      lastname    = COALESCE(?, lastname),
      username    = COALESCE(?, username),
      title       = COALESCE(?, title),
      description = COALESCE(?, description),
      number      = COALESCE(?, number),
      email       = COALESCE(?, email),
      updated_at  = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(firstname, lastname, username, title, description, number, email, Number(req.params.id));
  res.json(db.prepare('SELECT * FROM tbl_user_info WHERE user_id = ?').get(Number(req.params.id)));
});

module.exports = router;
