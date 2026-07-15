const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/quotes — proxy to a random active quote source from tbl_quotes
router.get('/', async (req, res) => {
  const row = db.prepare(
    "SELECT api FROM tbl_quotes WHERE deleted_at='0000-00-00 00:00:00' ORDER BY RANDOM() LIMIT 1"
  ).get();

  if (!row) return res.status(503).json({ error: 'No active quote sources configured in tbl_quotes' });

  try {
    const response = await fetch(row.api, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    res.json(await response.json());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/quotes/sources — list all rows (active + soft-deleted)
router.get('/sources', (req, res) => {
  res.json(db.prepare('SELECT id, view_id, title, api, deleted_at, created_at, updated_at FROM tbl_quotes ORDER BY id').all());
});

module.exports = router;
