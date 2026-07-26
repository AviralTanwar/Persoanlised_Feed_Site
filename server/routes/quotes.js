const express = require('express');
const router  = express.Router();
const supabase = require('../db');

const ACTIVE = '0000-00-00 00:00:00';

// Different upstream APIs use different field names — normalise to { quote, author }
function normalise(data, type) {
  if (!data || typeof data !== 'object') return { quote: String(data || ''), author: '' };
  const quote  = data.quote  || data.joke    || data.excuse  || data.text || data.content || '';
  const author = data.author || data.category || (type === 'developer' ? 'developerexcuses.com' : '');
  return { quote, author };
}

// developerexcuses.com has no JSON API — it returns an HTML page with the
// excuse embedded in the single <a> link on the page. Scrape it out.
function scrapeExcuse(html) {
  const match = html.match(/<a[^>]*rel="nofollow"[^>]*>([^<]*)<\/a>/i);
  return { quote: match ? match[1].trim() : '', author: 'developerexcuses.com' };
}

// GET /api/quotes/active — every active row's display metadata (no api url exposed).
// This is what makes the number of panels on the dashboard equal to the number
// of active rows in tbl_quotes — the frontend renders one block per row returned here.
router.get('/active', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_quotes')
    .select('id, type, title, logo, color')
    .eq('deleted_at', ACTIVE)
    .order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/quotes/sources — list all rows (admin/debug view, includes api + soft-deleted)
router.get('/sources', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_quotes')
    .select('id, view_id, type, title, logo, color, api, deleted_at, created_at, updated_at')
    .order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/quotes/:id — fetch live quote content for one specific tbl_quotes row.
// On any upstream failure this responds with an explicit error — it never
// fabricates a quote to paper over a broken/misconfigured api column.
router.get('/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'id must be numeric' });

  const { data: row, error } = await supabase
    .from('tbl_quotes')
    .select('id, type, title, logo, color, api')
    .eq('id', Number(req.params.id))
    .eq('deleted_at', ACTIVE)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: `No active quote source with id=${req.params.id}` });

  const meta = { id: row.id, title: row.title, logo: row.logo, color: row.color };

  try {
    const upstream = await fetch(row.api, { cache: 'no-store' });
    if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);
    const contentType = upstream.headers.get('content-type') || '';

    let result;
    if (contentType.includes('application/json')) {
      result = normalise(await upstream.json(), row.type);
    } else {
      result = scrapeExcuse(await upstream.text());
    }

    if (!result.quote) throw new Error(`api (${row.api}) returned no parseable quote`);
    res.json({ ...result, ...meta });
  } catch (err) {
    res.status(502).json({ error: err.message, ...meta });
  }
});

module.exports = router;
