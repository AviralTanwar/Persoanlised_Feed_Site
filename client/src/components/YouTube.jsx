import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import './YouTube.css'

const MAX_NOTES = 5

function fmtDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function YouTube({ viewKpi = {} }) {
  const viewId    = viewKpi.id   || 2
  const viewTitle = viewKpi.name || 'YouTube Viewer'

  const [videos, setVideos]   = useState([])
  const [idx, setIdx]         = useState(0)
  const [showNotes, setShowNotes] = useState(false)

  const [noteEntity, setNoteEntity] = useState(null)
  const [notes, setNotes]           = useState([])
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft]   = useState({ title: '', content: '' })
  const [editingNote, setEditingNote]     = useState(null)
  const [editNoteDraft, setEditNoteDraft] = useState({ title: '', content: '' })

  useEffect(() => {
    fetch('/api/static/youtube').then(r => r.json()).then(setVideos)
  }, [])

  const vid = videos[idx]

  // When active video changes: find or create its tbl_notes entity, then load entries
  useEffect(() => {
    if (!vid) { setNoteEntity(null); setNotes([]); return }
    const url = vid.url
    fetch(`/api/notes?entityType=youtube&entityId=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(async rows => {
        let entity = Array.isArray(rows) && rows[0]
        if (!entity) {
          entity = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_type: 'youtube', entity_id: url,
              view_id: viewId, title: vid.title, url,
            }),
          }).then(r => r.json())
        }
        setNoteEntity(entity)
        const data = await fetch(`/api/notes/${entity.id}/data`).then(r => r.json())
        setNotes(Array.isArray(data) ? data.filter(n => n.deleted_at === '0000-00-00 00:00:00') : [])
      })
      .catch(() => { setNoteEntity(null); setNotes([]) })
  }, [vid?.url, viewId])

  async function createNote(e) {
    e.preventDefault()
    if (!noteDraft.content.trim() || !noteEntity) return
    if (notes.length >= MAX_NOTES) { alert(`Max ${MAX_NOTES} notes per video`); return }
    const n = await fetch(`/api/notes/${noteEntity.id}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: noteDraft.title.trim(), content: noteDraft.content.trim() }),
    }).then(r => r.json())
    setNotes(ns => [...ns, n])
    setNoteDraft({ title: '', content: '' })
    setAddingNote(false)
  }

  async function updateNote() {
    const updated = await fetch(`/api/notes/data/${editingNote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editNoteDraft.title, content: editNoteDraft.content }),
    }).then(r => r.json())
    setNotes(ns => ns.map(n => n.id === updated.id ? updated : n))
    setEditingNote(null)
  }

  async function deleteNote(id) {
    await fetch(`/api/notes/data/${id}`, { method: 'DELETE' })
    setNotes(ns => ns.filter(n => n.id !== id))
  }

  return (
    <Card>
      <SectionHeader
        icon="🎬"
        title={viewTitle}
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
                {notes.length < MAX_NOTES && !addingNote && (
                  <button className="btn-g" style={{ fontSize: 11 }}
                    onClick={() => { setAddingNote(true); setNoteDraft({ title: '', content: '' }) }}>
                    + Add note
                  </button>
                )}
              </div>

              {addingNote && (
                <form onSubmit={createNote} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <input className="fld" placeholder="Note title (optional)"
                    value={noteDraft.title}
                    onChange={e => setNoteDraft(d => ({ ...d, title: e.target.value }))} />
                  <textarea className="fld" rows={3} placeholder="Note content *"
                    value={noteDraft.content}
                    onChange={e => setNoteDraft(d => ({ ...d, content: e.target.value }))}
                    onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') createNote(e) }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-p" type="submit" style={{ fontSize: 12, padding: '5px 14px' }}>💾 Save</button>
                    <button className="btn-g" type="button" style={{ fontSize: 12, padding: '5px 14px' }}
                      onClick={() => setAddingNote(false)}>Cancel</button>
                  </div>
                </form>
              )}

              {notes.length === 0 && !addingNote && (
                <p style={{ color: 'var(--ov0)', fontSize: 12, margin: '2px 0' }}>No notes yet for this video.</p>
              )}

              {notes.map(n => (
                <div key={n.id} className="yt-note" style={{ borderLeftColor: 'var(--accent)' }}>
                  {editingNote?.id === n.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <input className="fld" value={editNoteDraft.title}
                        onChange={e => setEditNoteDraft(d => ({ ...d, title: e.target.value }))} />
                      <textarea className="fld" rows={3} value={editNoteDraft.content}
                        onChange={e => setEditNoteDraft(d => ({ ...d, content: e.target.value }))} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-p" style={{ fontSize: 11, padding: '4px 12px' }} onClick={updateNote}>Save</button>
                        <button className="btn-g" style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => setEditingNote(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {n.title && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{n.title}</div>}
                      <div className="yt-note-text">{n.content}</div>
                      <div className="yt-note-foot">
                        <span>{fmtDate(n.created_at)}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-i" style={{ fontSize: 11 }}
                            onClick={() => { setEditingNote(n); setEditNoteDraft({ title: n.title || '', content: n.content }) }}>✏️</button>
                          <button className="btn-i danger" onClick={() => deleteNote(n.id)}>🗑️</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
