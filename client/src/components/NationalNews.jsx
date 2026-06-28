import { useState, useEffect, useRef } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import './News.css'

export default function NationalNews() {
  const [visible, setVisible]     = useState([])
  const [reactions, setReactions] = useState({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [open, setOpen]           = useState(null)
  const [exiting, setExiting]     = useState({})  // id -> 'out' | 'exit-right' | 'exit-left'

  const reserveRef = useRef([])          // LIFO stack
  const initialRef = useRef(new Set())   // ids in first batch (for stagger anim)
  const dragRef    = useRef({})          // per-item pointer state
  const noClickRef = useRef(false)       // suppress click after swipe

  function load(silent = false) {
    if (!silent) { setLoading(true); setError(null) }

    fetch(`/api/news?count=20&_t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error(data.error || 'Bad response')
        const shuffled  = [...data].sort(() => Math.random() - .5)
        const showCount = Math.min(8, Math.max(1, shuffled.length - 2))
        const initial   = shuffled.slice(0, showCount)
        reserveRef.current = shuffled.slice(showCount).reverse()
        initialRef.current = new Set(initial.map(a => String(a.id)))
        setVisible(initial)
        setExiting({})
      })
      .catch(e => { if (!silent) setError(e.message) })
      .finally(() => { if (!silent) setLoading(false) })

    if (!silent) {
      fetch('/api/reactions')
        .then(r => r.json())
        .then(d => { if (d && typeof d === 'object') setReactions(d) })
        .catch(() => {})
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  function dismissItem(id, mode = 'out') {
    setOpen(o => o === id ? null : o)
    setExiting(e => ({ ...e, [id]: mode }))
    // exit-left/right: 220ms slide + 360ms collapse = 580ms total → wait 620ms
    // out: all transitions 440ms
    const wait = mode === 'out' ? 440 : 620
    setTimeout(() => {
      const next = reserveRef.current.pop() || null
      setVisible(v => {
        const filtered = v.filter(a => String(a.id) !== id)
        return next ? [...filtered, next] : filtered
      })
      setExiting(e => { const n = { ...e }; delete n[id]; return n })
    }, wait)
  }

  // response: -1 dislike, 0 skipped, 1 liked
  function saveInteraction(article, fields) {
    const id = String(article.id)
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        link: id, headline: article.title,
        source: article.src, summary: article.desc || '',
        ...fields,
      }),
    }).catch(() => {})
  }

  function react(article, type) {
    const id = String(article.id)
    if (exiting[id]) return
    const response = type === 'like' ? 1 : -1
    setReactions(r => ({ ...r, [id]: { ...r[id], response } }))
    dismissItem(id, 'out')
    saveInteraction(article, { response })
  }

  function recordSkip(article) {
    const id = String(article.id)
    setReactions(r => ({ ...r, [id]: { ...r[id], response: 0 } }))
    saveInteraction(article, { response: 0 })
  }

  function recordLinkOpen(article) {
    const id = String(article.id)
    setReactions(r => ({ ...r, [id]: { ...r[id], link_open: 1 } }))
    saveInteraction(article, { link_open: 1 })
  }

  function recordMoreClick(article) {
    const id = String(article.id)
    setReactions(r => ({ ...r, [id]: { ...r[id], clicked_on_more: 1 } }))
    saveInteraction(article, { clicked_on_more: 1 })
  }

  // ── Swipe gesture (pointer events) ──
  function onPointerDown(e, id) {
    if (exiting[id]) return
    dragRef.current[id] = { startX: e.clientX, startY: e.clientY, dx: 0, active: false, el: null }
  }

  function onPointerMove(e, id) {
    const d = dragRef.current[id]
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        d.active = true
        d.el     = e.currentTarget
        e.currentTarget.setPointerCapture(e.pointerId)
      } else return
    }
    d.dx = dx
    d.el.style.transform  = `translateX(${dx}px) rotate(${(dx * 0.03).toFixed(2)}deg)`
    d.el.style.opacity    = String(Math.max(0.15, 1 - Math.abs(dx) / 180))
    d.el.style.transition = 'none'
  }

  function onPointerUp(e, id) {
    const d = dragRef.current[id]
    if (!d) return
    delete dragRef.current[id]
    if (!d.active || !d.el) return

    noClickRef.current = true
    setTimeout(() => { noClickRef.current = false }, 100)

    const el = d.el

    if (Math.abs(d.dx) > 80) {
      // Clear inline styles so browser batches with the class addition below.
      // Browser will compute: old=translateX(dx), new=translateX(±110%) → transition fires.
      el.style.transition = ''
      el.style.transform  = ''
      el.style.opacity    = ''
      dismissItem(id, d.dx > 0 ? 'exit-right' : 'exit-left')
      const article = visible.find(a => String(a.id) === id)
      if (article) recordSkip(article)
    } else {
      el.style.transition = ''
      el.style.transform  = ''
      el.style.opacity    = ''
    }
  }

  function onPointerCancel(e, id) {
    const d = dragRef.current[id]
    if (!d) { delete dragRef.current[id]; return }
    if (d.el) {
      d.el.style.transition = ''
      d.el.style.transform  = ''
      d.el.style.opacity    = ''
    }
    delete dragRef.current[id]
  }

  return (
    <Card>
      <SectionHeader
        icon="📰"
        title="National News"
        right={<Chip color="var(--peach)">India</Chip>}
      />

      {loading && <p className="empty-msg">Loading headlines…</p>}

      {error && (
        <div className="news-error">
          <span>⚠️ {error}</span>
          <button className="btn-g" style={{ fontSize: 11 }} onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="empty-msg">No articles found.</p>
      )}

      <div className="news-list">
        {visible.map((a, i) => {
          const id        = String(a.id)
          const respVal   = reactions[id]?.response
          const rx        = respVal === 1 ? 'like' : respVal === -1 ? 'dislike' : null
          const isOpen  = open === id
          const exitCls = exiting[id] ? ` news-item--${exiting[id]}` : ''
          const delay   = initialRef.current.has(id) ? `${i * 40}ms` : '0ms'
          return (
            <div
              key={id}
              className={`news-item${exitCls}`}
              style={{ '--d': delay }}
              onAnimationEnd={e => { e.currentTarget.style.animation = 'none' }}
              onPointerDown={e => onPointerDown(e, id)}
              onPointerMove={e => onPointerMove(e, id)}
              onPointerUp={e => onPointerUp(e, id)}
              onPointerCancel={e => onPointerCancel(e, id)}
            >
              <div className="news-body" onClick={() => {
                if (noClickRef.current) return
                const willOpen = !isOpen
                setOpen(willOpen ? id : null)
                if (willOpen) recordMoreClick(a)
              }}>
                <a
                  className="news-title"
                  href={a.url || undefined}
                  target={a.url ? '_blank' : undefined}
                  rel="noreferrer"
                  onClick={e => {
                    if (noClickRef.current) { e.preventDefault(); return }
                    if (a.url) { e.stopPropagation(); recordLinkOpen(a) }
                  }}
                >{a.title}</a>
                <div className="news-meta">
                  <span>{a.src}</span>
                  <span className="dot">·</span>
                  <span>{a.time}</span>
                  <span className="dot">·</span>
                  <span className="news-toggle">{isOpen ? '▲ less' : '▼ more'}</span>
                </div>
                <div className={`news-desc-wrap${isOpen ? ' open' : ''}`}>
                  <div className="news-desc">{a.desc}</div>
                </div>
              </div>
              <div className="news-actions" onPointerDown={e => e.stopPropagation()}>
                <button className={`rb${rx === 'like'    ? ' liked'    : ''}`} onClick={() => react(a, 'like')}>👍</button>
                <button className={`rb${rx === 'dislike' ? ' disliked' : ''}`} onClick={() => react(a, 'dislike')}>👎</button>
                {a.url !== '#' && (
                  <a className="rb" href={a.url} target="_blank" rel="noreferrer" title="Open"
                    onClick={ev => { if (noClickRef.current) ev.preventDefault(); else recordLinkOpen(a) }}>🔗</a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
