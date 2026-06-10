import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import './News.css'

export default function TechNews() {
  const [stories, setStories]     = useState([])
  const [reactions, setReactions] = useState({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  function load() {
    setLoading(true)
    setError(null)

    fetch('/api/hn')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStories(data)
        else throw new Error(data.error || 'Bad response')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

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
        description: story.desc || '',
        source:      story.src,
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
        right={<Chip color="var(--blue)" small>NewsAPI Technology</Chip>}
      />

      {loading && <p className="empty-msg">Fetching tech headlines…</p>}

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
          const id = String(s.id)
          const rx = reactions[id]?.reaction
          return (
            <div key={id} className="hn-item">
              <div className="hn-body">
                <div className="hn-row">
                  <span className="hn-score" style={{ background: 'var(--s1)', color: 'var(--text)' }}>
                    {s.src}
                  </span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hn-title">{s.title}</a>
                </div>
                <div className="hn-meta">
                  {s.time && <span>{s.time}</span>}
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
