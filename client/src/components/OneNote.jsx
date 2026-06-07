import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import './OneNote.css'

function renderMd(text) {
  const blocks = []
  const clean = text.replace(/```[\w]*\n([\s\S]+?)\n```/g, (_, code) => {
    blocks.push(code)
    return `__BLK_${blocks.length - 1}__`
  })

  return clean.split('\n').map((ln, i) => {
    if (ln.startsWith('__BLK_')) {
      const bi = parseInt(ln.match(/__BLK_(\d+)__/)[1])
      return <pre key={i} className="md-pre">{blocks[bi]}</pre>
    }
    if (ln.startsWith('## '))  return <h3 key={i} className="md-h2">{ln.slice(3)}</h3>
    if (ln.startsWith('### ')) return <h4 key={i} className="md-h3">{ln.slice(4)}</h4>
    if (/^[✅📖⏳]/.test(ln))   return <div key={i} className="md-ico">{ln}</div>
    if (ln.startsWith('- '))   return <div key={i} className="md-li">· {ln.slice(2).replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1')}</div>

    const parsed = ln
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="md-code">$1</code>')
    return parsed.trim()
      ? <p key={i} className="md-p" dangerouslySetInnerHTML={{ __html: parsed }} />
      : null
  })
}

export default function OneNote() {
  const [pages, setPages] = useState([])
  const [selId, setSelId] = useState(null)

  useEffect(() => {
    fetch('/api/static/onenote')
      .then(r => r.json())
      .then(data => {
        setPages(data)
        setSelId(data[0]?.id ?? null)
      })
  }, [])

  const page = pages.find(p => p.id === selId)

  return (
    <Card>
      <SectionHeader
        icon="📓"
        title="OneNote"
        right={<Chip color="var(--mauve)" small>My Notebook</Chip>}
      />
      <div className="on-layout">
        <div className="on-sidebar">
          {pages.map(p => (
            <button
              key={p.id}
              className={`on-item${selId === p.id ? ' on' : ''}`}
              onClick={() => setSelId(p.id)}
            >
              <div className="on-item-title">{p.title}</div>
              <div className="on-item-meta">{p.notebook} · {p.modified}</div>
            </button>
          ))}
        </div>
        <div className="on-reader">
          {page && (
            <>
              <div className="on-reader-title">{page.title}</div>
              <div className="on-reader-meta">📁 {page.notebook} · Modified {page.modified}</div>
              <div className="on-reader-body">{renderMd(page.body)}</div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
