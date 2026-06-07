import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import useLocalStorage from '../hooks/useLocalStorage'
import './News.css'

export default function NationalNews() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [open, setOpen]         = useState(null)
  const [reactions, setReactions] = useLocalStorage('news_rx', {})

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(setArticles)
      .finally(() => setLoading(false))
  }, [])

  function react(id, type) {
    setReactions(r => ({ ...r, [id]: r[id] === type ? null : type }))
  }

  return (
    <Card>
      <SectionHeader
        icon="📰"
        title="National News"
        right={<Chip color="var(--peach)">India</Chip>}
      />
      {loading && <p className="empty-msg">Loading…</p>}
      <div className="news-list">
        {articles.map((a, i) => {
          const rx     = reactions[a.id]
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
                <button className={`rb${rx === 'like' ? ' liked' : ''}`} onClick={() => react(a.id, 'like')}>👍</button>
                <button className={`rb${rx === 'dislike' ? ' disliked' : ''}`} onClick={() => react(a.id, 'dislike')}>👎</button>
                {a.url !== '#' && (
                  <a className="rb" href={a.url} target="_blank" rel="noreferrer" title="Open article">🔗</a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
