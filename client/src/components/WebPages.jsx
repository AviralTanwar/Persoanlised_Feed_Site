import { useState, useEffect, useRef } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import './WebPages.css'

const MAX_NOTES = 5

function fmtDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WebPages({ viewKpi = {} }) {
  const viewId    = viewKpi.id   || 1
  const viewTitle = viewKpi.name || 'Web Pages'
  const [pages, setPages]             = useState([])   // tbl_notes rows (entity_type='web_page')
  const [activePage, setActivePage]   = useState(null) // selected tbl_notes row
  const [notes, setNotes]             = useState([])   // tbl_notes_data rows for activePage
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(
    () => parseInt(localStorage.getItem('wp_sidebar_w') || '230', 10)
  )

  const [addingPage, setAddingPage]   = useState(false)
  const [newPage, setNewPage]         = useState({ title: '', url: '', description: '' })
  const [addingNote, setAddingNote]   = useState(false)
  const [noteDraft, setNoteDraft]     = useState({ title: '', content: '' })
  const [editingNote, setEditingNote] = useState(null)
  const [editNoteDraft, setEditNoteDraft] = useState({ title: '', content: '' })

  const noteInputRef = useRef(null)

  // ── Load pages ────────────────────────────────────────────────────────────
  async function loadPages() {
    const d = await fetch(`/api/notes?entityType=web_page`).then(r => r.json()).catch(() => [])
    setPages(Array.isArray(d) ? d : [])
  }

  useEffect(() => { loadPages() }, [])

  // ── Load notes when page changes ──────────────────────────────────────────
  useEffect(() => {
    if (!activePage) return
    fetch(`/api/notes/${activePage.id}/data`).then(r => r.json())
      .then(d => setNotes(Array.isArray(d) ? d.filter(n => n.deleted_at === '0000-00-00 00:00:00') : []))
      .catch(() => setNotes([]))
  }, [activePage?.id])

  // ── Sidebar resize ────────────────────────────────────────────────────────
  function onResizeStart(e) {
    e.preventDefault()
    const startX = e.clientX; const startW = sidebarWidth
    function onMove(ev) {
      const w = Math.min(360, Math.max(160, startW + ev.clientX - startX))
      setSidebarWidth(w); localStorage.setItem('wp_sidebar_w', String(w))
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }

  // ── Pages CRUD ────────────────────────────────────────────────────────────
  async function createPage(e) {
    e.preventDefault()
    if (!newPage.title.trim() || !newPage.url.trim()) return
    let url = newPage.url.trim()
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    const p = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: 'web_page', entity_id: url, view_id: viewId, title: newPage.title.trim(), description: newPage.description.trim(), url }),
    }).then(r => r.json())
    setNewPage({ title: '', url: '', description: '' }); setAddingPage(false)
    await loadPages(); setActivePage(p); setNotes([])
  }

  async function deletePage(id) {
    if (!window.confirm('Delete this page?')) return
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (activePage?.id === id) setActivePage(null)
    loadPages()
  }

  // ── Notes CRUD ────────────────────────────────────────────────────────────
  async function createNote(e) {
    e.preventDefault()
    if (!noteDraft.content.trim() || !activePage) return
    if (notes.length >= MAX_NOTES) { alert(`Max ${MAX_NOTES} notes per page`); return }
    const n = await fetch(`/api/notes/${activePage.id}/data`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: noteDraft.title.trim(), content: noteDraft.content.trim() }),
    }).then(r => r.json())
    setNotes(ns => [...ns, n]); setNoteDraft({ title: '', content: '' }); setAddingNote(false)
  }

  async function updateNote() {
    const updated = await fetch(`/api/notes/data/${editingNote.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editNoteDraft.title, content: editNoteDraft.content }),
    }).then(r => r.json())
    setNotes(ns => ns.map(n => n.id === updated.id ? updated : n))
    setEditingNote(null)
  }

  async function deleteNote(id) {
    await fetch(`/api/notes/data/${id}`, { method: 'DELETE' })
    setNotes(ns => ns.filter(n => n.id !== id))
  }

  useEffect(() => { if (addingNote && noteInputRef.current) noteInputRef.current.focus() }, [addingNote])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Card className="wp-card">
      <div className="wp-header-bar">
        <SectionHeader icon="🌐" title={viewTitle} />
        <button className="wp-toggle-btn" onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? '◀ Hide' : '▶ Pages'}
        </button>
      </div>

      <div className="wp-layout">
        {/* Sidebar */}
        <aside className={`wp-sidebar${sidebarOpen ? '' : ' collapsed'}`}
          style={sidebarOpen ? { width: sidebarWidth, minWidth: sidebarWidth } : {}}>
          <div className="wp-sidebar-inner">
            <div className="wp-page-list">
              {pages.map(p => (
                <div key={p.id} className={`wp-page-item${activePage?.id === p.id ? ' active' : ''}`}
                  onClick={() => setActivePage(p)}>
                  <div className="wp-page-title">{p.title}</div>
                  {p.description && <div className="wp-page-desc">{p.description}</div>}
                  <div className="wp-page-url">{p.url}</div>
                  <div className="wp-page-date">{fmtDate(p.created_at)}</div>
                  <button className="wp-page-del" onClick={e => { e.stopPropagation(); deletePage(p.id) }}>✕</button>
                </div>
              ))}

              {addingPage ? (
                <form className="wp-page-item wp-add-form" onSubmit={createPage}>
                  <input className="wp-input" placeholder="Title *" autoFocus
                    value={newPage.title} onChange={e => setNewPage(f => ({ ...f, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Escape' && setAddingPage(false)} />
                  <input className="wp-input" placeholder="URL *" style={{ marginTop: 5 }}
                    value={newPage.url} onChange={e => setNewPage(f => ({ ...f, url: e.target.value }))} />
                  <textarea className="wp-textarea" placeholder="Description (optional)" rows={2} style={{ marginTop: 5 }}
                    value={newPage.description} onChange={e => setNewPage(f => ({ ...f, description: e.target.value }))} />
                  <div className="wp-btn-row">
                    <button className="wp-btn-primary" type="submit">Add</button>
                    <button className="wp-btn-secondary" type="button"
                      onClick={() => { setAddingPage(false); setNewPage({ title: '', url: '', description: '' }) }}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button className="wp-new-btn" onClick={() => setAddingPage(true)}>+ Add Page</button>
              )}
            </div>
          </div>
        </aside>

        {/* Resize handle */}
        {sidebarOpen && <div className="wp-resize-handle" onMouseDown={onResizeStart} />}

        {/* Main panel */}
        <div className="wp-main">
          {!activePage ? (
            <div className="wp-greeting">
              <span className="wp-greeting-icon">🌐</span>
              <p className="wp-greeting-text">Select a page from the left to browse it here.</p>
              <p className="wp-greeting-sub">You can also add pages and attach up to {MAX_NOTES} notes each.</p>
            </div>
          ) : (
            <div className="wp-content-wrap">
              <div className="wp-content-topbar">
                <span className="wp-content-title">{activePage.title}</span>
                <button className="wp-close-btn" onClick={() => setActivePage(null)}>✕ Close</button>
              </div>

              {/* Iframe */}
              <div className="wp-iframe-wrap">
                <iframe
                  src={activePage.url}
                  title={activePage.title}
                  className="wp-iframe"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>

              {/* Notes */}
              <div className="wp-notes-panel">
                <div className="wp-notes-header">
                  <span>📝 Notes ({notes.length}/{MAX_NOTES})</span>
                  {notes.length < MAX_NOTES && !addingNote && (
                    <button className="wp-btn-secondary" style={{ fontSize: 11 }}
                      onClick={() => { setAddingNote(true); setNoteDraft({ title: '', content: '' }) }}>
                      + Add note
                    </button>
                  )}
                </div>

                {addingNote && (
                  <form className="wp-note-form" onSubmit={createNote}>
                    <input ref={noteInputRef} className="wp-input" placeholder="Note title (optional)"
                      value={noteDraft.title} onChange={e => setNoteDraft(d => ({ ...d, title: e.target.value }))} />
                    <textarea className="wp-textarea" placeholder="Note content *" rows={3}
                      value={noteDraft.content} onChange={e => setNoteDraft(d => ({ ...d, content: e.target.value }))} />
                    <div className="wp-btn-row">
                      <button className="wp-btn-primary" type="submit">Save</button>
                      <button className="wp-btn-secondary" type="button" onClick={() => setAddingNote(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {notes.map(n => (
                  <div key={n.id} className="wp-note-card">
                    {editingNote?.id === n.id ? (
                      <div className="wp-note-edit">
                        <input className="wp-input" value={editNoteDraft.title}
                          onChange={e => setEditNoteDraft(d => ({ ...d, title: e.target.value }))} />
                        <textarea className="wp-textarea" rows={3} value={editNoteDraft.content}
                          onChange={e => setEditNoteDraft(d => ({ ...d, content: e.target.value }))} />
                        <div className="wp-btn-row">
                          <button className="wp-btn-primary" style={{ fontSize: 11 }} onClick={updateNote}>Save</button>
                          <button className="wp-btn-secondary" style={{ fontSize: 11 }} onClick={() => setEditingNote(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {n.title && <div className="wp-note-title">{n.title}</div>}
                        <div className="wp-note-content">{n.content}</div>
                        <div className="wp-note-meta">
                          <span>{fmtDate(n.created_at)}</span>
                          <div className="wp-btn-row">
                            <button className="wp-btn-secondary" style={{ fontSize: 10 }}
                              onClick={() => { setEditingNote(n); setEditNoteDraft({ title: n.title||'', content: n.content }) }}>✏️</button>
                            <button className="wp-btn-danger" style={{ fontSize: 10 }}
                              onClick={() => deleteNote(n.id)}>🗑</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
