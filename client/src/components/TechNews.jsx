import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import './News.css'

function scoreColor(s) {
  if (s >= 600) return 'var(--red)'
  if (s >= 300) return 'var(--peach)'
  if (s >= 100) return 'var(--blue)'
  return 'var(--s1)'
}

export default function TechNews() {
  const [stories, setStories]     = useState([])
  const [reactions, setReactions] = useState({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  function load() {
    setLoading(true)
    setError(null)

    // Stories are critical — load independently
    fetch('/api/hn')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStories(data)
        else throw new Error(data.error || 'Bad response from /api/hn')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    // Reactions non-critical
    fetch('/api/reactions')
      .then(r => r.json())
      .then(data => { if (data && typeof data === 'object') setReactions(data) })
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  async function react(story, type) {
    const id      = String(story.id)
    const current = reactions[id]?.reaction
    const next    = current === type ? null : type

    setReactions(r => ({ ...r, [id]: { ...r[id], reaction: next } }))

    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id:  id,
        title:       story.title,
        description: '',
        source:      'Hacker News',
        url:         story.url,
        reaction:    next,
      }),
    }).catch(() => {})
  }

  return (
    <Card>
      <SectionHeader
        icon="💻"
        title="Tech News"
        right={
          <a href="https://news.ycombinator.com" target="_blank" rel="noreferrer">
            <Chip color="var(--peach)" small>Hacker News ↗</Chip>
          </a>
        }
      />

      {loading && <p className="empty-msg">Fetching top stories…</p>}

      {error && (
        <div className="news-error">
          <span>⚠️ {error}</span>
          <button className="btn-g" style={{ fontSize: 11 }} onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && stories.length === 0 && (
        <p className="empty-msg">No stories found.</p>
      )}

      <div className="hn-list">
        {stories.map(s => {
          const id  = String(s.id)
          const rx  = reactions[id]?.reaction
          const col = scoreColor(s.score)
          return (
            <div key={s.id} className="hn-item">
              <div className="hn-body">
                <div className="hn-row">
                  <span className="hn-score" style={{ background: col, color: s.score >= 100 ? 'var(--crust)' : 'var(--text)' }}>
                    ▲ {s.score}
                  </span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hn-title">{s.title}</a>
                </div>
                <div className="hn-meta">
                  <span>by {s.by}</span>
                  {s.comments > 0 && <><span className="dot">·</span><span>💬 {s.comments}</span></>}
                  {s.domain && <><span className="dot">·</span><span>{s.domain}</span></>}
                </div>
              </div>
              <div className="hn-actions">
                <button className={`rb sm${rx === 'like'    ? ' liked'    : ''}`} onClick={() => react(s, 'like')}>👍</button>
                <button className={`rb sm${rx === 'dislike' ? ' disliked' : ''}`} onClick={() => react(s, 'dislike')}>👎</button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
