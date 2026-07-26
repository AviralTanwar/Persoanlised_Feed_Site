const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Live KPIs only - this list drives how many news panels the dashboard renders
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_news_kpi_data')
    .select('id, logo, name, tag')
    .eq('live', 1)
    .is('deleted_at', null)
    .order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
