const express = require('express')
const router  = express.Router()
const supabase = require('../db')

const ACTIVE = '0000-00-00 00:00:00'

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tbl_view_kpi')
    .select('*')
    .eq('deleted_at', ACTIVE)
    .order('rank', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.patch('/:id', async (req, res) => {
  const { name, description, rank } = req.body
  // Only touch fields that were actually provided (mirrors the old COALESCE)
  const patch = { updated_at: new Date().toISOString() }
  if (name !== undefined)        patch.name = name
  if (description !== undefined) patch.description = description
  if (rank !== undefined)        patch.rank = rank

  const { data, error } = await supabase
    .from('tbl_view_kpi')
    .update(patch)
    .eq('id', Number(req.params.id))
    .select()
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

module.exports = router
