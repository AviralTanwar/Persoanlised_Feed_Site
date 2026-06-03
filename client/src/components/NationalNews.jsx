import { useEffect, useState } from 'react'

function articleId(article) {
  const key = article.url || article.title || ''
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return hash.toString(16).slice(0, 12)
}

export default function NationalNews({ country = 'in', pageSize = 6 }) {
  const [articles, setArticles] = useState([])
  const [error, setError] = useState(null)
  const [interactions, setInteractions] = useState({})

  const load = () => {
    fetch(`http://localhost:3001/api/news/national?country=${country}&pageSize=${pageSize}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        const valid = (d.articles || []).filter(a => a.title && !a.title.includes('[Removed]'))
        setArticles(valid)
      })
      .catch(e => setError(e.message))
  }

  useEffect(() => { load() }, [])

  const toggleInteraction = (article, type) => {
    const id = articleId(article)
    fetch('http://localhost:3001/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: id, item_type: 'national_news', interaction: type, title: article.title, url: article.url }),
    })
      .then(r => r.json())
      .then(d => setInteractions(prev => ({ ...prev, [id]: d.interaction })))
  }

  if (error) return <section className="widget"><h3>📰 National News</h3><p className="error">{error}</p></section>

  return (
    <section className="widget">
      <h3>📰 National News</h3>
      {articles.length === 0 && <p className="muted">Loading…</p>}
      {articles.map((article, i) => {
        const id = articleId(article)
        const current = interactions[id]
        return (
          <div key={id} className="news-item">
            <div className="news-text">
              <a href={article.url} target="_blank" rel="noreferrer" className="news-title">
                {article.title}
              </a>
              <span className="news-source">{article.source?.name}</span>
              {article.description && <p className="news-desc">{article.description.slice(0, 140)}{article.description.length > 140 ? '…' : ''}</p>}
            </div>
            <div className="news-actions">
              <button
                className={`btn-icon ${current === 'like' ? 'active' : ''}`}
                onClick={() => toggleInteraction(article, 'like')}
              >👍</button>
              <button
                className={`btn-icon ${current === 'dislike' ? 'active' : ''}`}
                onClick={() => toggleInteraction(article, 'dislike')}
              >👎</button>
              <a href={article.url} target="_blank" rel="noreferrer" className="btn-icon">🔗</a>
            </div>
            {i < articles.length - 1 && <hr className="divider" />}
          </div>
        )
      })}
      <button className="btn-refresh" onClick={load}>🔄 Refresh</button>
    </section>
  )
}
