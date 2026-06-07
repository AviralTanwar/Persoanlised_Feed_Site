const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const url = process.env.QUOTES_API_URL;
  if (!url) return res.status(503).json({ error: 'QUOTES_API_URL not set in .env' });

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
