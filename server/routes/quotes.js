const express = require('express');
const router  = express.Router();
const db      = require('../db');

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

// GET /api/quotes?type=motivational|developer
// Response includes title/logo/color from tbl_quotes so the panel's label,
// icon and accent are fully DB-driven — QuoteBanner has no per-type hardcoding.
router.get('/', async (req, res) => {
  const type = req.query.type || 'motivational';
  const row  = db.prepare(
    "SELECT title, logo, color, api FROM tbl_quotes WHERE type=? AND deleted_at='0000-00-00 00:00:00' ORDER BY RANDOM() LIMIT 1"
  ).get(type);

  if (!row) return res.status(503).json({ error: `No active ${type} quote source in tbl_quotes` });
  const meta = { title: row.title, logo: row.logo, color: row.color };

  try {
    const upstream = await fetch(row.api, { cache: 'no-store' });
    if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);
    const contentType = upstream.headers.get('content-type') || '';

    let result;
    if (contentType.includes('application/json')) {
      result = normalise(await upstream.json(), type);
    } else {
      result = scrapeExcuse(await upstream.text());
    }

    if (!result.quote) throw new Error('Could not parse a quote from upstream response');
    res.json({ ...result, ...meta });
  } catch (err) {
    res.status(502).json({ error: err.message, ...meta });
  }
});

// GET /api/quotes/sources — list all rows
router.get('/sources', (req, res) => {
  res.json(db.prepare(
    'SELECT id, view_id, type, title, logo, color, api, deleted_at, created_at, updated_at FROM tbl_quotes ORDER BY id'
  ).all());
});

module.exports = router;
