import { useState, useEffect, useRef } from 'react'
import './QuoteBanner.css'

// One panel is rendered per active row returned by /api/quotes/active — the
// row count in tbl_quotes IS the panel count, nothing here is hardcoded to
// "developer"/"motivational". A failed fetch shows the real error instead of
// a fabricated quote, so a broken `api` column is visible, not masked.
async function loadPanels() {
  const activeRes = await fetch('/api/quotes/active')
  const rows = activeRes.ok ? await activeRes.json() : []

  return Promise.all(rows.map(async row => {
    try {
      const res = await fetch(`/api/quotes/${row.id}`)
      const d = await res.json()
      if (!res.ok || !d?.quote) throw new Error(d?.error || 'Unknown error')
      return { ...row, quote: d.quote, author: d.author, error: null }
    } catch (err) {
      return { ...row, quote: null, author: null, error: err.message }
    }
  }))
}

export default function QuoteBanner() {
  const ref = useRef()
  const [panels, setPanels]   = useState([])
  const [fade, setFade]       = useState(true)
  const [loading, setLoading] = useState(true)

  async function load() {
    const p = await loadPanels()
    setPanels(p)
    setLoading(false)
    setFade(true)
  }

  function shuffle() {
    setFade(false)
    setTimeout(load, 200)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const id = setInterval(shuffle, 12000)
    return () => clearInterval(id)
  }, [])

  function onMouseMove(e) {
    const el = ref.current
    const r  = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top)  / r.height
    el.style.setProperty('--rx', `${((px - 0.5) * 7).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(-(py - 0.5) * 7).toFixed(2)}deg`)
  }
  function onMouseLeave() {
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--ry', '0deg')
  }

  return (
    <div className="quote-card" ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      {panels.length === 0 && !loading && (
        <div className="quote-block">
          <div className="quote-txt" style={{ opacity: 0.6 }}>No active quote sources in tbl_quotes.</div>
        </div>
      )}

      {panels.map((p, i) => (
        <div key={p.id}>
          <div className="quote-block">
            <div className="quote-label" style={{ color: `var(--${p.color || 'accent'})` }}>
              {p.logo || '💬'} {p.title}
            </div>
            <div className="quote-txt" style={{ opacity: (fade && !loading) ? 1 : 0.35 }}>
              {loading
                ? 'Loading…'
                : p.error
                  ? `⚠ ${p.error}`
                  : `"${p.quote}"`}
            </div>
            <div className="quote-src">- {loading ? '…' : (p.error ? `source: ${p.title}` : (p.author || p.title))}</div>
          </div>
          {i < panels.length - 1 && <div className="quote-div" />}
        </div>
      ))}

      <div className="quote-foot">
        <button className="btn-g" onClick={shuffle}>🎲 Shuffle all</button>
      </div>
    </div>
  )
}
