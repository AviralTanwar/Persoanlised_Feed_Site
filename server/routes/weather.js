const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/', async (req, res) => {
  const { city, country = 'IN', units = 'metric' } = req.query;

  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  const { data: source, error: srcErr } = await supabase
    .from('tbl_weathers')
    .select('api')
    .eq('deleted_at', '0000-00-00 00:00:00')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (srcErr) return res.status(500).json({ error: srcErr.message });
  if (!source) return res.status(503).json({ error: 'No active weather source in tbl_weathers' });

  const url = `${source.api}?q=${city},${country}&units=${units}&appid=${process.env.OPENWEATHER_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach weather API' });
  }
});

module.exports = router;
