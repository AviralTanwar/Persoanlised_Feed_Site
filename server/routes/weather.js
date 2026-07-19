const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { city, country = 'IN', units = 'metric' } = req.query;

  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  const source = db.prepare(
    "SELECT api FROM tbl_weathers WHERE deleted_at='0000-00-00 00:00:00' ORDER BY id LIMIT 1"
  ).get();
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
