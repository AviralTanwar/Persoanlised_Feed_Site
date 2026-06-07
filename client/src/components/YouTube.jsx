import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import useLocalStorage from '../hooks/useLocalStorage'
import './YouTube.css'

const NOTE_COLORS = ['var(--blue)', 'var(--green)', 'var(--peach)', 'var(--red)', 'var(--mauve)', 'var(--teal)']

export default function YouTube() {
  const [videos, setVideos] = useState([])
  const [idx, setIdx]       = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [notesByVid, setNotes]    = useLocalStorage('yt_notes', {})
  const [draft, setDraft]         = useState('')
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    fetch('/api/static/youtube').then(r => r.json()).then(setVideos)
  }, [])

  useEffect(() => { setDraft('') }, [idx])

  const vid   = videos[idx]
  const notes = notesByVid[idx] ?? []

  function saveNote() {
    if (!draft.trim()) return
    setNotes(n => ({ ...n, [idx]: [{ text: draft.trim(), time: new Date().toLocaleString() }, ...(n[idx] ?? [])] }))
    setDraft('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function deleteNote(ni) {
    setNotes(n => ({ ...n, [idx]: (n[idx] ?? []).filter((_, i) => i !== ni) }))
  }

  return (
    <Card>
      <SectionHeader
        icon="🎬"
        title="YouTube Viewer"
        right={
          <button className={`btn-g${showNotes ? ' on' : ''}`} onClick={() => setShowNotes(v => !v)}>
            📝 Notes{notes.length > 0 ? ` (${notes.length})` : ''}
          </button>
        }
      />
      <div className="yt-layout">
        <div className="yt-sidebar">
          {videos.map((v, i) => (
            <button key={i} className={`yt-item${idx === i ? ' on' : ''}`} onClick={() => setIdx(i)}>
              <span className="yt-play">▶</span>
              <div>
                <div className="yt-title">{v.title}</div>
                <div className="yt-ch">{v.channel}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="yt-main">
          {vid && (
            <div className="yt-player">
              <iframe
                src={`${vid.url}?rel=0&modestbranding=1`}
                title={vid.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {showNotes && (
            <div className="yt-notes">
              <div className="yt-notes-hdr">
                <span>Notes — {vid?.title}</span>
                {saved && <span className="yt-saved">✓ Saved!</span>}
              </div>
              <textarea
                className="fld"
                rows={3}
                placeholder="Write a note… (Ctrl+Enter to save)"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveNote() }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-p" style={{ fontSize: 12, padding: '5px 14px' }} onClick={saveNote}>
                  💾 Save
                </button>
                <span style={{ fontSize: 11, color: 'var(--ov0)' }}>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
              </div>
              {notes.map((n, ni) => (
                <div key={ni} className="yt-note" style={{ borderLeftColor: NOTE_COLORS[ni % NOTE_COLORS.length] }}>
                  <div className="yt-note-text">{n.text}</div>
                  <div className="yt-note-foot">
                    <span>{n.time}</span>
                    <button className="btn-i danger" onClick={() => deleteNote(ni)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
