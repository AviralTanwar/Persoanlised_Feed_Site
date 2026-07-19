const express = require('express');
const router = express.Router();
const db = require('../db');

const MAX_CITIES = 6;

const SUGGESTIONS = [
  { city: 'New Delhi',  country: 'IN' },
  { city: 'Gurugram',   country: 'IN' },
  { city: 'Bengaluru',  country: 'IN' },
  { city: 'Mumbai',     country: 'IN' },
  { city: 'Lucknow',    country: 'IN' },
  { city: 'Jaipur',     country: 'IN' },
  { city: 'Pune',       country: 'IN' },
  { city: 'Chandigarh', country: 'IN' },
  { city: 'Hyderabad',  country: 'IN' },
  { city: 'Kolkata',    country: 'IN' },
];

router.get('/', (req, res) => {
  const cities = db.prepare(
    'SELECT * FROM tbl_weathers_card WHERE deleted_at IS NULL ORDER BY permanent DESC, id ASC'
  ).all();
  res.json({ cities, max: MAX_CITIES, suggestions: SUGGESTIONS });
});

router.post('/', (req, res) => {
  const { city, country = 'IN', units = 'metric' } = req.body;
  if (!city || !city.trim()) return res.status(400).json({ error: 'city is required' });

  const { n } = db.prepare('SELECT COUNT(*) as n FROM tbl_weathers_card WHERE deleted_at IS NULL').get();
  if (n >= MAX_CITIES) return res.status(400).json({ error: `Maximum of ${MAX_CITIES} cities reached` });

  const exists = db.prepare(
    'SELECT id FROM tbl_weathers_card WHERE city = ? AND deleted_at IS NULL'
  ).get(city.trim());
  if (exists) return res.status(409).json({ error: 'City already added' });

  const info = db.prepare(
    'INSERT INTO tbl_weathers_card (city, country, units, permanent) VALUES (?, ?, ?, 0)'
  ).run(city.trim(), country, units);

  res.status(201).json(db.prepare('SELECT * FROM tbl_weathers_card WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tbl_weathers_card WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'City not found' });
  if (row.permanent) return res.status(403).json({ error: 'This city is permanent and cannot be removed' });

  db.prepare('UPDATE tbl_weathers_card SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
