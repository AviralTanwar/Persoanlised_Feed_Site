import { useState, useEffect, useRef } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import RichEditor from './shared/RichEditor'
import './WebPages.css'

const isEmptyHtml = h => !h || h.replace(/<[^>]*>/g, '').trim() === ''
const MAX_NOTES = 5

function fmtDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WebPages({ viewKpi = {}, theme = 'dark', onThemeToggle }) {
  const viewId    = viewKpi.id   ?? null
  const viewTitle = viewKpi.name || 'Web Pages'

  const [expanded,      setExpanded]      = useState(false)
  const [miniCollapsed, setMiniCollapsed] = useState(() => localStorage.getItem('wp_mini_collapsed') === 'true')

  const [pages,      setPages]      = useState([])
  const [activePage, setActivePage] = useState(null)
  const [notes,      setNotes]      = useState([])
  const [user,       setUser]       = useState(null)

  const [leftOpen,   setLeftOpen]   = useState(true)
  const [leftWidth,  setLeftWidth]  = useState(() => parseInt(localStorage.getItem('wp_left_w')  || '240', 10))
  const [rightOpen,  setRightOpen]  = useState(true)
  const [rightWidth, setRightWidth] = useState(() => parseInt(localStorage.getItem('wp_right_w') || '300', 10))

  const sidebarLeftRef  = useRef(null)
  const sidebarRightRef = useRef(null)

  const [sortField, setSortFieldRaw] = useState(() => localStorage.getItem('wp_sort_field') || 'updated_at')
  const [sortDir,   setSortDirRaw]   = useState(() => localStorage.getItem('wp_sort_dir')   || 'desc')
  const [filterText, setFilterText]  = useState('')

  function setSortField(v) { setSortFieldRaw(v); localStorage.setItem('wp_sort_field', v) }
  function setSortDir(v)   { setSortDirRaw(v);   localStorage.setItem('wp_sort_dir',   v) }

  const [addingPage,    setAddingPage]    = useState(false)
  const [newPage,       setNewPage]       = useState({ title: '', url: '', description: '' })
  const [editingPage,   setEditingPage]   = useState(null)
  const [editPageDraft, setEditPageDraft] = useState({ title: '', description: '' })

  const [addingNote,    setAddingNote]    = useState(false)
  const [noteDraft,     setNoteDraft]     = useState({ title: '', description: '', content: '' })
  const [editingNote,   setEditingNote]   = useState(null)
  const [editNoteDraft, setEditNoteDraft] = useState({ title: '', description: '', content: '' })

  // Embed strategy per page: 'direct' iframes the url as-is; 'proxy' routes it
  // through /api/proxy which strips X-Frame-Options / frame-ancestors so
  // sites that forbid embedding still render. isPdf drops the sandbox attr —
  // Chrome's sandbox is what blocks its built-in PDF viewer.
  const [embed, setEmbed] = useState({ mode: 'direct', isPdf: false })

  useEffect(() => {
    if (!activePage) return
    setEmbed({ mode: 'direct', isPdf: false })
    fetch(`/api/proxy/check?url=${encodeURIComponent(activePage.url)}`)
      .then(r => r.json())
      .then(d => setEmbed({
        mode: (d.frameBlocked || !d.ok) ? 'proxy' : 'direct',
        isPdf: !!d.isPdf,
      }))
      .catch(() => {})
  }, [activePage?.id])

  useEffect(() => {
    fetch('/api/user-info').then(r => r.json()).then(setUser).catch(() => {})
  }, [])

  async function loadPages() {
    const d = await fetch('/api/notes?entityType=web_page').then(r => r.json()).catch(() => [])
    setPages(Array.isArray(d) ? d : [])
  }
  useEffect(() => { loadPages() }, [])

  useEffect(() => {
    if (!activePage) { setNotes([]); return }
    fetch(`/api/notes/${activePage.id}/data`).then(r => r.json())
      .then(d => setNotes(Array.isArray(d) ? d.filter(n => n.deleted_at === '0000-00-00 00:00:00') : []))
      .catch(() => setNotes([]))
  }, [activePage?.id])

  useEffect(() => {
    if (!expanded) return
    const fn = e => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [expanded])

  // Direct DOM resize — no React re-renders during drag, no CSS transition stutter
  function onLeftResizeStart(e) {
    e.preventDefault()
    const el = sidebarLeftRef.current
    if (el) el.classList.add('resizing')
    const startX = e.clientX
    const startW = leftWidth
    let curW = startW
    const onMove = ev => {
      curW = Math.min(400, Math.max(160, startW + ev.clientX - startX))
      if (el) el.style.width = curW + 'px'
    }
    const onUp = () => {
      if (el) el.classList.remove('resizing')
      setLeftWidth(curW)
      localStorage.setItem('wp_left_w', String(curW))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onRightResizeStart(e) {
    e.preventDefault()
    const el = sidebarRightRef.current
    if (el) el.classList.add('resizing')
    const startX = e.clientX
    const startW = rightWidth
    let curW = startW
    const onMove = ev => {
      curW = Math.min(480, Math.max(200, startW + startX - ev.clientX))
      if (el) el.style.width = curW + 'px'
    }
    const onUp = () => {
      if (el) el.classList.remove('resizing')
      setRightWidth(curW)
      localStorage.setItem('wp_right_w', String(curW))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

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

  async function updatePage() {
    if (!editingPage) return
    const updated = await fetch(`/api/notes/${editingPage.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editPageDraft.title.trim(), description: editPageDraft.description.trim() }),
    }).then(r => r.json())
    setPages(ps => ps.map(p => p.id === updated.id ? updated : p))
    if (activePage?.id === updated.id) setActivePage(updated)
    setEditingPage(null)
  }

  async function deletePage(id) {
    if (!window.confirm('Delete this page and all its notes?')) return
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (activePage?.id === id) { setActivePage(null); setNotes([]) }
    loadPages()
  }

  async function createNote(e) {
    e.preventDefault()
    if (!noteDraft.title.trim()) return
    if (isEmptyHtml(noteDraft.content) || !activePage) return
    if (notes.length >= MAX_NOTES) { alert(`Max ${MAX_NOTES} notes per page`); return }
    const n = await fetch(`/api/notes/${activePage.id}/data`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: noteDraft.title.trim(), description: noteDraft.description.trim(), content: noteDraft.content }),
    }).then(r => r.json())
    setNotes(ns => [...ns, n]); setNoteDraft({ title: '', description: '', content: '' }); setAddingNote(false)
  }

  async function updateNote() {
    const updated = await fetch(`/api/notes/data/${editingNote.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editNoteDraft.title, description: editNoteDraft.description, content: editNoteDraft.content }),
    }).then(r => r.json())
    setNotes(ns => ns.map(n => n.id === updated.id ? updated : n))
    setEditingNote(null)
  }

  async function deleteNote(id) {
    await fetch(`/api/notes/data/${id}`, { method: 'DELETE' })
    setNotes(ns => ns.filter(n => n.id !== id))
  }

  function toggleMiniCollapsed(val) {
    setMiniCollapsed(val)
    localStorage.setItem('wp_mini_collapsed', String(val))
  }

  const visiblePages = [...pages]
    .filter(p => !filterText || p.title.toLowerCase().includes(filterText.toLowerCase()) || (p.description || '').toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      const va = (a[sortField] || '').toLowerCase()
      const vb = (b[sortField] || '').toLowerCase()
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  // ── Slim strip (mini card hidden) ──────────────────────────────────────────
  if (!expanded && miniCollapsed) {
    return (
      <Card className="wp-mini-card wp-mini-card--slim">
        <div className="wp-mini-slim">
          <div className="wp-mini-slim-left">
            <span className="wp-mini-slim-icon">🌐</span>
            <span className="wp-mini-slim-title">{viewTitle}</span>
            <span className="wp-mini-slim-badge">{pages.length}</span>
          </div>
          <div className="wp-mini-slim-right">
            <button className="wp-tb-btn" onClick={() => toggleMiniCollapsed(false)}>▶ Show</button>
            <button className="wp-expand-btn" onClick={() => setExpanded(true)}>⤢ Launch</button>
          </div>
        </div>
      </Card>
    )
  }

  // ── Mini card ──────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <Card className="wp-mini-card">
        <div className="wp-mini-header">
          <SectionHeader icon="🌐" title={viewTitle} />
          <div className="wp-mini-header-right">
            <button className="wp-tb-btn" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => toggleMiniCollapsed(true)}>◀ Hide</button>
            <button className="wp-expand-btn" onClick={() => setExpanded(true)}>⤢ Launch</button>
          </div>
        </div>
        <div className="wp-mini-body">
          <div className="wp-mini-stat">
            <span className="wp-mini-count">{pages.length}</span>
            {' '}page{pages.length !== 1 ? 's' : ''} saved
          </div>
          {pages.length > 0 ? (
            <div className="wp-mini-pages">
              {pages.slice(0, 4).map(p => (
                <button key={p.id} className="wp-mini-page-btn"
                  onClick={() => { setExpanded(true); setActivePage(p) }}>
                  <span className="wp-mini-dot">◉</span>
                  <span className="wp-mini-page-title">{p.title}</span>
                  <span className="wp-mini-arrow">↗</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="wp-mini-empty">No pages yet — launch to add one.</p>
          )}
        </div>
      </Card>
    )
  }

  // ── Full-screen overlay ────────────────────────────────────────────────────
  return (
    <div className="wp-overlay">
      {/* Top bar */}
      <div className="wp-topbar">
        <div className="wp-topbar-left">
          <span className="wp-topbar-icon">🌐</span>
          <span className="wp-topbar-title">{viewTitle}</span>
          {activePage && (
            <><span className="wp-topbar-sep">/</span>
            <span className="wp-topbar-page">{activePage.title}</span></>
          )}
        </div>
        <div className="wp-topbar-right">
          <button className={`wp-tb-btn${leftOpen ? ' on' : ''}`} onClick={() => setLeftOpen(o => !o)}>
            ☰ Pages
          </button>
          <button className={`wp-tb-btn${rightOpen ? ' on' : ''}`} onClick={() => setRightOpen(o => !o)}>
            📝 Notes
          </button>
          {onThemeToggle && (
            <button className="wp-tb-btn wp-tb-theme" onClick={onThemeToggle}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}
          <button className="wp-tb-minimize" onClick={() => setExpanded(false)} title="Minimize (Esc)">
            ⊟ Minimize
          </button>
        </div>
      </div>

      {/* Three-column body */}
      <div className="wp-body">

        {/* ── Left sidebar ── */}
        <aside
          ref={sidebarLeftRef}
          className={`wp-left${leftOpen ? '' : ' hidden'}`}
          style={leftOpen ? { width: leftWidth, minWidth: leftWidth } : {}}>

          <div className="wp-left-controls">
            <input
              className="wp-filter-input"
              placeholder="🔍 Filter pages..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
            <div className="wp-sort-bar">
              <select className="wp-sort-select" value={sortField}
                onChange={e => setSortField(e.target.value)}>
                <option value="updated_at">Updated</option>
                <option value="created_at">Created</option>
                <option value="title">Name</option>
              </select>
              <button className="wp-sort-dir"
                onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>

          <div className="wp-page-list">
            {visiblePages.map(p => (
              <div key={p.id} className={`wp-page-item${activePage?.id === p.id ? ' active' : ''}`}>
                {editingPage?.id === p.id ? (
                  <div className="wp-page-edit-form" onClick={e => e.stopPropagation()}>
                    <input className="wp-input" value={editPageDraft.title} autoFocus
                      placeholder="Title"
                      onChange={e => setEditPageDraft(d => ({ ...d, title: e.target.value }))} />
                    <textarea className="wp-textarea" value={editPageDraft.description} rows={2}
                      placeholder="Description (optional)"
                      onChange={e => setEditPageDraft(d => ({ ...d, description: e.target.value }))} />
                    <div className="wp-url-locked" title="URL cannot be changed">🔒 {p.url}</div>
                    <div className="wp-btn-row" style={{ marginTop: 4 }}>
                      <button className="wp-btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={updatePage}>Save</button>
                      <button className="wp-btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setEditingPage(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="wp-page-body" onClick={() => setActivePage(p)}>
                    <div className="wp-page-title">{p.title}</div>
                    {p.description && <div className="wp-page-desc">{p.description}</div>}
                    <div className="wp-page-url">{p.url}</div>
                    <div className="wp-page-footer">
                      <span className="wp-page-date">{fmtDate(p.created_at)}</span>
                      <div className="wp-page-actions">
                        <button className="wp-page-act" title="Edit title/description"
                          onClick={e => { e.stopPropagation(); setEditingPage(p); setEditPageDraft({ title: p.title, description: p.description || '' }) }}>✏</button>
                        <button className="wp-page-act danger" title="Delete page"
                          onClick={e => { e.stopPropagation(); deletePage(p.id) }}>🗑</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filterText && visiblePages.length === 0 && (
              <p className="wp-no-results">No pages match "{filterText}"</p>
            )}

            {addingPage ? (
              <form className="wp-add-form" onSubmit={createPage}>
                <input className="wp-input" placeholder="Title *" autoFocus
                  value={newPage.title} onChange={e => setNewPage(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Escape' && setAddingPage(false)} />
                <input className="wp-input" placeholder="URL *" style={{ marginTop: 5 }}
                  value={newPage.url} onChange={e => setNewPage(f => ({ ...f, url: e.target.value }))} />
                <textarea className="wp-textarea" placeholder="Description (optional)" rows={2} style={{ marginTop: 5 }}
                  value={newPage.description} onChange={e => setNewPage(f => ({ ...f, description: e.target.value }))} />
                <div className="wp-btn-row" style={{ marginTop: 6 }}>
                  <button className="wp-btn-primary" type="submit">Add</button>
                  <button className="wp-btn-secondary" type="button"
                    onClick={() => { setAddingPage(false); setNewPage({ title: '', url: '', description: '' }) }}>Cancel</button>
                </div>
              </form>
            ) : (
              <button className="wp-new-btn" onClick={() => setAddingPage(true)}>+ Add Page</button>
            )}
          </div>
        </aside>

        {leftOpen && <div className="wp-resize-handle" onMouseDown={onLeftResizeStart} />}

        {/* ── Main area ── */}
        <div className="wp-main">
          {!activePage ? (
            <WpGreeting user={user} pages={pages} />
          ) : (
            <div className="wp-content-wrap">
              <div className="wp-content-topbar">
                <span className="wp-content-title">{activePage.title}</span>
                <div className="wp-content-actions">
                  <button
                    className="wp-tb-btn"
                    title={embed.mode === 'proxy'
                      ? 'Embedded via server proxy (site blocks direct iframes) — click for direct'
                      : 'Embedded directly — click to force proxy mode'}
                    onClick={() => setEmbed(e => ({ ...e, mode: e.mode === 'proxy' ? 'direct' : 'proxy' }))}>
                    {embed.mode === 'proxy' ? '🛡 Proxied' : '🔗 Direct'}
                  </button>
                  <a href={activePage.url} target="_blank" rel="noreferrer" className="wp-external-link">↗ New tab</a>
                  <button className="wp-close-btn" onClick={() => setActivePage(null)}>✕ Close</button>
                </div>
              </div>
              <div className="wp-iframe-wrap">
                <iframe
                  key={`${activePage.id}-${embed.mode}`}
                  src={embed.mode === 'proxy'
                    ? `/api/proxy?url=${encodeURIComponent(activePage.url)}`
                    : activePage.url}
                  title={activePage.title}
                  className="wp-iframe"
                  {...(embed.isPdf ? {} : { sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups' })}
                />
              </div>
            </div>
          )}
        </div>

        {rightOpen && <div className="wp-resize-handle" onMouseDown={onRightResizeStart} />}

        {/* ── Right sidebar (notes) ── */}
        <aside
          ref={sidebarRightRef}
          className={`wp-right${rightOpen ? '' : ' hidden'}`}
          style={rightOpen ? { width: rightWidth, minWidth: rightWidth } : {}}>

          <div className="wp-right-header">
            <span className="wp-right-title">
              📝 Notes{activePage ? ` (${notes.length}/${MAX_NOTES})` : ''}
            </span>
            {activePage && notes.length < MAX_NOTES && !addingNote && (
              <button className="wp-btn-secondary"
                style={{ fontSize: 10, padding: '3px 8px' }}
                onClick={() => { setAddingNote(true); setNoteDraft({ title: '', description: '', content: '' }) }}>
                + Add
              </button>
            )}
          </div>

          <div className="wp-notes-list">
            {!activePage && (
              <p className="wp-right-empty">← Select a page to view its notes.</p>
            )}

            {activePage && notes.length === 0 && !addingNote && (
              <p className="wp-right-empty">No notes yet for this page.</p>
            )}

            {activePage && addingNote && (
              <form className="wp-note-form" onSubmit={createNote}>
                <input className="wp-input" placeholder="Note title *" autoFocus
                  value={noteDraft.title} onChange={e => setNoteDraft(d => ({ ...d, title: e.target.value }))} />
                <input className="wp-input" placeholder="Short description (optional)"
                  value={noteDraft.description} onChange={e => setNoteDraft(d => ({ ...d, description: e.target.value }))} />
                <RichEditor
                  content={noteDraft.content}
                  onChange={html => setNoteDraft(d => ({ ...d, content: html }))}
                  placeholder="Note content…"
                />
                <div className="wp-btn-row" style={{ marginTop: 6 }}>
                  <button className="wp-btn-primary" type="submit">Save</button>
                  <button className="wp-btn-secondary" type="button" onClick={() => setAddingNote(false)}>Cancel</button>
                </div>
              </form>
            )}

            {notes.map(n => (
              <div key={n.id} className="wp-note-card">
                {editingNote?.id === n.id ? (
                  <div className="wp-note-edit">
                    <input className="wp-input" placeholder="Note title *"
                      value={editNoteDraft.title}
                      onChange={e => setEditNoteDraft(d => ({ ...d, title: e.target.value }))} />
                    <input className="wp-input" placeholder="Short description (optional)"
                      value={editNoteDraft.description}
                      onChange={e => setEditNoteDraft(d => ({ ...d, description: e.target.value }))} />
                    <RichEditor
                      content={editNoteDraft.content}
                      onChange={html => setEditNoteDraft(d => ({ ...d, content: html }))}
                      placeholder="Edit note content…"
                    />
                    <div className="wp-btn-row" style={{ marginTop: 6 }}>
                      <button className="wp-btn-primary" style={{ fontSize: 11 }} onClick={updateNote}>Save</button>
                      <button className="wp-btn-secondary" style={{ fontSize: 11 }} onClick={() => setEditingNote(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {n.title && <div className="wp-note-title">{n.title}</div>}
                    {n.description && <div className="wp-note-desc-display">{n.description}</div>}
                    <div className="wp-note-content rich-display" dangerouslySetInnerHTML={{ __html: n.content }} />
                    <div className="wp-note-meta">
                      <span>{fmtDate(n.created_at)}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="wp-btn-secondary" style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => { setEditingNote(n); setEditNoteDraft({ title: n.title || '', description: n.description || '', content: n.content }) }}>✏️</button>
                        <button className="wp-btn-danger" style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => deleteNote(n.id)}>🗑</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function WpGreeting({ user, pages }) {
  const hour = new Date().getHours()
  const timeLabel = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING'
  const name  = user?.firstname?.toUpperCase() || 'DEV'
  const uname = user?.username || 'user'

  return (
    <div className="wp-greeting">
      <div className="wp-terminal">
        <div className="wpt-line cmd">$ dashboard --user {uname}</div>
        <div className="wpt-line hi">GOOD {timeLabel}, {name} 👋</div>
        <div className="wpt-sep" />
        <div className="wpt-line dim">{pages.length} page{pages.length !== 1 ? 's' : ''} registered in your browsing vault</div>
        <div className="wpt-sep" />
        <div className="wpt-line cmd">$ ./webpages --help</div>
        <div className="wpt-block">
          <div className="wpt-row"><span className="wpt-k">☰ Pages (left)</span><span className="wpt-v">browse, filter, sort &amp; add pages</span></div>
          <div className="wpt-row"><span className="wpt-k">✏ pencil</span><span className="wpt-v">edit title or description — URL is locked 🔒</span></div>
          <div className="wpt-row"><span className="wpt-k">📝 Notes (right)</span><span className="wpt-v">rich notes per page — headings, lists, code</span></div>
          <div className="wpt-row"><span className="wpt-k">↗ New tab</span><span className="wpt-v">open page externally if iframe blocks it</span></div>
          <div className="wpt-row"><span className="wpt-k">☀️ / 🌙</span><span className="wpt-v">toggle light / dark theme from the topbar</span></div>
          <div className="wpt-row"><span className="wpt-k">Esc / ⊟</span><span className="wpt-v">minimize back to dashboard</span></div>
        </div>
        <div className="wpt-line cmd dim">$ █</div>
      </div>
    </div>
  )
}
