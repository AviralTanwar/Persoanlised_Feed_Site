const express = require('express')
const router  = express.Router()
const db      = require('../db')

router.get('/', (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM tbl_view_kpi WHERE deleted_at='0000-00-00 00:00:00' ORDER BY rank ASC"
  ).all()
  res.json(rows)
})

router.patch('/:id', (req, res) => {
  const { name, description, rank } = req.body
  db.prepare(`UPDATE tbl_view_kpi SET
    name=COALESCE(?,name), description=COALESCE(?,description),
    rank=COALESCE(?,rank), updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name ?? null, description ?? null, rank ?? null, Number(req.params.id))
  res.json(db.prepare('SELECT * FROM tbl_view_kpi WHERE id=?').get(Number(req.params.id)))
})

module.exports = router
