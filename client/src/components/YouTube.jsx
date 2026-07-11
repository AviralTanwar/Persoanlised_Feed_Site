import { useState, useEffect, useRef } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import RichEditor from './shared/RichEditor'
import './YouTube.css'
import './WebPages.css'

const isEmptyHtml = h => !h || h.replace(/<[^>]*>/g, '').trim() === ''
const MAX_NOTES = 5

function fmtDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parseEmbedUrl(raw) {
  try {
    const u = new URL(raw.trim())
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return raw.trim()
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    }
  } catch {}
  return null
}

export default function YouTube({ viewKpi = {} }) {
  const viewId    = viewKpi.id   ?? null
  const viewTitle = viewKpi.name || 'YouTube Viewer'

  const [expanded,      setExpanded]      = useState(false)
  const [miniCollapsed, setMiniCollapsed] = useState(() => localStorage.getItem('yt_mini_collapsed') === 'true')

  const [videos,      setVideos]      = useState([])
  const [activeVideo, setActiveVideo] = useState(null)
  const [notes,       setNotes]       = useState([])

  const [leftOpen,   setLeftOpen]   = useState(true)
  const [leftWidth,  setLeftWidth]  = useState(() => parseInt(localStorage.getItem('yt_left_w')  || '240', 10))
  const [rightOpen,  setRightOpen]  = useState(true)
  const [rightWidth, setRightWidth] = useState(() => parseInt(localStorage.getItem('yt_right_w') || '300', 10))

  const sidebarLeftRef  = useRef(null)
  const sidebarRightRef = useRef(null)

  const [sortField, setSortFieldRaw] = useState(() => localStorage.getItem('yt_sort_field') || 'created_at')
  const [sortDir,   setSortDirRaw]   = useState(() => localStorage.getItem('yt_sort_dir')   || 'desc')
  const [filterText, setFilterText]  = useState('')

  function setSortField(v) { setSortFieldRaw(v); localStorage.setItem('yt_sort_field', v) }
  function setSortDir(v)   { setSortDirRaw(v);   localStorage.setItem('yt_sort_dir',   v) }

  const [addingVideo,    setAddingVideo]    = useState(false)
  const [videoDraft,     setVideoDraft]     = useState({ url: '', title: '', channel: '' })
  const [videoErr,       setVideoErr]       = useState('')
  const [editingVideo,   setEditingVideo]   = useState(null)
  const [editVideoDraft, setEditVideoDraft] = useState({ title: '', channel: '' })

  const [addingNote,    setAddingNote]    = useState(false)
  const [noteDraft,     setNoteDraft]     = useState({ title: '', content: '' })
  const [editingNote,   setEditingNote]   = useState(null)
  const [editNoteDraft, setEditNoteDraft] = useState({ title: '', content: '' })

  function loadVideos() {
    fetch('/api/notes?entityType=youtube')
      .then(r => r.json())
      .then(rows => {
        if (Array.isArray(rows)) {
          const active = rows.filter(r => r.deleted_at === '0000-00-00 00:00:00')
          setVideos(active)
          setActiveVideo(v => v ? (active.find(a => a.id === v.id) || null) : null)
        }
      })
      .catch(() => {})
  }

  useEffect(() => { loadVideos() }, [])

  useEffect(() => {
    if (!activeVideo) { setNotes([]); return }
    fetch(`/api/notes/${activeVideo.id}/data`)
      .then(r => r.json())
      .then(rows => setNotes(Array.isArray(rows) ? rows.filter(n => n.deleted_at === '0000-00-00 00:00:00') : []))
      .catch(() => setNotes([]))
  }, [activeVideo?.id])

  useEffect(() => {
    if (!expanded) return
    const fn = e => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [expanded])

  function onLeftResizeStart(e) {
    e.preventDefault()
    const el = sidebarLeftRef.current
    if (el) el.classList.add('resizing')
    const startX = e.clientX, startW = leftWidth
    let curW = startW
    const onMove = ev => {
      curW = Math.min(400, Math.max(160, startW + ev.clientX - startX))
      if (el) el.style.width = curW + 'px'
    }
    const onUp = () => {
      if (el) el.classList.remove('resizing')
      setLeftWidth(curW); localStorage.setItem('yt_left_w', String(curW))
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
    const startX = e.clientX, startW = rightWidth
    let curW = startW
    const onMove = ev => {
      curW = Math.min(480, Math.max(200, startW + startX - ev.clientX))
      if (el) el.style.width = curW + 'px'
    }
    const onUp = () => {
      if (el) el.classList.remove('resizing')
      setRightWidth(curW); localStorage.setItem('yt_right_w', String(curW))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  async function addVideo(e) {
    e.preventDefault()
    setVideoErr('')
    if (!videoDraft.title.trim()) { setVideoErr('Title is required'); return }
    const embedUrl = parseEmbedUrl(videoDraft.url)
    if (!embedUrl) { setVideoErr('Invalid YouTube URL (paste a watch, share, or embed URL)'); return }
    if (!viewId) { setVideoErr('View not ready — try again in a moment'); return }
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: 'youtube', entity_id: embedUrl, view_id: viewId,
        title: videoDraft.title.trim(), description: videoDraft.channel.trim(), url: embedUrl,
      }),
    })
    if (!res.ok) { const d = await res.json(); setVideoErr(d.error || 'Failed to add'); return }
    setVideoDraft({ url: '', title: '', channel: '' })
    setAddingVideo(false)
    loadVideos()
  }

  async function updateVideo() {
    if (!editingVideo) return
    const updated = await fetch(`/api/notes/${editingVideo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editVideoDraft.title.trim(), description: editVideoDraft.channel.trim() }),
    }).then(r => r.json())
    setVideos(vs => vs.map(v => v.id === updated.id ? updated : v))
    if (activeVideo?.id === updated.id) setActiveVideo(updated)
    setEditingVideo(null)
  }

  async function deleteVideo(id) {
    if (!window.confirm('Remove this video? Its notes will also be deleted.')) return
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (activeVideo?.id === id) { setActiveVideo(null); setNotes([]) }
    loadVideos()
  }

  async function createNote(e) {
    e.preventDefault()
    if (isEmptyHtml(noteDraft.content) || !activeVideo) return
    if (notes.length >= MAX_NOTES) { alert(`Max ${MAX_NOTES} notes per video`); return }
    const n = await fetch(`/api/notes/${activeVideo.id}/data`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: noteDraft.title.trim(), content: noteDraft.content.trim() }),
    }).then(r => r.json())
    setNotes(ns => [...ns, n])
    setNoteDraft({ title: '', content: '' })
    setAddingNote(false)
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

  function toggleMiniCollapsed(val) {
    setMiniCollapsed(val)
    localStorage.setItem('yt_mini_collapsed', String(val))
  }

  const visibleVideos = [...videos]
    .filter(v => !filterText || v.title.toLowerCase().includes(filterText.toLowerCase()) || (v.description || '').toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      const va = (a[sortField] || '').toLowerCase()
      const vb = (b[sortField] || '').toLowerCase()
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  // ── Slim strip ──────────────────────────────────────────────────────────────
  if (!expanded && miniCollapsed) {
    return (
      <Card className="wp-mini-card wp-mini-card--slim">
        <div className="wp-mini-slim">
          <div className="wp-mini-slim-left">
            <span className="wp-mini-slim-icon">🎬</span>
            <span className="wp-mini-slim-title">{viewTitle}</span>
            <span className="wp-mini-slim-badge">{videos.length}</span>
          </div>
          <div className="wp-mini-slim-right">
            <button className="wp-tb-btn" onClick={() => toggleMiniCollapsed(false)}>▶ Show</button>
            <button className="wp-expand-btn" onClick={() => setExpanded(true)}>⤢ Launch</button>
          </div>
        </div>
      </Card>
    )
  }

  // ── Mini card ───────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <Card className="wp-mini-card">
        <div className="wp-mini-header">
          <SectionHeader icon="🎬" title={viewTitle} />
          <div className="wp-mini-header-right">
            <button className="wp-tb-btn" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => toggleMiniCollapsed(true)}>◀ Hide</button>
            <button className="wp-expand-btn" onClick={() => setExpanded(true)}>⤢ Launch</button>
          </div>
        </div>
        <div className="wp-mini-body">
          <div className="wp-mini-stat">
            <span className="wp-mini-count">{videos.length}</span>
            {' '}video{videos.length !== 1 ? 's' : ''} saved
          </div>
          {videos.length > 0 ? (
            <div className="wp-mini-pages">
              {videos.slice(0, 4).map(v => (
                <button key={v.id} className="wp-mini-page-btn"
                  onClick={() => { setExpanded(true); setActiveVideo(v) }}>
                  <span className="wp-mini-dot">▶</span>
                  <span className="wp-mini-page-title">{v.title}</span>
                  <span className="wp-mini-arrow">↗</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="wp-mini-empty">No videos yet — launch to add one.</p>
          )}
        </div>
      </Card>
    )
  }

  // ── Full-screen overlay ─────────────────────────────────────────────────────
  return (
    <div className="wp-overlay">
      <div className="wp-topbar">
        <div className="wp-topbar-left">
          <span className="wp-topbar-icon">🎬</span>
          <span className="wp-topbar-title">{viewTitle}</span>
          {activeVideo && (
            <><span className="wp-topbar-sep">/</span>
            <span className="wp-topbar-page">{activeVideo.title}</span></>
          )}
        </div>
        <div className="wp-topbar-right">
          <button className={`wp-tb-btn${leftOpen ? ' on' : ''}`} onClick={() => setLeftOpen(o => !o)}>
            ☰ Videos
          </button>
          <button className={`wp-tb-btn${rightOpen ? ' on' : ''}`} onClick={() => setRightOpen(o => !o)}>
            📝 Notes{notes.length > 0 ? ` (${notes.length})` : ''}
          </button>
          <button className="wp-tb-minimize" onClick={() => setExpanded(false)} title="Minimize (Esc)">
            ⊟ Minimize
          </button>
        </div>
      </div>

      <div className="wp-body">

        {/* ── Left sidebar: video list ── */}
        <aside
          ref={sidebarLeftRef}
          className={`wp-left${leftOpen ? '' : ' hidden'}`}
          style={leftOpen ? { width: leftWidth, minWidth: leftWidth } : {}}>

          <div className="wp-left-controls">
            <input
              className="wp-filter-input"
              placeholder="🔍 Filter videos..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
            <div className="wp-sort-bar">
              <select className="wp-sort-select" value={sortField}
                onChange={e => setSortField(e.target.value)}>
                <option value="created_at">Date Added</option>
                <option value="title">Title</option>
              </select>
              <button className="wp-sort-dir"
                onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>

          <div className="wp-page-list">
            {visibleVideos.map(v => (
              <div key={v.id} className={`wp-page-item${activeVideo?.id === v.id ? ' active' : ''}`}>
                {editingVideo?.id === v.id ? (
                  <div className="wp-page-edit-form" onClick={e => e.stopPropagation()}>
                    <input className="wp-input" value={editVideoDraft.title} autoFocus
                      placeholder="Title"
                      onChange={e => setEditVideoDraft(d => ({ ...d, title: e.target.value }))} />
                    <input className="wp-input" value={editVideoDraft.channel}
                      placeholder="Channel (optional)"
                      onChange={e => setEditVideoDraft(d => ({ ...d, channel: e.target.value }))} />
                    <div className="wp-btn-row" style={{ marginTop: 4 }}>
                      <button className="wp-btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={updateVideo}>Save</button>
                      <button className="wp-btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setEditingVideo(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="wp-page-body" onClick={() => setActiveVideo(v)}>
                    <div className="wp-page-title">▶ {v.title}</div>
                    {v.description && <div className="wp-page-desc">{v.description}</div>}
                    <div className="wp-page-footer">
                      <span className="wp-page-date">{fmtDate(v.created_at)}</span>
                      <div className="wp-page-actions">
                        <button className="wp-page-act" title="Edit title / channel"
                          onClick={e => { e.stopPropagation(); setEditingVideo(v); setEditVideoDraft({ title: v.title, channel: v.description || '' }) }}>✏</button>
                        <button className="wp-page-act danger" title="Remove video"
                          onClick={e => { e.stopPropagation(); deleteVideo(v.id) }}>🗑</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filterText && visibleVideos.length === 0 && (
              <p className="wp-no-results">No videos match "{filterText}"</p>
            )}

            {addingVideo ? (
              <form className="wp-add-form" onSubmit={addVideo}>
                <input className="wp-input" placeholder="YouTube URL *" autoFocus
                  value={videoDraft.url} onChange={e => setVideoDraft(d => ({ ...d, url: e.target.value }))}
                  onKeyDown={e => e.key === 'Escape' && setAddingVideo(false)} />
                <input className="wp-input" placeholder="Title *" style={{ marginTop: 5 }}
                  value={videoDraft.title} onChange={e => setVideoDraft(d => ({ ...d, title: e.target.value }))} />
                <input className="wp-input" placeholder="Channel (optional)" style={{ marginTop: 5 }}
                  value={videoDraft.channel} onChange={e => setVideoDraft(d => ({ ...d, channel: e.target.value }))} />
                {videoErr && <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 4, display: 'block' }}>⚠️ {videoErr}</span>}
                <div className="wp-btn-row" style={{ marginTop: 6 }}>
                  <button className="wp-btn-primary" type="submit">Add</button>
                  <button className="wp-btn-secondary" type="button"
                    onClick={() => { setAddingVideo(false); setVideoErr(''); setVideoDraft({ url: '', title: '', channel: '' }) }}>Cancel</button>
                </div>
              </form>
            ) : (
              <button className="wp-new-btn" onClick={() => setAddingVideo(true)}>+ Add Video</button>
            )}
          </div>
        </aside>

        {leftOpen && <div className="wp-resize-handle" onMouseDown={onLeftResizeStart} />}

        {/* ── Main area: player ── */}
        <div className="wp-main">
          {!activeVideo ? (
            <YtGreeting videos={videos} />
          ) : (
            <div className="wp-content-wrap">
              <div className="wp-content-topbar">
                <span className="wp-content-title">▶ {activeVideo.title}</span>
                <div className="wp-content-actions">
                  <a href={`https://www.youtube.com/watch?v=${activeVideo.entity_id?.split('/embed/')[1]}`}
                    target="_blank" rel="noreferrer" className="wp-external-link">↗ YouTube</a>
                  <button className="wp-close-btn" onClick={() => setActiveVideo(null)}>✕ Close</button>
                </div>
              </div>
              <div className="yt-player-fill">
                <iframe
                  key={activeVideo.id}
                  src={`${activeVideo.entity_id}?rel=0&modestbranding=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>

        {rightOpen && <div className="wp-resize-handle" onMouseDown={onRightResizeStart} />}

        {/* ── Right sidebar: notes ── */}
        <aside
          ref={sidebarRightRef}
          className={`wp-right${rightOpen ? '' : ' hidden'}`}
          style={rightOpen ? { width: rightWidth, minWidth: rightWidth } : {}}>

          <div className="wp-right-header">
            <span className="wp-right-title">
              📝 Notes{activeVideo ? ` (${notes.length}/${MAX_NOTES})` : ''}
            </span>
            {activeVideo && notes.length < MAX_NOTES && !addingNote && (
              <button className="wp-btn-secondary"
                style={{ fontSize: 10, padding: '3px 8px' }}
                onClick={() => { setAddingNote(true); setNoteDraft({ title: '', content: '' }) }}>
                + Add
              </button>
            )}
          </div>

          <div className="wp-notes-list">
            {!activeVideo && (
              <p className="wp-right-empty">← Select a video to view its notes.</p>
            )}
            {activeVideo && notes.length === 0 && !addingNote && (
              <p className="wp-right-empty">No notes yet for this video.</p>
            )}
            {activeVideo && addingNote && (
              <form className="wp-note-form" onSubmit={createNote}>
                <input className="wp-input" placeholder="Note title (optional)"
                  value={noteDraft.title} onChange={e => setNoteDraft(d => ({ ...d, title: e.target.value }))} />
                <RichEditor
                  content={noteDraft.content}
                  onChange={html => setNoteDraft(d => ({ ...d, content: html }))}
                  placeholder="Write your note…"
                />
                <div className="wp-btn-row" style={{ marginTop: 6 }}>
                  <button className="wp-btn-primary" type="submit">💾 Save</button>
                  <button className="wp-btn-secondary" type="button" onClick={() => setAddingNote(false)}>Cancel</button>
                </div>
              </form>
            )}
            {notes.map(n => (
              <div key={n.id} className="wp-note-card">
                {editingNote?.id === n.id ? (
                  <div className="wp-note-edit">
                    <input className="wp-input" placeholder="Note title (optional)"
                      value={editNoteDraft.title}
                      onChange={e => setEditNoteDraft(d => ({ ...d, title: e.target.value }))} />
                    <RichEditor
                      content={editNoteDraft.content}
                      onChange={html => setEditNoteDraft(d => ({ ...d, content: html }))}
                      placeholder="Edit note…"
                    />
                    <div className="wp-btn-row" style={{ marginTop: 6 }}>
                      <button className="wp-btn-primary" style={{ fontSize: 11 }} onClick={updateNote}>Save</button>
                      <button className="wp-btn-secondary" style={{ fontSize: 11 }} onClick={() => setEditingNote(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {n.title && <div className="wp-note-title">{n.title}</div>}
                    <div className="wp-note-content rich-display" dangerouslySetInnerHTML={{ __html: n.content }} />
                    <div className="wp-note-meta">
                      <span>{fmtDate(n.created_at)}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="wp-btn-secondary" style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => { setEditingNote(n); setEditNoteDraft({ title: n.title || '', content: n.content }) }}>✏️</button>
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

function YtGreeting({ videos }) {
  return (
    <div className="wp-greeting">
      <div className="wp-terminal">
        <div className="wpt-line cmd">$ youtube-viewer --list</div>
        <div className="wpt-line hi">YOUR VIDEO LIBRARY 🎬</div>
        <div className="wpt-sep" />
        <div className="wpt-line dim">{videos.length} video{videos.length !== 1 ? 's' : ''} in your collection</div>
        <div className="wpt-sep" />
        <div className="wpt-line cmd">$ ./youtube --help</div>
        <div className="wpt-block">
          <div className="wpt-row"><span className="wpt-k">☰ Videos (left)</span><span className="wpt-v">browse, filter, sort &amp; add videos</span></div>
          <div className="wpt-row"><span className="wpt-k">▶ click video</span><span className="wpt-v">load player in this main area</span></div>
          <div className="wpt-row"><span className="wpt-k">✏ pencil</span><span className="wpt-v">edit title or channel name</span></div>
          <div className="wpt-row"><span className="wpt-k">📝 Notes (right)</span><span className="wpt-v">rich notes per video — headings, lists, code</span></div>
          <div className="wpt-row"><span className="wpt-k">Esc / ⊟</span><span className="wpt-v">minimize back to dashboard</span></div>
        </div>
        <div className="wpt-line cmd dim">$ █</div>
      </div>
    </div>
  )
}
