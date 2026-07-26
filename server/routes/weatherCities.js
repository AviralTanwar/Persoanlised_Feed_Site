const express = require('express');
const router = express.Router();
const supabase = require('../db');

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

// tbl_weathers_card uses NULL (not the string sentinel) for "not deleted".
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_weathers_card')
    .select('*')
    .is('deleted_at', null)
    .order('permanent', { ascending: false })
    .order('id', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ cities: data, max: MAX_CITIES, suggestions: SUGGESTIONS });
});

router.post('/', async (req, res) => {
  const { city, country = 'IN', units = 'metric' } = req.body;
  if (!city || !city.trim()) return res.status(400).json({ error: 'city is required' });

  const { count, error: cErr } = await supabase
    .from('tbl_weathers_card')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (cErr) return res.status(500).json({ error: cErr.message });
  if (count >= MAX_CITIES) return res.status(400).json({ error: `Maximum of ${MAX_CITIES} cities reached` });

  const { data: exists, error: eErr } = await supabase
    .from('tbl_weathers_card')
    .select('id')
    .eq('city', city.trim())
    .is('deleted_at', null)
    .maybeSingle();
  if (eErr) return res.status(500).json({ error: eErr.message });
  if (exists) return res.status(409).json({ error: 'City already added' });

  const { data, error } = await supabase
    .from('tbl_weathers_card')
    .insert({ city: city.trim(), country, units, permanent: 0 })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.delete('/:id', async (req, res) => {
  const { data: row, error: rErr } = await supabase
    .from('tbl_weathers_card')
    .select('*')
    .eq('id', Number(req.params.id))
    .is('deleted_at', null)
    .maybeSingle();
  if (rErr) return res.status(500).json({ error: rErr.message });
  if (!row) return res.status(404).json({ error: 'City not found' });
  if (row.permanent) return res.status(403).json({ error: 'This city is permanent and cannot be removed' });

  const { error } = await supabase
    .from('tbl_weathers_card')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', Number(req.params.id));
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

module.exports = router;
