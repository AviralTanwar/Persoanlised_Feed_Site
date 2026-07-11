import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import './OneNote.css'

const TYPES = {
  web_page:    { emoji: '🌐', label: 'Web Page'    },
  youtube:     { emoji: '▶️', label: 'YouTube'     },
  improvement: { emoji: '🎯', label: 'Improvement' },
}

function fmtDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function OneNote() {
  const [notes, setNotes]       = useState([])
  const [selId, setSelId]       = useState(null)
  const [noteData, setNoteData] = useState([])
  const [filterType, setFilter] = useState('all')
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState({ title: '', content: '' })
  const [saving, setSaving]     = useState(false)

  function loadNotes() {
    fetch('/api/notes')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setNotes(d)
          setSelId(s => s ?? d[0]?.id ?? null)
        }
      })
      .catch(() => {})
  }

  useEffect(() => { loadNotes() }, [])

  useEffect(() => {
    if (!selId) { setNoteData([]); return }
    fetch(`/api/notes/${selId}/data`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNoteData(d) })
      .catch(() => {})
  }, [selId])

  const sel    = notes.find(n => n.id === selId)
  const counts = notes.reduce((a, n) => ({ ...a, [n.entity_type]: (a[n.entity_type] || 0) + 1 }), {})
  const list   = filterType === 'all' ? notes : notes.filter(n => n.entity_type === filterType)

  const TABS = [
    ['all', `All (${notes.length})`],
    ...Object.entries(TYPES).map(([k, v]) => [k, `${v.emoji} ${v.label}${counts[k] ? ` (${counts[k]})` : ''}`]),
  ]

  async function addData(e) {
    e.preventDefault()
    if (!form.content.trim()) return
    setSaving(true)
    const res = await fetch(`/api/notes/${selId}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title.trim(), content: form.content.trim() }),
    })
    setSaving(false)
    if (!res.ok) return
    const created = await res.json()
    setNoteData(nd => [...nd, created])
    setForm({ title: '', content: '' })
    setAdding(false)
  }

  async function deleteData(id) {
    await fetch(`/api/notes/data/${id}`, { method: 'DELETE' })
    setNoteData(nd => nd.filter(d => d.id !== id))
  }

  const typeInfo = sel ? (TYPES[sel.entity_type] || { emoji: '📄', label: sel.entity_type }) : null

  return (
    <Card>
      <SectionHeader
        icon="📝"
        title="Notes"
        right={<span style={{ color: 'var(--ov0)', fontSize: 12 }}>{notes.length} saved</span>}
      />

      <div className="on-tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={`on-tab${filterType === k ? ' on' : ''}`} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="on-layout">
        {/* ── Sidebar ── */}
        <div className="on-sidebar">
          {list.length === 0 && <p className="on-empty">No notes found.</p>}
          {list.map(note => {
            const t = TYPES[note.entity_type] || { emoji: '📄', label: note.entity_type }
            return (
              <div key={note.id} className={`on-item-wrap${selId === note.id ? ' on' : ''}`}>
                <button
                  className={`on-item${selId === note.id ? ' on' : ''}`}
                  onClick={() => { setSelId(note.id); setAdding(false) }}
                >
                  <div className="on-item-type">{t.emoji} {t.label}</div>
                  <div className="on-item-title">{note.title || note.entity_id}</div>
                  <div className="on-item-meta">{fmtDate(note.updated_at)}</div>
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Reader ── */}
        <div className="on-reader">
          {!sel ? (
            <p className="on-empty">Select a note to view it.</p>
          ) : (
            <>
              <div className="on-reader-hdr">
                <div className="on-reader-type">{typeInfo.emoji} {typeInfo.label}</div>
                <div className="on-reader-title">{sel.title || sel.entity_id}</div>
                {sel.description && <div className="on-reader-desc">{sel.description}</div>}
                {sel.url && (
                  <a href={sel.url} target="_blank" rel="noreferrer" className="on-reader-url">↗ Open link</a>
                )}
              </div>

              <div className="on-notes-section">
                <div className="on-notes-label">
                  Notes ({noteData.length})
                  {!adding && (
                    <button
                      className="btn-g"
                      style={{ fontSize: 10, padding: '2px 8px', marginLeft: 8 }}
                      onClick={() => setAdding(true)}
                    >+ Add</button>
                  )}
                </div>

                {noteData.length === 0 && !adding && (
                  <p className="on-empty">No note entries yet.</p>
                )}
                {noteData.map(nd => (
                  <div key={nd.id} className="on-note-entry">
                    {nd.title && <div className="on-note-entry-title">{nd.title}</div>}
                    <div className="on-note-entry-content">{nd.content}</div>
                    <div className="on-note-entry-meta">
                      {fmtDate(nd.created_at)}
                      <button
                        className="btn-i danger"
                        style={{ fontSize: 10, marginLeft: 8 }}
                        onClick={() => deleteData(nd.id)}
                      >🗑️</button>
                    </div>
                  </div>
                ))}

                {adding && (
                  <form onSubmit={addData} className="on-add-form">
                    <input
                      className="fld"
                      placeholder="Title (optional)"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    />
                    <textarea
                      className="fld on-add-area"
                      placeholder="Note…"
                      value={form.content}
                      autoFocus
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-p" type="submit" disabled={saving} style={{ fontSize: 11, padding: '4px 12px' }}>
                        {saving ? 'Saving…' : '💾 Save'}
                      </button>
                      <button
                        className="btn-g"
                        type="button"
                        style={{ fontSize: 11, padding: '4px 12px' }}
                        onClick={() => { setAdding(false); setForm({ title: '', content: '' }) }}
                      >Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
