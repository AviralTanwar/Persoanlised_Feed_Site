import { useState, useRef, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import './ToDo.css'

const COLUMNS = [
  { key: 'pending',     label: 'Pending',     emoji: '⬜', color: 'var(--blue)'  },
  { key: 'in_progress', label: 'In Progress', emoji: '🔶', color: 'var(--peach)' },
  { key: 'done',        label: 'Done',        emoji: '✅', color: 'var(--green)' },
]
const PRIORITY = {
  high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.13)',   border: '#ef4444', label: '🔴 High'   },
  medium: { color: '#f97316', bg: 'rgba(249,115,22,0.13)',  border: '#f97316', label: '🟠 Medium' },
  low:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.13)',  border: '#3b82f6', label: '🔵 Low'    },
}
const STATUS_NEXT = { pending: 'in_progress', in_progress: 'done', done: 'pending' }

const LS = {
  sortBy:   () => localStorage.getItem('todo_sort_by')  || 'created_at',
  sortDir:  () => localStorage.getItem('todo_sort_dir') || 'desc',
  sidebarW: () => parseInt(localStorage.getItem('todo_sidebar_w') || '230', 10),
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ToDo() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pwInput, setPwInput]       = useState('')
  const [pwShow, setPwShow]         = useState(false)
  const [pwError, setPwError]       = useState(null)
  const [pwLoading, setPwLoading]   = useState(false)
  const [shake, setShake]           = useState(false)
  const [user, setUser]             = useState(null)

  // ── Layout ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(LS.sidebarW)

  // ── Boards ────────────────────────────────────────────────────────────────
  const [boards, setBoards]           = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  // sortBy/sortDir persisted in localStorage (#5)
  const [sortBy, setSortByRaw]   = useState(LS.sortBy)
  const [sortDir, setSortDirRaw] = useState(LS.sortDir)
  const [addingBoard, setAddingBoard] = useState(false)
  const [newBoard, setNewBoard]       = useState({ name: '', description: '' })

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const [tasks, setTasks]             = useState([])
  const [editingTask, setEditingTask] = useState(null)
  const [editDraft, setEditDraft]     = useState({})
  const [addingIn, setAddingIn]       = useState(null)
  const [newTask, setNewTask]         = useState({ title: '', description: '' })
  const [hoveredTask, setHoveredTask] = useState(null)
  const [draggingTask, setDraggingTask] = useState(null)
  const [remarkDraft, setRemarkDraft] = useState({})
  const [dragOverCol, setDragOverCol] = useState(null)

  const addInputRef = useRef(null)

  // ── Helpers: persist filter ───────────────────────────────────────────────
  function setSortBy(v)  { setSortByRaw(v);  localStorage.setItem('todo_sort_by', v) }
  function setSortDir(v) { setSortDirRaw(v); localStorage.setItem('todo_sort_dir', v) }

  // ── Sidebar resize (drag handle, limited 160–360 px) ─────────────────────
  function onResizeStart(e) {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidth
    function onMove(ev) {
      const w = Math.min(360, Math.max(160, startW + ev.clientX - startX))
      setSidebarWidth(w)
      localStorage.setItem('todo_sidebar_w', String(w))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function unlock(e) {
    e.preventDefault()
    if (!pwInput) return
    setPwLoading(true); setPwError(null)
    try {
      const { ok } = await fetch('/api/credentials/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwInput }),
      }).then(r => r.json())
      if (ok) {
        setIsUnlocked(true)
        loadBoards()
        fetch('/api/user-info').then(r => r.ok ? r.json() : null).then(u => u && setUser(u)).catch(() => {})
      } else {
        setPwError('Wrong password.')
        setShake(true); setTimeout(() => setShake(false), 500); setPwInput('')
      }
    } catch { setPwError('Could not reach server.') }
    finally { setPwLoading(false) }
  }

  // ── Boards ────────────────────────────────────────────────────────────────
  async function loadBoards() {
    const d = await fetch('/api/todo-summaries').then(r => r.json()).catch(() => [])
    setBoards(Array.isArray(d) ? d : [])
  }

  async function createBoard(e) {
    e.preventDefault()
    if (!newBoard.name.trim()) return
    const b = await fetch('/api/todo-summaries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBoard.name.trim(), description: newBoard.description.trim() }),
    }).then(r => r.json())
    setNewBoard({ name: '', description: '' }); setAddingBoard(false)
    await loadBoards()
    setActiveBoard(b); loadTasks(b.id)
  }

  async function deleteBoard(id) {
    if (!window.confirm('Soft-delete this board?')) return
    await fetch(`/api/todo-summaries/${id}`, { method: 'DELETE' })
    if (activeBoard?.id === id) setActiveBoard(null)
    loadBoards()
  }

  const sortedBoards = [...boards].sort((a, b) => {
    const va = sortBy === 'name' ? a.name.toLowerCase() : new Date(a[sortBy] || 0)
    const vb = sortBy === 'name' ? b.name.toLowerCase() : new Date(b[sortBy] || 0)
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
  })

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async function loadTasks(boardId) {
    const d = await fetch(`/api/todos?summaryId=${boardId}`).then(r => r.json()).catch(() => [])
    setTasks(Array.isArray(d) ? d : [])
  }

  function selectBoard(b) { setActiveBoard(b); loadTasks(b.id); setHoveredTask(null) }

  async function addTask(status) {
    if (!newTask.title.trim()) { setAddingIn(null); return }
    const t = await fetch('/api/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary_id: activeBoard.id, title: newTask.title.trim(), description: newTask.description.trim(), status }),
    }).then(r => r.json())
    setTasks(ts => [...ts, t])
    setNewTask({ title: '', description: '' }); setAddingIn(null); loadBoards()
  }

  async function patchTask(id, fields) {
    const updated = await fetch(`/api/todos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }).then(r => r.json())
    setTasks(ts => ts.map(t => t.id === id ? updated : t))
    return updated
  }

  async function deleteTask(id) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    setTasks(ts => ts.filter(t => t.id !== id))
    setEditingTask(null); loadBoards()
  }

  // ── Remark auto-save ──────────────────────────────────────────────────────
  function handleCardLeave(task) {
    setHoveredTask(null)
    const draft = remarkDraft[task.id]
    if (draft !== undefined && draft !== (task.remark || '')) {
      patchTask(task.id, { remark: draft })
      setRemarkDraft(d => { const n = { ...d }; delete n[task.id]; return n })
    }
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  function onDragStart(e, task) {
    e.dataTransfer.setData('taskId', String(task.id))
    e.dataTransfer.effectAllowed = 'move'
    setHoveredTask(null)
    // setTimeout: browser captures ghost FIRST at full opacity, THEN source card dims
    setTimeout(() => setDraggingTask(task.id), 0)
  }

  function onDragEnd() { setDraggingTask(null) }

  function onDragEnter(e, colKey) { e.preventDefault(); setDragOverCol(colKey) }
  function onDragOver(e)          { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  function onDragLeave(e)         { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null) }

  async function onDrop(e, newStatus) {
    e.preventDefault(); setDragOverCol(null)
    const taskId = Number(e.dataTransfer.getData('taskId'))
    const task   = tasks.find(t => t.id === taskId)
    if (task && task.status !== newStatus) { await patchTask(taskId, { status: newStatus }); loadBoards() }
  }

  // ── Edit modal ────────────────────────────────────────────────────────────
  function openEdit(task) {
    setEditingTask(task)
    setEditDraft({ title: task.title, description: task.description||'', status: task.status, priority: task.priority, due_date: task.due_date||'' })
  }
  async function saveEdit() { await patchTask(editingTask.id, editDraft); setEditingTask(null); loadBoards() }

  useEffect(() => { if (addingIn && addInputRef.current) addInputRef.current.focus() }, [addingIn])

  const colTasks = key => tasks.filter(t => t.status === key)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Card className={`todo-card${isUnlocked ? ' todo-card--open' : ''}`}>
      <div className="todo-header-bar">
        <SectionHeader icon="✅" title="To-Do" />
        {isUnlocked && (
          <button className="todo-toggle-btn" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? '◀ Hide' : '▶ Boards'}
          </button>
        )}
      </div>

      {!isUnlocked ? (
        <div className="todo-lock">
          <span className="todo-lock-icon">🔒</span>
          <p className="todo-lock-hint">Enter your to-do password to continue</p>
          <form className={`todo-lock-form${shake ? ' shake' : ''}`} onSubmit={unlock}>
            <div className="todo-pw-wrap">
              <input type={pwShow ? 'text' : 'password'} className="todo-pw-input"
                placeholder="Password" value={pwInput}
                onChange={e => setPwInput(e.target.value)} autoFocus />
              <button type="button" className="todo-pw-eye" onClick={() => setPwShow(v => !v)} tabIndex={-1}>
                {pwShow ? '🙈' : '👁️'}
              </button>
            </div>
            <button className="todo-pw-btn" type="submit" disabled={pwLoading}>
              {pwLoading ? '…' : 'Unlock →'}
            </button>
          </form>
          {pwError && <p className="todo-lock-error">⚠️ {pwError}</p>}
        </div>

      ) : (
        <div className="todo-layout">

          {/* ── Sidebar ── */}
          <aside
            className={`todo-sidebar${sidebarOpen ? '' : ' collapsed'}`}
            style={sidebarOpen ? { width: sidebarWidth, minWidth: sidebarWidth } : {}}
          >
            <div className="todo-sidebar-inner">
              <div className="todo-sort-bar">
                <select className="todo-sort-select" value={sortBy}
                  onChange={e => setSortBy(e.target.value)}>
                  <option value="name">Name</option>
                  <option value="created_at">Created</option>
                  <option value="updated_at">Updated</option>
                </select>
                <button className="todo-sort-dir"
                  onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
                  {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>

              <div className="todo-board-list">
                {sortedBoards.map(b => (
                  <div key={b.id} className={`todo-sidebar-board${activeBoard?.id === b.id ? ' active' : ''}`}
                    onClick={() => selectBoard(b)}>
                    <div className="todo-sb-name">{b.name}</div>
                    {b.description && <div className="todo-sb-desc">{b.description}</div>}
                    <div className="todo-sb-counts">
                      <span>⬜ {b.counts?.pending ?? 0}</span>
                      <span>🔶 {b.counts?.in_progress ?? 0}</span>
                      <span>✅ {b.counts?.done ?? 0}</span>
                    </div>
                    <div className="todo-sb-dates">
                      {fmtDate(b.created_at)} · {fmtDate(b.updated_at)}
                    </div>
                    <button className="todo-sb-del" title="Delete"
                      onClick={e => { e.stopPropagation(); deleteBoard(b.id) }}>✕</button>
                  </div>
                ))}

                {addingBoard ? (
                  <form className="todo-sidebar-board todo-add-board-form" onSubmit={createBoard}>
                    <input autoFocus className="todo-inline-input" placeholder="Board name *"
                      value={newBoard.name} onChange={e => setNewBoard(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Escape' && setAddingBoard(false)} />
                    <textarea className="todo-inline-textarea" placeholder="Description (optional)" rows={2}
                      value={newBoard.description} onChange={e => setNewBoard(f => ({ ...f, description: e.target.value }))} />
                    <div className="todo-btn-row">
                      <button className="todo-btn-primary" type="submit">Create</button>
                      <button className="todo-btn-secondary" type="button"
                        onClick={() => { setAddingBoard(false); setNewBoard({ name: '', description: '' }) }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="todo-new-board-btn" onClick={() => setAddingBoard(true)}>+ New Board</button>
                )}
              </div>
            </div>
          </aside>

          {/* Resize handle — drag to resize sidebar */}
          {sidebarOpen && (
            <div className="todo-resize-handle" onMouseDown={onResizeStart} />
          )}

          {/* ── Main ── */}
          <div className="todo-main">
            {!activeBoard ? (
              <div className="todo-greeting">
                <div className="todo-greeting-content">
                  <span className="todo-greeting-wave">👋</span>
                  <h2 className="todo-greeting-name">
                    Hey, {user ? `${user.firstname} ${user.lastname}` : 'there'}!
                  </h2>
                  {user?.title && <p className="todo-greeting-title">{user.title}</p>}
                  <p className="todo-greeting-sub">Select a board on the left to view its Kanban, or create a new one.</p>
                </div>
              </div>
            ) : (
              <div className="todo-kanban-wrap">
                <div className="todo-kanban-topbar">
                  <span className="todo-kanban-title">{activeBoard.name}</span>
                  <button className="todo-close-btn" onClick={() => setActiveBoard(null)}>✕ Close</button>
                </div>

                <div className="todo-kanban">
                  {COLUMNS.map(col => (
                    <div key={col.key}
                      className={`todo-col${dragOverCol === col.key ? ' drag-over' : ''}`}
                      onDragEnter={e => onDragEnter(e, col.key)}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={e => onDrop(e, col.key)}
                    >
                      <div className="todo-col-header" style={{ borderBottomColor: col.color }}>
                        <span style={{ color: col.color }}>{col.emoji} {col.label}</span>
                        <span className="todo-col-count">{colTasks(col.key).length}</span>
                      </div>

                      <div className="todo-col-cards">
                        {colTasks(col.key).map(task => {
                          const p        = PRIORITY[task.priority] || PRIORITY.medium
                          const isHov    = hoveredTask === task.id
                          const isDragging = draggingTask === task.id
                          return (
                            <div key={task.id}
                              className={`todo-task-card${isHov ? ' hovered' : ''}${isDragging ? ' dragging' : ''}`}
                              style={{ borderTop: `4px solid ${p.border}`, background: p.bg }}
                              draggable
                              onDragStart={e => onDragStart(e, task)}
                              onDragEnd={onDragEnd}
                              onMouseEnter={() => setHoveredTask(task.id)}
                              onMouseLeave={() => handleCardLeave(task)}
                            >
                              {/* Always-visible compact row */}
                              <div className="todo-task-top">
                                <span className="todo-task-title">{task.title}</span>
                                <span className="todo-priority-badge" style={{ color: p.color, borderColor: p.border }}>
                                  {p.label}
                                </span>
                              </div>

                              {/* Expanded on hover */}
                              {isHov && (
                                <div className="todo-task-expand" onMouseDown={e => e.stopPropagation()}>
                                  {task.description && <p className="todo-task-desc">{task.description}</p>}
                                  <div className="todo-task-meta">
                                    <span>{col.emoji} {col.label}</span>
                                    {task.due_date && <span className="todo-due">📅 {fmtDate(task.due_date)}</span>}
                                  </div>
                                  <div className="todo-task-dates">
                                    Created {fmtDate(task.created_at)} · Modified {fmtDate(task.updated_at)}
                                  </div>
                                  {(task.remark || remarkDraft[task.id] !== undefined) && (
                                    <div className="todo-remark-section">
                                      <label className="todo-remark-label">📝 Remark</label>
                                      <textarea className="todo-remark-input" placeholder="Add a remark…" rows={2}
                                        value={remarkDraft[task.id] ?? task.remark ?? ''}
                                        onChange={e => setRemarkDraft(d => ({ ...d, [task.id]: e.target.value }))}
                                        onClick={e => e.stopPropagation()} />
                                    </div>
                                  )}
                                  <div className="todo-task-actions">
                                    <button className="todo-btn-secondary" style={{ fontSize: 11 }}
                                      onClick={e => { e.stopPropagation(); setRemarkDraft(d => ({ ...d, [task.id]: task.remark || '' })) }}>
                                      📝 Remark
                                    </button>
                                    <button className="todo-btn-secondary" style={{ fontSize: 11 }}
                                      onClick={e => { e.stopPropagation(); openEdit(task) }}>✏️ Edit</button>
                                    <button className="todo-btn-secondary" style={{ fontSize: 11 }}
                                      onClick={e => { e.stopPropagation(); patchTask(task.id, { status: STATUS_NEXT[task.status] }).then(() => loadBoards()) }}>
                                      → {COLUMNS.find(c => c.key === STATUS_NEXT[task.status])?.label}
                                    </button>
                                    <button className="todo-btn-danger" style={{ fontSize: 11, marginLeft: 'auto' }}
                                      onClick={e => { e.stopPropagation(); if (window.confirm('Delete this task?')) deleteTask(task.id) }}>
                                      🗑
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {addingIn === col.key ? (
                        <div className="todo-add-form">
                          <input ref={addInputRef} className="todo-inline-input" placeholder="Task title *"
                            value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Escape') { setAddingIn(null); setNewTask({ title: '', description: '' }) } }} />
                          <textarea className="todo-inline-textarea" placeholder="Description (optional)" rows={2}
                            value={newTask.description} onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))} />
                          <div className="todo-btn-row">
                            <button className="todo-btn-primary" style={{ fontSize: 11 }} onClick={() => addTask(col.key)}>Add</button>
                            <button className="todo-btn-secondary" style={{ fontSize: 11 }}
                              onClick={() => { setAddingIn(null); setNewTask({ title: '', description: '' }) }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <button className="todo-add-task-btn"
                          onClick={() => { setAddingIn(col.key); setNewTask({ title: '', description: '' }) }}>
                          + Add task
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingTask && (
        <div className="todo-modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="todo-modal" onClick={e => e.stopPropagation()}>
            <div className="todo-modal-header">
              <span>Edit Task</span>
              <button className="todo-modal-close" onClick={() => setEditingTask(null)}>✕</button>
            </div>
            <div className="todo-modal-body">
              <div className="todo-field"><label>Title</label>
                <input className="todo-inline-input" value={editDraft.title}
                  onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} />
              </div>
              <div className="todo-field"><label>Description</label>
                <textarea className="todo-inline-textarea" rows={4} value={editDraft.description}
                  onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
              </div>
              <div className="todo-field-row">
                <div className="todo-field"><label>Status</label>
                  <select className="todo-select" value={editDraft.status}
                    onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))}>
                    {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div className="todo-field"><label>Priority</label>
                  <select className="todo-select" value={editDraft.priority}
                    onChange={e => setEditDraft(d => ({ ...d, priority: e.target.value }))}>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟠 Medium</option>
                    <option value="low">🔵 Low</option>
                  </select>
                </div>
              </div>
              <div className="todo-field"><label>Due Date</label>
                <input type="date" className="todo-inline-input" value={editDraft.due_date}
                  onChange={e => setEditDraft(d => ({ ...d, due_date: e.target.value }))} />
              </div>
              <div className="todo-timestamps">
                <span>Created: {fmtDate(editingTask.created_at)}</span>
                <span>Last modified: {fmtDate(editingTask.updated_at)}</span>
              </div>
            </div>
            <div className="todo-modal-footer">
              <button className="todo-btn-danger" onClick={() => deleteTask(editingTask.id)}>🗑 Delete</button>
              <div className="todo-btn-row">
                <button className="todo-btn-secondary" onClick={() => setEditingTask(null)}>Cancel</button>
                <button className="todo-btn-primary" onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
