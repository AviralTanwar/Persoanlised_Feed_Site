const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const { city, country = 'IN', units = 'metric' } = req.query;

  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&units=${units}&appid=${process.env.OPENWEATHER_API_KEY}`;

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
