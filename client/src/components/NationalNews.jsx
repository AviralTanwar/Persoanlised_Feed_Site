import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import './News.css'

export default function NationalNews() {
  const [articles, setArticles]   = useState([])
  const [reactions, setReactions] = useState({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [open, setOpen]           = useState(null)

  function load() {
    setLoading(true)
    setError(null)

    // Articles are critical — load independently
    fetch('/api/news')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setArticles(data)
        else throw new Error(data.error || 'Bad response from /api/news')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    // Reactions are non-critical — failure doesn't block articles
    fetch('/api/reactions')
      .then(r => r.json())
      .then(data => { if (data && typeof data === 'object') setReactions(data) })
      .catch(() => {}) // reactions failing is fine — just show no reactions
  }

  useEffect(() => { load() }, [])

  async function react(article, type) {
    const current = reactions[article.id]?.reaction
    const next    = current === type ? null : type

    setReactions(r => ({ ...r, [article.id]: { ...r[article.id], reaction: next } }))

    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id:  article.id,
        title:       article.title,
        description: article.desc,
        source:      article.src,
        url:         article.url,
        reaction:    next,
      }),
    }).catch(() => {}) // fire-and-forget — UI already updated optimistically
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

      {!loading && !error && articles.length === 0 && (
        <p className="empty-msg">No articles found.</p>
      )}

      <div className="news-list">
        {articles.map((a, i) => {
          const rx     = reactions[a.id]?.reaction
          const isOpen = open === a.id
          return (
            <div key={a.id} className="news-item" style={{ '--d': `${i * 40}ms` }}>
              <div className="news-body" onClick={() => setOpen(isOpen ? null : a.id)}>
                <div className="news-title">{a.title}</div>
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
              <div className="news-actions">
                <button className={`rb${rx === 'like'    ? ' liked'    : ''}`} onClick={() => react(a, 'like')}>👍</button>
                <button className={`rb${rx === 'dislike' ? ' disliked' : ''}`} onClick={() => react(a, 'dislike')}>👎</button>
                {a.url !== '#' && (
                  <a className="rb" href={a.url} target="_blank" rel="noreferrer" title="Open">🔗</a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
