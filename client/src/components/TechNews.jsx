import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import useLocalStorage from '../hooks/useLocalStorage'
import './News.css'

function scoreColor(s) {
  if (s >= 600) return 'var(--red)'
  if (s >= 300) return 'var(--peach)'
  if (s >= 100) return 'var(--blue)'
  return 'var(--s1)'
}

export default function TechNews() {
  const [stories, setStories]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [reactions, setReactions] = useLocalStorage('hn_rx', {})

  useEffect(() => {
    fetch('/api/hn')
      .then(r => r.json())
      .then(setStories)
      .finally(() => setLoading(false))
  }, [])

  function react(id, type) {
    setReactions(r => ({ ...r, [id]: r[id] === type ? null : type }))
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
      {loading && <p className="empty-msg">Loading…</p>}
      <div className="hn-list">
        {stories.map(s => {
          const rx  = reactions[s.id]
          const col = scoreColor(s.score)
          const darkBadge = s.score >= 100
          return (
            <div key={s.id} className="hn-item">
              <div className="hn-body">
                <div className="hn-row">
                  <span
                    className="hn-score"
                    style={{
                      background: col,
                      color: darkBadge ? 'var(--crust)' : 'var(--text)',
                    }}
                  >
                    ▲ {s.score}
                  </span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hn-title">
                    {s.title}
                  </a>
                </div>
                <div className="hn-meta">
                  <span>by {s.by}</span>
                  {s.comments > 0 && <><span className="dot">·</span><span>💬 {s.comments}</span></>}
                  {s.domain && <><span className="dot">·</span><span>{s.domain}</span></>}
                </div>
              </div>
              <div className="hn-actions">
                <button className={`rb sm${rx === 'like' ? ' liked' : ''}`} onClick={() => react(s.id, 'like')}>
                  {rx === 'like' ? '👍' : '👍'}
                </button>
                <button className={`rb sm${rx === 'dislike' ? ' disliked' : ''}`} onClick={() => react(s.id, 'dislike')}>
                  {rx === 'dislike' ? '👎' : '👎'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
