import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import useLocalStorage from '../hooks/useLocalStorage'
import './WebPages.css'

const NOTE_COLORS = ['var(--blue)', 'var(--green)', 'var(--peach)', 'var(--mauve)', 'var(--teal)', 'var(--red)']

export default function WebPages() {
  const [staticPages, setStaticPages] = useState([])
  const [extraPages, setExtraPages]   = useLocalStorage('web_pages_extra', [])
  const [selectedId, setSelectedId]   = useState(null)

  const [notes, setNotes]   = useState([])
  const [draft, setDraft]   = useState('')
  const [saved, setSaved]   = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [newPage, setNewPage] = useState({ title: '', url: '' })

  // Load static pages from config
  useEffect(() => {
    fetch('/api/static/webpages')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setStaticPages(data)
          setSelectedId(data[0].url)
        }
      })
      .catch(() => {})
  }, [])

  // Load notes whenever selected page changes
  useEffect(() => {
    if (!selectedId) return
    setNotes([])
    fetch(`/api/web-notes?page_id=${encodeURIComponent(selectedId)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setNotes(data) })
      .catch(() => {})
  }, [selectedId])

  const allPages = [...staticPages, ...extraPages]
  const selected = allPages.find(p => p.url === selectedId)
  const hasRealUrl = selected?.url && !selected.url.startsWith('page-') && selected.url.startsWith('http')

  async function saveNote() {
    if (!draft.trim() || !selectedId) return
    const res = await fetch('/api/web-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: selectedId, page_title: selected?.title ?? '', content: draft.trim() }),
    })
    const created = await res.json()
    setNotes(n => [created, ...n])
    setDraft('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function deleteNote(id) {
    await fetch(`/api/web-notes/${id}`, { method: 'DELETE' })
    setNotes(n => n.filter(x => x.id !== id))
  }

  function addPage() {
    const title = newPage.title.trim()
    if (!title) return
    let url = newPage.url.trim()
    if (url && !url.startsWith('http')) url = `https://${url}`
    if (!url) url = `page-${Date.now()}`
    const page = { title, url, description: '' }
    setExtraPages(p => [page, ...p])
    setSelectedId(url)
    setNewPage({ title: '', url: '' })
    setAddOpen(false)
  }

  function removePage(url) {
    setExtraPages(p => p.filter(x => x.url !== url))
    if (selectedId === url) setSelectedId(allPages.find(p => p.url !== url)?.url ?? null)
  }

  return (
    <Card>
      <SectionHeader
        icon="🌐"
        title="Web Pages"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Chip color="var(--teal)" small>{allPages.length} pages</Chip>
            <button
              className={`btn-g${addOpen ? ' on' : ''}`}
              style={{ fontSize: 11, padding: '3px 10px' }}
              onClick={() => setAddOpen(v => !v)}
            >
              + Add page
            </button>
          </div>
        }
      />

      {/* Add page form */}
      {addOpen && (
        <div className="wp-add-form">
          <input
            className="fld"
            placeholder="Page name / title (required)…"
            value={newPage.title}
            autoFocus
            onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addPage()}
          />
          <input
            className="fld"
            placeholder="URL — e.g. https://wikipedia.org (optional)"
            value={newPage.url}
            onChange={e => setNewPage(p => ({ ...p, url: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addPage()}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-p" style={{ fontSize: 12, padding: '5px 14px' }} onClick={addPage}>Save</button>
            <button className="btn-g" style={{ fontSize: 12 }} onClick={() => setAddOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="wp-layout">
        {/* ── Sidebar ── */}
        <div className="wp-sidebar">
          {allPages.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--ov0)', lineHeight: 1.5, padding: '8px 0' }}>
              No pages yet.<br />Click "+ Add page".
            </p>
          )}
          {allPages.map(p => {
            const isExtra = extraPages.some(e => e.url === p.url)
            return (
              <div
                key={p.url}
                className={`wp-page-item${selectedId === p.url ? ' on' : ''}`}
                onClick={() => setSelectedId(p.url)}
              >
                <div className="wp-page-title">{p.title}</div>
                {hasRealUrl && p.url === selectedId && (
                  <div className="wp-page-domain">
                    {p.url.replace(/^https?:\/\//, '').split('/')[0]}
                  </div>
                )}
                {isExtra && (
                  <button
                    className="wp-page-rm"
                    onClick={e => { e.stopPropagation(); removePage(p.url) }}
                    title="Remove"
                  >✕</button>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Main panel ── */}
        <div className="wp-main">
          {!selected ? (
            <p className="empty-msg">Select a page from the sidebar.</p>
          ) : (
            <>
              {/* Page header row */}
              <div className="wp-page-hdr">
                <div className="wp-page-name">{selected.title}</div>
                {hasRealUrl && (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                    className="wp-open-link"
                  >
                    Open in new tab ↗
                  </a>
                )}
              </div>

              {/* Live iframe — shows the actual page */}
              {hasRealUrl && (
                <div className="wp-iframe-wrap">
                  <iframe
                    key={selected.url}
                    src={selected.url}
                    title={selected.title}
                    className="wp-iframe"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                  <div className="wp-iframe-overlay-msg">
                    ℹ️ Some sites block embedding. Use "Open in new tab" if the page doesn't appear.
                  </div>
                </div>
              )}

              {/* Notes section */}
              <div className="wp-notes-section">
                <div className="wp-notes-hdr">
                  <span>📝 Notes for this page</span>
                  {saved && <span className="wp-saved">✓ Saved!</span>}
                </div>
                <textarea
                  className="fld"
                  rows={3}
                  placeholder="Write a note about this page… (Ctrl+Enter to save)"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveNote() }}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn-p" style={{ fontSize: 12, padding: '5px 14px' }} onClick={saveNote}>
                    💾 Save note
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--ov0)' }}>
                    {notes.length} note{notes.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {notes.length > 0 && (
                  <div className="wp-notes-list">
                    {notes.map((n, i) => (
                      <div key={n.id} className="wp-note" style={{ borderLeftColor: NOTE_COLORS[i % NOTE_COLORS.length] }}>
                        <div className="wp-note-text">{n.content}</div>
                        <div className="wp-note-foot">
                          <span>{n.created_at?.slice(0, 16).replace('T', ' ')}</span>
                          <button className="btn-i danger" onClick={() => deleteNote(n.id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
