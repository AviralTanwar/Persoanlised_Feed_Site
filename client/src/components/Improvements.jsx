import { useState, useEffect, useRef } from 'react'
import './Improvements.css'

const COLUMNS = [
  { key: 'pending',     label: 'Pending',     emoji: '⬜', color: 'var(--blue)'   },
  { key: 'in_progress', label: 'In Progress', emoji: '🔶', color: 'var(--peach)'  },
  { key: 'hold',        label: 'On Hold',     emoji: '⏸️', color: 'var(--yellow)' },
  { key: 'done',        label: 'Implemented', emoji: '✅', color: 'var(--green)'  },
]
const PRIORITY = {
  high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: '#ef4444', label: '🔴 High'   },
  medium: { color: '#f97316', bg: 'rgba(249,115,22,0.10)', border: '#f97316', label: '🟠 Medium' },
  low:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: '#3b82f6', label: '🔵 Low'    },
}

function fmtDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Improvements() {
  const [open, setOpen]           = useState(false)
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [addingIn, setAddingIn]   = useState(null)
  const [newItem, setNewItem]     = useState({ title: '', detail: '', priority: 'medium' })
  const [editing, setEditing]     = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [hoveredId, setHoveredId] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [remarkDraft, setRemarkDraft] = useState({})
  const addInputRef = useRef(null)

  useEffect(() => {
    fetch('/api/improvements')
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (addingIn && addInputRef.current) addInputRef.current.focus()
  }, [addingIn])

  // Lock body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function addItem(status) {
    if (!newItem.title.trim()) { setAddingIn(null); return }
    const res = await fetch('/api/improvements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, status }),
    })
    const created = await res.json()
    setItems(prev => [created, ...prev])
    setNewItem({ title: '', detail: '', priority: 'medium' })
    setAddingIn(null)
  }

  async function patch(id, fields) {
    const res = await fetch(`/api/improvements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const updated = await res.json()
    setItems(prev => prev.map(x => x.id === id ? updated : x))
    return updated
  }

  async function deleteItem(id) {
    await fetch(`/api/improvements/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(x => x.id !== id))
    setEditing(null)
  }

  function openEdit(item) {
    setEditing(item)
    setEditDraft({ title: item.title, detail: item.detail || '', remark: item.remark || '', priority: item.priority, status: item.status })
  }
  async function saveEdit() { await patch(editing.id, editDraft); setEditing(null) }

  // ── Remark (inline, always visible on the card) ──────────────────────────
  function saveRemark(item) {
    const draft = remarkDraft[item.id]
    if (draft !== undefined && draft !== (item.remark || '')) {
      patch(item.id, { remark: draft })
    }
    setRemarkDraft(d => { const n = { ...d }; delete n[item.id]; return n })
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  function onDragStart(e, id) {
    // Don't start a drag when the pointer is in the remark box or a button —
    // let the user select/edit text instead.
    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) { e.preventDefault(); return }
    e.dataTransfer.setData('impId', String(id))
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => setDraggingId(id), 0)
  }
  function onDragEnd()            { setDraggingId(null) }
  function onDragEnter(e, col)    { e.preventDefault(); setDragOverCol(col) }
  function onDragOver(e)          { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  function onDragLeave(e)         { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null) }
  async function onDrop(e, newStatus) {
    e.preventDefault(); setDragOverCol(null)
    const id = Number(e.dataTransfer.getData('impId'))
    const item = items.find(x => x.id === id)
    if (item && item.status !== newStatus) await patch(id, { status: newStatus })
  }

  const kpiItems = items.filter(x => x.is_kpi === 1)
  const colItems = key => items.filter(x => x.status === key)

  return (
    <>
      {/* ── FAB ── */}
      <button className="imp-fab" onClick={() => setOpen(true)} title="Improvements & Feedback">
        <span className="imp-fab-icon">💡</span>
        <span className="imp-fab-label">Improvements &amp; Feedback</span>
      </button>

      {/* ── Panel overlay ── */}
      {open && (
        <div className="imp-panel-overlay" onClick={() => setOpen(false)}>
          <div className="imp-panel" onClick={e => e.stopPropagation()}>

            <div className="imp-panel-hdr">
              <div className="imp-panel-hdr-left">
                <span className="imp-panel-icon">💡</span>
                <span className="imp-panel-title">Improvements &amp; Feedback</span>
                {kpiItems.length > 0 && (
                  <span className="imp-panel-kpi-badge">{kpiItems.length} pinned</span>
                )}
              </div>
              <button className="imp-modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="imp-panel-body">
              {/* ── KPI strip ── */}
              {kpiItems.length > 0 && (
                <div className="imp-kpi-strip">
                  <div className="imp-kpi-strip-label">📌 Pinned KPIs</div>
                  <div className="imp-kpi-cards">
                    {kpiItems.map(item => {
                      const p = PRIORITY[item.priority] || PRIORITY.medium
                      return (
                        <div key={item.id} className="imp-kpi-card" style={{ borderColor: p.border, background: p.bg }}>
                          <div className="imp-kpi-card-inner">
                            <span className="imp-kpi-badge" style={{ color: p.color }}>{p.label}</span>
                            <div className="imp-kpi-title">{item.title}</div>
                          </div>
                          <button className="imp-kpi-unpin" title="Unpin" onClick={() => patch(item.id, { is_kpi: 0 })}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {loading ? <p className="imp-empty">Loading…</p> : (
                <div className="imp-kanban">
                  {COLUMNS.map(col => (
                    <div key={col.key}
                      className={`imp-col${dragOverCol === col.key ? ' drag-over' : ''}`}
                      onDragEnter={e => onDragEnter(e, col.key)}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={e => onDrop(e, col.key)}
                    >
                      <div className="imp-col-header" style={{ borderBottomColor: col.color }}>
                        <span style={{ color: col.color }}>{col.emoji} {col.label}</span>
                        <span className="imp-col-count">{colItems(col.key).length}</span>
                      </div>

                      <div className="imp-col-cards">
                        {colItems(col.key).map(item => {
                          const p      = PRIORITY[item.priority] || PRIORITY.medium
                          const isHov  = hoveredId === item.id
                          const isDrag = draggingId === item.id
                          return (
                            <div key={item.id}
                              className={`imp-card${isHov ? ' hovered' : ''}${isDrag ? ' dragging' : ''}`}
                              style={{ borderTop: `3px solid ${p.border}`, background: p.bg }}
                              draggable
                              onDragStart={e => onDragStart(e, item.id)}
                              onDragEnd={onDragEnd}
                              onMouseEnter={() => setHoveredId(item.id)}
                              onMouseLeave={() => setHoveredId(null)}
                            >
                              <div className="imp-card-top">
                                <span className="imp-card-title">{item.title}</span>
                                <button
                                  className={`imp-star-btn${item.is_kpi ? ' on' : ''}`}
                                  title={item.is_kpi ? 'Unpin KPI' : 'Pin as KPI'}
                                  onClick={() => patch(item.id, { is_kpi: item.is_kpi ? 0 : 1 })}
                                >{item.is_kpi ? '⭐' : '☆'}</button>
                              </div>

                              {/* Always-visible remark — editable without hovering */}
                              <div className="imp-card-remark" onMouseDown={e => e.stopPropagation()}>
                                <span className="imp-remark-icon">📝</span>
                                <textarea
                                  className="imp-remark-inline"
                                  placeholder="Add a remark…"
                                  rows={1}
                                  value={remarkDraft[item.id] ?? item.remark ?? ''}
                                  onChange={e => setRemarkDraft(d => ({ ...d, [item.id]: e.target.value }))}
                                  onBlur={() => saveRemark(item)}
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>

                              {isHov && (
                                <div className="imp-card-expand">
                                  {item.detail && <p className="imp-card-detail">{item.detail}</p>}
                                  <div className="imp-card-meta">
                                    <span style={{ color: p.color, fontWeight: 700, fontSize: 11 }}>{p.label}</span>
                                    <span className="imp-card-date">Added {fmtDate(item.created_at)}</span>
                                  </div>
                                  <div className="imp-card-actions">
                                    <button className="imp-btn-secondary" style={{ fontSize: 11 }}
                                      onClick={e => { e.stopPropagation(); openEdit(item) }}>✏️ Edit</button>
                                    <button className="imp-btn-danger" style={{ fontSize: 11, marginLeft: 'auto' }}
                                      onClick={e => { e.stopPropagation(); if (window.confirm('Delete this improvement?')) deleteItem(item.id) }}>🗑</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {addingIn === col.key ? (
                        <div className="imp-add-form">
                          <input
                            ref={addInputRef}
                            className="imp-inline-input"
                            placeholder="Title *"
                            value={newItem.title}
                            onChange={e => setNewItem(f => ({ ...f, title: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') addItem(col.key)
                              if (e.key === 'Escape') { setAddingIn(null); setNewItem({ title: '', detail: '', priority: 'medium' }) }
                            }}
                          />
                          <textarea
                            className="imp-inline-textarea"
                            placeholder="Details (optional)"
                            rows={2}
                            value={newItem.detail}
                            onChange={e => setNewItem(f => ({ ...f, detail: e.target.value }))}
                          />
                          <div className="imp-pri-row">
                            {['high', 'medium', 'low'].map(p => (
                              <button key={p}
                                className={`imp-pri-pill${newItem.priority === p ? ' on' : ''}`}
                                style={{ '--pc': PRIORITY[p].color }}
                                onClick={() => setNewItem(f => ({ ...f, priority: p }))}
                              >{p}</button>
                            ))}
                          </div>
                          <div className="imp-btn-row">
                            <button className="imp-btn-primary" onClick={() => addItem(col.key)}>Add</button>
                            <button className="imp-btn-secondary"
                              onClick={() => { setAddingIn(null); setNewItem({ title: '', detail: '', priority: 'medium' }) }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <button className="imp-add-task-btn"
                          onClick={() => { setAddingIn(col.key); setNewItem({ title: '', detail: '', priority: 'medium' }) }}>
                          + Add item
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal (above the panel) ── */}
      {editing && (
        <div className="imp-modal-overlay" onClick={() => setEditing(null)}>
          <div className="imp-modal" onClick={e => e.stopPropagation()}>
            <div className="imp-modal-header">
              <span>Edit Improvement</span>
              <button className="imp-modal-close" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="imp-modal-body">
              <div className="imp-field">
                <label>Title</label>
                <input className="imp-inline-input" value={editDraft.title}
                  onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} />
              </div>
              <div className="imp-field">
                <label>Details</label>
                <textarea className="imp-inline-textarea" rows={4} value={editDraft.detail}
                  onChange={e => setEditDraft(d => ({ ...d, detail: e.target.value }))} />
              </div>
              <div className="imp-field">
                <label>📝 Remark</label>
                <textarea className="imp-inline-textarea" rows={2} value={editDraft.remark}
                  placeholder="Add a remark…"
                  onChange={e => setEditDraft(d => ({ ...d, remark: e.target.value }))} />
              </div>
              <div className="imp-field-row">
                <div className="imp-field">
                  <label>Status</label>
                  <select className="imp-select" value={editDraft.status}
                    onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))}>
                    {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div className="imp-field">
                  <label>Priority</label>
                  <select className="imp-select" value={editDraft.priority}
                    onChange={e => setEditDraft(d => ({ ...d, priority: e.target.value }))}>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟠 Medium</option>
                    <option value="low">🔵 Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="imp-modal-footer">
              <button className="imp-btn-danger" onClick={() => { if (window.confirm('Delete this improvement?')) deleteItem(editing.id) }}>🗑 Delete</button>
              <div className="imp-btn-row">
                <button className="imp-btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button className="imp-btn-primary" onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
