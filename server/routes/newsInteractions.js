const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all interactions as a map: { [link]: { headline, source, summary, response, link_open, ... } }
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tbl_national_news WHERE deleted_at IS NULL').all();
  const map = {};
  for (const r of rows) map[r.link] = r;
  res.json(map);
});

// POST upsert — accepts partial updates.
// response: -1 dislike, 0 skipped, 1 liked.
// link_open: 1 once the article link has been opened.
// clicked_on_more: 1 once the "more" description toggle has been expanded.
// live: 1 while the article is currently rendered on the dashboard, 0 once it leaves screen.
// news_date: the article's actual publish date (set once, on first insert).
// shown: most recent interaction code — 0 displayed/none, 1 link, 2 more, 3 like, 4 dislike, 5 removed.
router.post('/', (req, res) => {
  const {
    link, headline, source = '', summary = '',
    response = null, link_open = null, clicked_on_more = null,
    live = null, news_date = null, shown = null,
  } = req.body;
  if (!link || !headline) return res.status(400).json({ error: 'link and headline required' });

  db.prepare(`
    INSERT INTO tbl_national_news
      (link, headline, source, summary, response, link_open, clicked_on_more, live, news_date, shown, updated_at)
    VALUES
      (@link, @headline, @source, @summary, COALESCE(@response, 0), COALESCE(@link_open, 0),
       COALESCE(@clicked_on_more, 0), COALESCE(@live, 1), @news_date, COALESCE(@shown, 0), CURRENT_TIMESTAMP)
    ON CONFLICT(link) DO UPDATE SET
      headline        = excluded.headline,
      source          = excluded.source,
      summary         = excluded.summary,
      response        = COALESCE(@response, tbl_national_news.response),
      link_open       = COALESCE(@link_open, tbl_national_news.link_open),
      clicked_on_more = COALESCE(@clicked_on_more, tbl_national_news.clicked_on_more),
      live            = COALESCE(@live, tbl_national_news.live),
      news_date       = COALESCE(tbl_national_news.news_date, @news_date),
      shown           = COALESCE(@shown, tbl_national_news.shown),
      updated_at      = CURRENT_TIMESTAMP
  `).run({ link, headline, source, summary, response, link_open, clicked_on_more, live, news_date, shown });

  const row = db.prepare('SELECT * FROM tbl_national_news WHERE link = ?').get(link);
  res.json(row);
});

module.exports = router;
