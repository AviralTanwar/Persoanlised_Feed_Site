import { useState, useRef, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import './ToDo.css'

const COLUMNS = [
  { key: 'pending',     label: 'Pending',     emoji: '⬜', color: 'var(--blue)'  },
  { key: 'in_progress', label: 'In Progress', emoji: '🔶', color: 'var(--peach)' },
  { key: 'done',        label: 'Done',        emoji: '✅', color: 'var(--green)' },
]
const PRIORITY_COLOR = { low: 'var(--blue)', medium: 'var(--peach)', high: 'var(--red)' }
const STATUS_NEXT    = { pending: 'in_progress', in_progress: 'done', done: 'pending' }

const GREETINGS = [
  { emoji: '🚀', text: 'Pick a board to launch into your tasks.' },
  { emoji: '🎯', text: 'Select a board from the left to focus.' },
  { emoji: '✨', text: 'Your next win is one board away.' },
  { emoji: '💡', text: 'Ideas become tasks. Tasks become done.' },
]

function fmtDate(dt) {
  if (!dt) return null
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

  // ── Boards ────────────────────────────────────────────────────────────────
  const [boards, setBoards]             = useState([])
  const [activeBoard, setActiveBoard]   = useState(null)
  const [sortBy, setSortBy]             = useState('created_at')
  const [sortDir, setSortDir]           = useState('desc')
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [addingBoard, setAddingBoard]   = useState(false)
  const [newBoard, setNewBoard]         = useState({ name: '', description: '' })

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const [tasks, setTasks]           = useState([])
  const [editingTask, setEditingTask] = useState(null)
  const [editDraft, setEditDraft]   = useState({})
  const [addingIn, setAddingIn]     = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [hoveredTask, setHoveredTask]   = useState(null)
  const [remarkDraft, setRemarkDraft]   = useState({})
  const [dragOverCol, setDragOverCol]   = useState(null)

  const addInputRef   = useRef(null)
  const greeting      = useRef(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]).current

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
      if (ok) { setIsUnlocked(true); loadBoards() }
      else {
        setPwError('Wrong password.')
        setShake(true); setTimeout(() => setShake(false), 500)
        setPwInput('')
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
    if (!window.confirm('Delete this board and all its tasks?')) return
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
    if (!newTaskTitle.trim()) { setAddingIn(null); return }
    const t = await fetch('/api/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary_id: activeBoard.id, title: newTaskTitle.trim(), status }),
    }).then(r => r.json())
    setTasks(ts => [...ts, t]); setNewTaskTitle(''); setAddingIn(null); loadBoards()
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

  // ── Remark auto-save on mouse leave ───────────────────────────────────────
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
  }

  function onDragOver(e, colKey) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(colKey)
  }

  async function onDrop(e, newStatus) {
    e.preventDefault()
    setDragOverCol(null)
    const taskId = Number(e.dataTransfer.getData('taskId'))
    const task   = tasks.find(t => t.id === taskId)
    if (task && task.status !== newStatus) {
      await patchTask(taskId, { status: newStatus })
      loadBoards()
    }
  }

  // ── Edit modal ────────────────────────────────────────────────────────────
  function openEdit(task) {
    setEditingTask(task)
    setEditDraft({ title: task.title, description: task.description||'', status: task.status, priority: task.priority, due_date: task.due_date||'' })
  }

  async function saveEdit() {
    await patchTask(editingTask.id, editDraft)
    setEditingTask(null); loadBoards()
  }

  useEffect(() => { if (addingIn && addInputRef.current) addInputRef.current.focus() }, [addingIn])

  const colTasks = key => tasks.filter(t => t.status === key)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Card className="todo-card">
      <div className="todo-header">
        <SectionHeader icon="✅" title="To-Do" />
        {isUnlocked && (
          <button className="btn-g todo-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
            {sidebarOpen ? '◀ Hide' : '▶ Boards'}
          </button>
        )}
      </div>

      {!isUnlocked ? (
        /* ── Lock ── */
        <div className="todo-lock">
          <span className="todo-lock-icon">🔒</span>
          <p className="todo-lock-hint">Enter your to-do password</p>
          <form className={`todo-lock-form${shake ? ' shake' : ''}`} onSubmit={unlock}>
            <div className="todo-pw-wrap">
              <input
                type={pwShow ? 'text' : 'password'}
                className="todo-pw-input"
                placeholder="Password"
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                autoFocus
              />
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
        /* ── Main layout ── */
        <div className="todo-layout">

          {/* Sidebar */}
          <aside className={`todo-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
            <div className="todo-sidebar-inner">
              {/* Sort controls */}
              <div className="todo-sort-bar">
                <select className="todo-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="name">Name</option>
                  <option value="created_at">Created</option>
                  <option value="updated_at">Updated</option>
                </select>
                <button className="todo-sort-dir btn-g" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                  {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>

              {/* Board list */}
              <div className="todo-board-list">
                {sortedBoards.map(b => (
                  <div
                    key={b.id}
                    className={`todo-sidebar-board${activeBoard?.id === b.id ? ' active' : ''}`}
                    onClick={() => selectBoard(b)}
                  >
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
                    <button className="todo-sb-del" onClick={e => { e.stopPropagation(); deleteBoard(b.id) }} title="Delete">✕</button>
                  </div>
                ))}

                {addingBoard ? (
                  <form className="todo-sidebar-board todo-add-board-form" onSubmit={createBoard}>
                    <input
                      autoFocus
                      className="todo-inline-input"
                      placeholder="Board name *"
                      value={newBoard.name}
                      onChange={e => setNewBoard(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Escape' && setAddingBoard(false)}
                    />
                    <input
                      className="todo-inline-input"
                      placeholder="Description (optional)"
                      value={newBoard.description}
                      onChange={e => setNewBoard(f => ({ ...f, description: e.target.value }))}
                      style={{ marginTop: 5 }}
                    />
                    <div className="todo-btn-row" style={{ marginTop: 6 }}>
                      <button className="btn-g on" type="submit" style={{ fontSize: 11 }}>Create</button>
                      <button className="btn-g" type="button" style={{ fontSize: 11 }} onClick={() => { setAddingBoard(false); setNewBoard({ name: '', description: '' }) }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="todo-new-board-btn" onClick={() => setAddingBoard(true)}>+ New Board</button>
                )}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="todo-main">
            {!activeBoard ? (
              /* ── No board selected: creative greeting ── */
              <div className="todo-greeting">
                <span className="todo-greeting-emoji">{greeting.emoji}</span>
                <p className="todo-greeting-text">{greeting.text}</p>
                <p className="todo-greeting-sub">Create a board on the left to get started.</p>
              </div>
            ) : (
              /* ── Kanban ── */
              <div className="todo-kanban-inner">
                <div className="todo-kanban-title">{activeBoard.name}</div>
                <div className="todo-kanban">
                  {COLUMNS.map(col => (
                    <div
                      key={col.key}
                      className={`todo-col${dragOverCol === col.key ? ' drag-over' : ''}`}
                      onDragOver={e => onDragOver(e, col.key)}
                      onDragLeave={() => setDragOverCol(null)}
                      onDrop={e => onDrop(e, col.key)}
                    >
                      {/* Column header */}
                      <div className="todo-col-header" style={{ borderBottomColor: col.color }}>
                        <span style={{ color: col.color }}>{col.emoji} {col.label}</span>
                        <span className="todo-col-count">{colTasks(col.key).length}</span>
                      </div>

                      {/* Cards */}
                      <div className="todo-col-cards">
                        {colTasks(col.key).map(task => {
                          const isHovered = hoveredTask === task.id
                          return (
                            <div
                              key={task.id}
                              className={`todo-task-card${isHovered ? ' hovered' : ''}`}
                              draggable
                              onDragStart={e => onDragStart(e, task)}
                              onMouseEnter={() => setHoveredTask(task.id)}
                              onMouseLeave={() => handleCardLeave(task)}
                            >
                              {/* Compact view always visible */}
                              <div className="todo-task-top">
                                <span className="todo-task-status-emoji">{col.emoji}</span>
                                <span className="todo-task-title">{task.title}</span>
                              </div>

                              {/* Expanded on hover */}
                              {isHovered && (
                                <div className="todo-task-expand" onMouseDown={e => e.stopPropagation()}>
                                  {task.description && <p className="todo-task-desc">{task.description}</p>}
                                  <div className="todo-task-meta">
                                    <span className="todo-priority-tag" style={{ color: PRIORITY_COLOR[task.priority] }}>{task.priority}</span>
                                    {task.due_date && <span className="todo-due">📅 {fmtDate(task.due_date)}</span>}
                                  </div>
                                  <div className="todo-task-dates">
                                    Created {fmtDate(task.created_at)}
                                    {task.updated_at !== task.created_at && <> · Updated {fmtDate(task.updated_at)}</>}
                                  </div>
                                  <div className="todo-remark-section">
                                    <label className="todo-remark-label">📝 Remark</label>
                                    <textarea
                                      className="todo-remark-input"
                                      placeholder="Add a remark…"
                                      rows={2}
                                      value={remarkDraft[task.id] ?? task.remark ?? ''}
                                      onChange={e => setRemarkDraft(d => ({ ...d, [task.id]: e.target.value }))}
                                      onClick={e => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="todo-task-actions">
                                    <button className="btn-g" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); openEdit(task) }}>✏️ Edit</button>
                                    <button className="btn-g" style={{ fontSize: 11, color: 'var(--peach)' }}
                                      onClick={e => { e.stopPropagation(); patchTask(task.id, { status: STATUS_NEXT[task.status] }).then(() => loadBoards()) }}>
                                      → {COLUMNS.find(c => c.key === STATUS_NEXT[task.status])?.label}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Add task */}
                      {addingIn === col.key ? (
                        <div className="todo-add-form">
                          <input
                            ref={addInputRef}
                            className="todo-inline-input"
                            placeholder="Task title…"
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addTask(col.key); if (e.key === 'Escape') { setAddingIn(null); setNewTaskTitle('') } }}
                          />
                          <div className="todo-btn-row">
                            <button className="btn-g on" style={{ fontSize: 11 }} onClick={() => addTask(col.key)}>Add</button>
                            <button className="btn-g" style={{ fontSize: 11 }} onClick={() => { setAddingIn(null); setNewTaskTitle('') }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <button className="todo-add-task-btn" onClick={() => { setAddingIn(col.key); setNewTaskTitle('') }}>+ Add task</button>
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
              <button className="btn-i" onClick={() => setEditingTask(null)}>✕</button>
            </div>
            <div className="todo-modal-body">
              <div className="todo-field"><label>Title</label>
                <input className="todo-inline-input" value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} />
              </div>
              <div className="todo-field"><label>Description</label>
                <textarea className="todo-textarea" rows={3} value={editDraft.description} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
              </div>
              <div className="todo-field-row">
                <div className="todo-field"><label>Status</label>
                  <select className="todo-select" value={editDraft.status} onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))}>
                    {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div className="todo-field"><label>Priority</label>
                  <select className="todo-select" value={editDraft.priority} onChange={e => setEditDraft(d => ({ ...d, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="todo-field"><label>Due Date</label>
                <input type="date" className="todo-inline-input" value={editDraft.due_date} onChange={e => setEditDraft(d => ({ ...d, due_date: e.target.value }))} />
              </div>
              <div className="todo-timestamps">
                <span>Created: {fmtDate(editingTask.created_at)}</span>
                <span>Updated: {fmtDate(editingTask.updated_at)}</span>
              </div>
            </div>
            <div className="todo-modal-footer">
              <button className="btn-g" style={{ color: 'var(--red)', fontSize: 12 }} onClick={() => deleteTask(editingTask.id)}>🗑 Delete</button>
              <div className="todo-btn-row">
                <button className="btn-g" style={{ fontSize: 12 }} onClick={() => setEditingTask(null)}>Cancel</button>
                <button className="btn-g on" style={{ fontSize: 12 }} onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
