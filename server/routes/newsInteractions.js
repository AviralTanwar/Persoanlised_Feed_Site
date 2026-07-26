const express = require('express');
const router = express.Router();
const supabase = require('../db');

// PostgREST returns at most 1000 rows per request; page through to get all.
async function fetchAllReactions(kpiId) {
  const PAGE = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    let q = supabase.from('tbl_news_data').select('*').is('deleted_at', null);
    if (kpiId != null) q = q.eq('news_api_id', kpiId);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// GET all interactions as a map: { [link]: {...row} }. Optional ?kpiId= scopes it.
router.get('/', async (req, res) => {
  const kpiId = req.query.kpiId ? Number(req.query.kpiId) : null;
  try {
    const rows = await fetchAllReactions(kpiId);
    const map = {};
    for (const r of rows) map[r.link] = r;
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const coalesce = (a, b) => (a != null ? a : b);

// POST upsert on `link`. supabase-js upsert() replaces columns, but the old SQL
// preserved some via COALESCE, so we read the existing row and merge by hand:
//   • headline/source/summary  → always take the incoming value
//   • news_api_id / news_date   → set once (keep existing if already set)
//   • response/link_open/clicked_on_more/live/shown → update if provided, else keep
router.post('/', async (req, res) => {
  const {
    link, headline, source = '', summary = '', news_api_id = null,
    response = null, link_open = null, clicked_on_more = null,
    live = null, news_date = null, shown = null,
  } = req.body;
  if (!link || !headline) return res.status(400).json({ error: 'link and headline required' });

  try {
    const { data: existing, error: selErr } = await supabase
      .from('tbl_news_data').select('*').eq('link', link).maybeSingle();
    if (selErr) throw new Error(selErr.message);

    const now = new Date().toISOString();
    let row;

    if (!existing) {
      const insertRow = {
        link, headline, source, summary, news_api_id,
        response:        coalesce(response, 0),
        link_open:       coalesce(link_open, 0),
        clicked_on_more: coalesce(clicked_on_more, 0),
        live:            coalesce(live, 1),
        news_date,
        shown:           coalesce(shown, 0),
        updated_at:      now,
      };
      const { data, error } = await supabase
        .from('tbl_news_data').insert(insertRow).select().single();
      if (error) throw new Error(error.message);
      row = data;
    } else {
      const updateRow = {
        headline, source, summary,
        news_api_id:     coalesce(existing.news_api_id, news_api_id),
        response:        coalesce(response, existing.response),
        link_open:       coalesce(link_open, existing.link_open),
        clicked_on_more: coalesce(clicked_on_more, existing.clicked_on_more),
        live:            coalesce(live, existing.live),
        news_date:       coalesce(existing.news_date, news_date),
        shown:           coalesce(shown, existing.shown),
        updated_at:      now,
      };
      const { data, error } = await supabase
        .from('tbl_news_data').update(updateRow).eq('link', link).select().single();
      if (error) throw new Error(error.message);
      row = data;
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
