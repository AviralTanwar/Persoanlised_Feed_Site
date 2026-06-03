import { useEffect, useState } from 'react'

function scoreBadgeStyle(score) {
  if (score >= 600) return { background: '#f38ba8', color: '#11111b' }
  if (score >= 300) return { background: '#fab387', color: '#11111b' }
  if (score >= 100) return { background: '#89b4fa', color: '#11111b' }
  return { background: '#45475a', color: '#cdd6f4' }
}

export default function TechNews() {
  const [stories, setStories] = useState([])
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    fetch('http://localhost:3001/api/tech-news')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setStories(d) })
      .catch(e => setError(e.message))
  }

  useEffect(() => { load() }, [])

  if (error) return <section className="widget"><h3>💻 Tech News</h3><p className="error">{error}</p></section>

  return (
    <section className="widget">
      <h3>💻 Tech News</h3>
      {stories.length === 0 && <p className="muted">Loading…</p>}
      {stories.map(story => (
        <div key={story.id} className="tech-item">
          <div className="tech-text">
            <a
              href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
              target="_blank"
              rel="noreferrer"
              className="news-title"
            >
              {story.title}
            </a>
            <span className="news-source">{story.by}</span>
          </div>
          <div className="tech-meta">
            <span className="score-badge" style={scoreBadgeStyle(story.score)}>{story.score}</span>
            <a
              href={`https://news.ycombinator.com/item?id=${story.id}`}
              target="_blank"
              rel="noreferrer"
              className="comment-link"
            >
              💬 {story.descendants || 0}
            </a>
          </div>
        </div>
      ))}
      <button className="btn-refresh" onClick={load}>🔄 Refresh</button>
    </section>
  )
}
