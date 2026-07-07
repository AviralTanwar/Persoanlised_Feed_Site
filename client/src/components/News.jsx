import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import NewsPanel from './NewsPanel'
import './News.css'

// Renders one NewsPanel per live row in tbl_news_kpi_data — add/disable a
// source there and this section grows/shrinks to match, no code changes needed.
export default function News({ techRef }) {
  const [kpis, setKpis] = useState([])

  useEffect(() => {
    fetch('/api/news-kpis')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setKpis(d) })
      .catch(() => {})
  }, [])

  return (
    <Card className="news-card">
      <SectionHeader icon="📰" title="News" />
      <div className="newsgrid">
        {kpis.map(kpi => (
          <div key={kpi.id} ref={kpi.name === 'Tech News' ? techRef : undefined}>
            <NewsPanel kpi={kpi} />
          </div>
        ))}
      </div>
    </Card>
  )
}
