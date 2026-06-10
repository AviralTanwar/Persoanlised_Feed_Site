import { useState, useEffect, useRef } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import './News.css'

export default function TechNews() {
  const [visible, setVisible]     = useState([])
  const [reactions, setReactions] = useState({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [open, setOpen]           = useState(null)
  const [exiting, setExiting]     = useState({})  // id -> 'out' | 'exit-right' | 'exit-left'

  const reserveRef = useRef([])
  const initialRef = useRef(new Set())
  const dragRef    = useRef({})
  const noClickRef = useRef(false)

  function load(silent = false) {
    if (!silent) { setLoading(true); setError(null) }

    fetch(`/api/hn?count=20&_t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error(data.error || 'Bad response')
        const shuffled  = [...data].sort(() => Math.random() - .5)
        const showCount = Math.min(8, Math.max(1, shuffled.length - 2))
        const initial   = shuffled.slice(0, showCount)
        reserveRef.current = shuffled.slice(showCount).reverse()
        initialRef.current = new Set(initial.map(s => String(s.id)))
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
    const wait = mode === 'out' ? 440 : 620
    setTimeout(() => {
      const next = reserveRef.current.pop() || null
      setVisible(v => {
        const filtered = v.filter(s => String(s.id) !== id)
        return next ? [...filtered, next] : filtered
      })
      setExiting(e => { const n = { ...e }; delete n[id]; return n })
    }, wait)
  }

  async function react(story, type) {
    const id = String(story.id)
    if (exiting[id]) return
    const current = reactions[id]?.reaction
    const next    = current === type ? null : type
    setReactions(r => ({ ...r, [id]: { reaction: next } }))
    dismissItem(id, 'out')
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: id, title: story.title,
        description: story.desc || '', source: story.src,
        url: story.url, reaction: next,
      }),
    }).catch(() => {})
  }

  // ── Swipe gesture ──
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
        icon="💻"
        title="Tech News"
        right={<Chip color="var(--blue)" small>Technology</Chip>}
      />

      {loading && <p className="empty-msg">Fetching tech headlines…</p>}

      {error && (
        <div className="news-error">
          <span>⚠️ {error}</span>
          <button className="btn-g" style={{ fontSize: 11 }} onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="empty-msg">No stories found.</p>
      )}

      <div className="news-list">
        {visible.map((s, i) => {
          const id      = String(s.id)
          const rx      = reactions[id]?.reaction
          const isOpen  = open === id
          const exitCls = exiting[id] ? ` news-item--${exiting[id]}` : ''
          const delay   = initialRef.current.has(id) ? `${i * 40}ms` : '0ms'
          return (
            <div
              key={id}
              className={`news-item${exitCls}`}
              style={{ '--d': delay }}
              onPointerDown={e => onPointerDown(e, id)}
              onPointerMove={e => onPointerMove(e, id)}
              onPointerUp={e => onPointerUp(e, id)}
              onPointerCancel={e => onPointerCancel(e, id)}
            >
              <div className="news-body" onClick={() => {
                if (noClickRef.current) return
                setOpen(isOpen ? null : id)
              }}>
                <a
                  className="news-title"
                  href={s.url !== '#' ? s.url : undefined}
                  target={s.url !== '#' ? '_blank' : undefined}
                  rel="noreferrer"
                  onClick={e => {
                    if (noClickRef.current) { e.preventDefault(); return }
                    if (s.url !== '#') e.stopPropagation()
                  }}
                >{s.title}</a>
                {/* Always show source · time · ▼ more to match National News */}
                <div className="news-meta">
                  <span>{s.src}</span>
                  <span className="dot">·</span>
                  <span>{s.time}</span>
                  <span className="dot">·</span>
                  <span className="news-toggle">{isOpen ? '▲ less' : '▼ more'}</span>
                </div>
                <div className={`news-desc-wrap${isOpen ? ' open' : ''}`}>
                  <div className="news-desc">{s.desc}</div>
                </div>
              </div>
              {/* No link button in Tech News per user preference */}
              <div className="news-actions" onPointerDown={e => e.stopPropagation()}>
                <button className={`rb${rx === 'like'    ? ' liked'    : ''}`} onClick={() => react(s, 'like')}>👍</button>
                <button className={`rb${rx === 'dislike' ? ' disliked' : ''}`} onClick={() => react(s, 'dislike')}>👎</button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
