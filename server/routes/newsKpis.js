const express = require('express');
const router = express.Router();
const db = require('../db');

// Live KPIs only — this list drives how many news panels the dashboard renders
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, logo, name, tag
    FROM tbl_news_kpi_data
    WHERE live = 1 AND deleted_at IS NULL
    ORDER BY id
  `).all();
  res.json(rows);
});

module.exports = router;
