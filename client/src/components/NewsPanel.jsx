import { useState, useEffect, useRef } from 'react'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import './News.css'

export default function NewsPanel({ kpi }) {
  const [visible, setVisible]   = useState([])
  const [tier, setTier]         = useState(null)
  const [reactions, setReactions] = useState({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [open, setOpen]         = useState(null)
  const [exiting, setExiting]   = useState({})  // id -> 'out' | 'exit-right' | 'exit-left'
  const [reviewMode, setReviewMode] = useState(false)

  const reserveRef     = useRef([])
  const initialRef     = useRef(new Set())
  const dragRef        = useRef({})
  const noClickRef     = useRef(false)
  const prevVisibleRef = useRef([])

  // ── Helpers shared by fresh + review ──────────────────────────────────────

  function applyBatch(articles) {
    const shuffled  = [...articles].sort(() => Math.random() - .5)
    const showCount = Math.min(8, shuffled.length)
    const initial   = shuffled.slice(0, showCount)
    reserveRef.current = shuffled.slice(showCount).reverse()
    initialRef.current = new Set(initial.map(a => String(a.id)))
    setVisible(initial)
    setExiting({})
  }

  // ── Fresh news load ────────────────────────────────────────────────────────

  function load(silent = false) {
    if (!silent) { setLoading(true); setError(null) }

    fetch(`/api/news/${kpi.id}?count=20&_t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (!data || !Array.isArray(data.articles)) throw new Error(data?.error || 'Bad response')
        setTier(data.tier)
        applyBatch(data.articles)
      })
      .catch(e => { if (!silent) setError(e.message) })
      .finally(() => { if (!silent) setLoading(false) })

    if (!silent) {
      fetch(`/api/reactions?kpiId=${kpi.id}`)
        .then(r => r.json())
        .then(d => { if (d && typeof d === 'object') setReactions(d) })
        .catch(() => {})
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [kpi.id])

  // Track which articles are live on screen → write to DB for dedup/analytics
  useEffect(() => {
    const prevIds = new Set(prevVisibleRef.current.map(a => String(a.id)))
    const nextIds = new Set(visible.map(a => String(a.id)))
    visible.forEach(a => { if (!prevIds.has(String(a.id))) markLive(a, 1) })
    prevVisibleRef.current.forEach(a => { if (!nextIds.has(String(a.id))) markLive(a, 0) })
    prevVisibleRef.current = visible
  }, [visible])

  // ── Review mode (old news) ─────────────────────────────────────────────────

  function openReview() {
    setLoading(true)
    fetch(`/api/news/${kpi.id}/old?count=20`)
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d) || d.length === 0) return  // nothing to review
        setReviewMode(true)
        applyBatch(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // ── Dismiss (shared by fresh + review) ────────────────────────────────────

  function dismissItem(id, mode = 'out') {
    setOpen(o => o === id ? null : o)
    setExiting(e => ({ ...e, [id]: mode }))
    const wait = mode === 'out' ? 440 : 620
    setTimeout(() => {
      const next = reserveRef.current.pop() || null
      const remaining  = visible.filter(a => String(a.id) !== id)
      const nextVisible = next ? [...remaining, next] : remaining
      setVisible(nextVisible)
      setExiting(e => { const n = { ...e }; delete n[id]; return n })
      if (nextVisible.length === 0) {
        if (reviewMode) {
          // Review batch exhausted - return to "caught up" state
          setReviewMode(false)
        } else {
          load()
        }
      }
    }, wait)
  }

  // ── Interactions ──────────────────────────────────────────────────────────

  function saveInteraction(article, fields) {
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        link: String(article.id), headline: article.title,
        source: article.src, summary: article.desc || '',
        news_api_id: kpi.id,
        ...fields,
      }),
    }).catch(() => {})
  }

  function markLive(article, live) {
    saveInteraction(article, { live, news_date: article.newsDate || null })
  }

  function react(article, type) {
    if (noClickRef.current) return
    const id = String(article.id)
    if (exiting[id]) return
    const response = type === 'like' ? 1 : -1
    setReactions(r => ({ ...r, [id]: { ...r[id], response } }))
    dismissItem(id, 'out')
    saveInteraction(article, { response, shown: type === 'like' ? 3 : 4 })
  }

  function recordSkip(article) {
    setReactions(r => ({ ...r, [String(article.id)]: { ...r[String(article.id)], response: 0 } }))
    saveInteraction(article, { response: 0, shown: 5 })
  }

  function recordLinkOpen(article) {
    setReactions(r => ({ ...r, [String(article.id)]: { ...r[String(article.id)], link_open: 1 } }))
    saveInteraction(article, { link_open: 1, shown: 1 })
  }

  function recordMoreClick(article) {
    setReactions(r => ({ ...r, [String(article.id)]: { ...r[String(article.id)], clicked_on_more: 1 } }))
    saveInteraction(article, { clicked_on_more: 1, shown: 2 })
  }

  // ── Swipe gesture ─────────────────────────────────────────────────────────

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

  // ── Article renderer (identical for fresh + review) ───────────────────────

  function renderArticle(a, index) {
    const id      = String(a.id)
    const respVal = reactions[id]?.response
    const rx      = respVal === 1 ? 'like' : respVal === -1 ? 'dislike' : null
    const isOpen  = open === id
    const exitCls = exiting[id] ? ` news-item--${exiting[id]}` : ''
    const delay   = initialRef.current.has(id) ? `${index * 40}ms` : '0ms'

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
            draggable="false"
            href={a.url || undefined}
            target={a.url ? '_blank' : undefined}
            rel="noreferrer"
            onClick={e => {
              if (noClickRef.current) { e.preventDefault(); return }
              if (a.url) { e.stopPropagation(); recordLinkOpen(a) }
            }}
          >{a.title}</a>
          <div className="news-meta">
            <span className="news-source">{a.src}</span>
            <span className="dot">·</span>
            <span>{a.time}</span>
          </div>
          <div className={`news-desc-wrap${isOpen ? ' open' : ''}`}>
            <div className="news-desc">{a.desc}</div>
          </div>
        </div>
        <div className="news-actions">
          <button
            className="news-more-btn"
            onClick={() => {
              if (noClickRef.current) return
              const willOpen = !isOpen
              setOpen(willOpen ? id : null)
              if (willOpen) recordMoreClick(a)
            }}
          >
            {isOpen ? '▲ Less' : '▼ More'}
          </button>
          <div className="news-action-group">
            <button className={`rb${rx === 'like'    ? ' liked'    : ''}`} title="Like"    onClick={() => react(a, 'like')}>👍</button>
            <button className={`rb${rx === 'dislike' ? ' disliked' : ''}`} title="Dislike" onClick={() => react(a, 'dislike')}>👎</button>
            {a.url !== '#' && (
              <a className="rb rb-open" draggable="false" href={a.url} target="_blank" rel="noreferrer" title="Open article"
                onClick={ev => { if (noClickRef.current) ev.preventDefault(); else recordLinkOpen(a) }}>🔗 Open</a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="news-panel">
      <SectionHeader
        icon={kpi.logo}
        title={kpi.name}
        right={kpi.tag ? <Chip color="var(--peach)" small>{kpi.tag}</Chip> : null}
      />

      {reviewMode && visible.length > 0 && (
        <div className="news-old-banner">
          📦 Showing Old News
          <button className="btn-g" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={() => { setReviewMode(false); load() }}>
            ✕ Back to live feed
          </button>
        </div>
      )}

      {loading && <p className="empty-msg">Loading headlines…</p>}

      {error && (
        <div className="news-error">
          <span>⚠️ {error}</span>
          <button className="btn-g" style={{ fontSize: 11 }} onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="news-exhausted">
          <p className="empty-msg">You're all caught up - no new stories right now.</p>
          <button className="btn-g" onClick={openReview}>↺ Review old news</button>
        </div>
      )}

      <div className="news-list">
        {visible.map((a, i) => renderArticle(a, i))}
      </div>
    </div>
  )
}
