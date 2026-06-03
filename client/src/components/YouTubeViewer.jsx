import { useEffect, useRef, useState } from 'react'

const VIDEOS = [
  { title: 'Add your videos', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
]

function getVideoId(url) {
  try {
    const u = new URL(url)
    return u.searchParams.get('v') || u.pathname.split('/').pop()
  } catch { return '' }
}

const NOTE_COLORS = ['#89b4fa', '#a6e3a1', '#f38ba8', '#fab387', '#f9e2af', '#cba6f7']

export default function YouTubeViewer() {
  const [selected, setSelected] = useState(0)
  const [notes, setNotes] = useState([])
  const [input, setInput] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const colorIdx = useRef(0)
  const video = VIDEOS[selected]
  const vid = getVideoId(video.url)

  useEffect(() => {
    fetch(`http://localhost:3001/api/notes?context_id=${vid}&context_type=youtube`)
      .then(r => r.json())
      .then(setNotes)
      .catch(() => {})
  }, [vid])

  const saveNote = () => {
    if (!input.trim()) return
    fetch('http://localhost:3001/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_id: vid, context_type: 'youtube', content: input.trim() }),
    })
      .then(r => r.json())
      .then(d => {
        const color = NOTE_COLORS[colorIdx.current % NOTE_COLORS.length]
        colorIdx.current++
        setNotes(prev => [{ id: d.id, content: input.trim(), created_at: new Date().toISOString(), color }, ...prev])
        setInput('')
      })
  }

  const deleteNote = (id) => {
    fetch(`http://localhost:3001/api/notes/${id}`, { method: 'DELETE' })
      .then(() => setNotes(prev => prev.filter(n => n.id !== id)))
  }

  return (
    <section className="widget">
      <h3>🎬 YouTube Viewer</h3>
      <div className="yt-select-row">
        <select
          value={selected}
          onChange={e => setSelected(Number(e.target.value))}
          className="select"
        >
          {VIDEOS.map((v, i) => <option key={i} value={i}>{v.title}</option>)}
        </select>
        <a href={video.url} target="_blank" rel="noreferrer" className="btn-link">↗ Open</a>
      </div>

      <div className="yt-layout">
        <iframe
          className="yt-frame"
          src={`https://www.youtube.com/embed/${vid}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={video.title}
        />

        <div className="notes-panel">
          <div className="notes-header">
            <span>📝 Notes <span className="badge">{notes.length}</span></span>
            <button className="btn-icon" onClick={() => setPanelOpen(p => !p)}>{panelOpen ? '−' : '+'}</button>
          </div>
          {panelOpen && (
            <>
              <div className="notes-list">
                {notes.length === 0 && <p className="muted">No notes yet.</p>}
                {notes.map(n => (
                  <div key={n.id} className="note-item" style={{ borderLeftColor: n.color || NOTE_COLORS[0] }}>
                    <p>{n.content}</p>
                    <div className="note-footer">
                      <span className="muted">{n.created_at?.slice(0, 16)}</span>
                      <button className="btn-icon small" onClick={() => deleteNote(n.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="note-input-row">
                <textarea
                  className="textarea"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveNote() }}
                  placeholder="Write a note… (Ctrl+Enter to save)"
                  rows={3}
                />
                <button className="btn-primary" onClick={saveNote}>💾 Save</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
