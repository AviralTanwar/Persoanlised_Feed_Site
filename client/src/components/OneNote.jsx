import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import Chip from './shared/Chip'
import './OneNote.css'

function fmtDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function renderMd(text) {
  if (!text) return null
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

const BLANK_FORM = { notebook_name: 'Dev Notes', title: '', body: '' }

export default function OneNote() {
  const [pages, setPages]       = useState([])
  const [selId, setSelId]       = useState(null)
  const [mode, setMode]         = useState('view')  // 'view' | 'edit' | 'new'
  const [form, setForm]         = useState(BLANK_FORM)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  function load() {
    fetch('/api/onenote')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPages(data)
          setSelId(s => s ?? data[0]?.id ?? null)
        }
      })
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const page = pages.find(p => p.id === selId)

  const notebooks = [...new Set(pages.map(p => p.notebook_name))]

  function startNew() {
    setForm(BLANK_FORM)
    setErr('')
    setMode('new')
  }

  function startEdit() {
    if (!page) return
    setForm({ notebook_name: page.notebook_name, title: page.title, body: page.body || '' })
    setErr('')
    setMode('edit')
  }

  async function saveNew(e) {
    e.preventDefault()
    if (!form.title.trim()) { setErr('Title is required'); return }
    setSaving(true)
    const res = await fetch('/api/onenote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook_name: form.notebook_name || 'Dev Notes', title: form.title.trim(), body: form.body }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setErr(d.error || 'Failed to save'); return }
    const created = await res.json()
    setPages(ps => [created, ...ps])
    setSelId(created.id)
    setMode('view')
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setErr('Title is required'); return }
    setSaving(true)
    const res = await fetch(`/api/onenote/${selId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook_name: form.notebook_name, title: form.title.trim(), body: form.body }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setErr(d.error || 'Failed to save'); return }
    const updated = await res.json()
    setPages(ps => ps.map(p => p.id === updated.id ? updated : p))
    setMode('view')
  }

  async function deletePage(id) {
    if (!confirm('Delete this page permanently?')) return
    await fetch(`/api/onenote/${id}`, { method: 'DELETE' })
    setPages(ps => ps.filter(p => p.id !== id))
    setSelId(s => {
      if (s !== id) return s
      const remaining = pages.filter(p => p.id !== id)
      return remaining[0]?.id ?? null
    })
    if (mode !== 'view') setMode('view')
  }

  function cancelForm() {
    setMode('view')
    setErr('')
  }

  const pagesByNotebook = notebooks.map(nb => ({
    name: nb,
    pages: pages.filter(p => p.notebook_name === nb),
  }))

  const formEl = (
    <form onSubmit={mode === 'new' ? saveNew : saveEdit} className="on-form">
      <div className="on-form-row">
        <label className="on-form-lbl">Notebook</label>
        <input className="fld" value={form.notebook_name}
          onChange={e => setForm(f => ({ ...f, notebook_name: e.target.value }))}
          placeholder="Notebook name" />
      </div>
      <div className="on-form-row">
        <label className="on-form-lbl">Title <span style={{ color: 'var(--red)' }}>*</span></label>
        <input className="fld" autoFocus value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Page title" />
      </div>
      <div className="on-form-row" style={{ flex: 1 }}>
        <label className="on-form-lbl">Content (Markdown)</label>
        <textarea className="fld on-body-input" value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder={'## Heading\n\n- Bullet point\n- Another point\n\n```\ncode block\n```'} />
      </div>
      {err && <span style={{ color: 'var(--red)', fontSize: 11 }}>⚠️ {err}</span>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-p" type="submit" disabled={saving} style={{ fontSize: 12, padding: '5px 16px' }}>
          {saving ? 'Saving…' : '💾 Save'}
        </button>
        <button className="btn-g" type="button" style={{ fontSize: 12, padding: '5px 16px' }} onClick={cancelForm}>
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <Card>
      <SectionHeader
        icon="📓"
        title="OneNote"
        right={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {notebooks.map(nb => (
              <Chip key={nb} color="var(--mauve)" small>{nb}</Chip>
            ))}
            <button className="btn-g" style={{ fontSize: 11, padding: '3px 10px' }} onClick={startNew}>+ New page</button>
          </div>
        }
      />
      <div className="on-layout">
        <div className="on-sidebar">
          {pagesByNotebook.map(({ name, pages: nbPages }) => (
            <div key={name} className="on-nb-group">
              <div className="on-nb-label">{name}</div>
              {nbPages.map(p => (
                <div key={p.id} className={`on-item-wrap${selId === p.id ? ' on' : ''}`}>
                  <button
                    className={`on-item${selId === p.id ? ' on' : ''}`}
                    onClick={() => { setSelId(p.id); setMode('view') }}
                  >
                    <div className="on-item-title">{p.title}</div>
                    <div className="on-item-meta">{fmtDate(p.updated_at)}</div>
                  </button>
                  <div className="on-item-actions">
                    <button className="btn-i" style={{ fontSize: 11 }} title="Edit"
                      onClick={() => { setSelId(p.id); startEdit() }}>✏️</button>
                    <button className="btn-i danger" style={{ fontSize: 11 }} title="Delete"
                      onClick={() => deletePage(p.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {pages.length === 0 && (
            <p style={{ color: 'var(--ov0)', fontSize: 12, padding: '8px 4px' }}>No pages yet. Click + New page.</p>
          )}
        </div>

        <div className="on-reader">
          {(mode === 'new' || mode === 'edit') ? formEl : page ? (
            <>
              <div className="on-reader-hdr">
                <div>
                  <div className="on-reader-title">{page.title}</div>
                  <div className="on-reader-meta">📁 {page.notebook_name} · Modified {fmtDate(page.updated_at)}</div>
                </div>
                <button className="btn-g" style={{ fontSize: 11, padding: '3px 10px', alignSelf: 'flex-start' }} onClick={startEdit}>
                  ✏️ Edit
                </button>
              </div>
              <div className="on-reader-body">{renderMd(page.body)}</div>
            </>
          ) : (
            <p style={{ color: 'var(--ov0)', fontSize: 12, margin: '8px 0' }}>Select a page or create a new one.</p>
          )}
        </div>
      </div>
    </Card>
  )
}
