import { useEffect, useState } from 'react'

const PAGES = [
  { title: 'Add your pages', url: 'https://example.com', description: '' },
]

const COLOR_HEX = { yellow: '#ffd700', cyan: '#89dceb', green: '#a6e3a1', pink: '#f38ba8' }

function pageKey(url) {
  let hash = 0
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) >>> 0
  return hash.toString(16).slice(0, 10)
}

export default function WebPageViewer() {
  const [selected, setSelected] = useState(0)
  const [highlights, setHighlights] = useState([])
  const [notes, setNotes] = useState([])
  const [hlText, setHlText] = useState('')
  const [hlColor, setHlColor] = useState('yellow')
  const [hlNote, setHlNote] = useState('')
  const [noteInput, setNoteInput] = useState('')

  const page = PAGES[selected]
  const url = page.url

  const loadData = () => {
    const enc = encodeURIComponent(url)
    fetch(`http://localhost:3001/api/highlights?url=${enc}`).then(r => r.json()).then(setHighlights).catch(() => {})
    fetch(`http://localhost:3001/api/notes?context_id=${enc}&context_type=webpage`).then(r => r.json()).then(setNotes).catch(() => {})
  }

  useEffect(() => { loadData() }, [url])

  const saveHighlight = () => {
    if (!hlText.trim()) return
    fetch('http://localhost:3001/api/highlights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_url: url, selected_text: hlText.trim(), note: hlNote.trim(), color: hlColor }),
    }).then(() => { setHlText(''); setHlNote(''); loadData() })
  }

  const saveNote = () => {
    if (!noteInput.trim()) return
    fetch('http://localhost:3001/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_id: encodeURIComponent(url), context_type: 'webpage', content: noteInput.trim() }),
    }).then(() => { setNoteInput(''); loadData() })
  }

  const deleteHighlight = (id) => fetch(`http://localhost:3001/api/highlights/${id}`, { method: 'DELETE' }).then(loadData)
  const deleteNote = (id) => fetch(`http://localhost:3001/api/notes/${id}`, { method: 'DELETE' }).then(loadData)

  return (
    <section className="widget">
      <h3>🌐 Web Page Viewer</h3>
      <div className="yt-select-row">
        <select value={selected} onChange={e => setSelected(Number(e.target.value))} className="select">
          {PAGES.map((p, i) => <option key={i} value={i}>{p.title}</option>)}
        </select>
        <a href={url} target="_blank" rel="noreferrer" className="btn-link">🌐 Open</a>
      </div>
      {page.description && <p className="muted">{page.description}</p>}

      <div className="wp-layout">
        <iframe
          className="wp-frame"
          src={url}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title={page.title}
        />

        <div className="notes-panel">
          <div className="notes-header"><span>📝 Notes &amp; Highlights</span></div>
          <div className="notes-list">
            {highlights.length === 0 && notes.length === 0 && <p className="muted">No saved items yet.</p>}
            {highlights.map(h => (
              <div key={h.id} className="note-item" style={{ borderLeftColor: COLOR_HEX[h.color] || '#ffd700' }}>
                <p style={{ fontSize: '11px' }}>"{h.selected_text.slice(0, 80)}{h.selected_text.length > 80 ? '…' : ''}"</p>
                {h.note && <p className="muted">{h.note}</p>}
                <button className="btn-icon small" onClick={() => deleteHighlight(h.id)}>🗑️</button>
              </div>
            ))}
            {notes.map(n => (
              <div key={n.id} className="note-item">
                <p>{n.content}</p>
                <div className="note-footer">
                  <span className="muted">{n.created_at?.slice(0, 16)}</span>
                  <button className="btn-icon small" onClick={() => deleteNote(n.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wp-forms">
        <div className="form-section">
          <p className="form-label">📌 Add Highlight — copy text from page, paste below</p>
          <div className="hl-row">
            <input className="input" value={hlText} onChange={e => setHlText(e.target.value)} placeholder="Paste selected text…" />
            <select className="select small" value={hlColor} onChange={e => setHlColor(e.target.value)}>
              {Object.keys(COLOR_HEX).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input className="input" value={hlNote} onChange={e => setHlNote(e.target.value)} placeholder="Note (optional)…" />
          <button className="btn-secondary" onClick={saveHighlight}>🖊️ Save Highlight</button>
        </div>

        <div className="form-section">
          <p className="form-label">💬 Add Note <kbd>Ctrl+Enter</kbd></p>
          <textarea
            className="textarea"
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveNote() }}
            placeholder="Write your note…"
            rows={3}
          />
          <button className="btn-primary" onClick={saveNote}>💾 Save Note</button>
        </div>
      </div>
    </section>
  )
}
