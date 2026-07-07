import { useState, useEffect, useRef } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import './ToDo.css'

const COLUMNS = [
  { key: 'pending',     label: 'Pending',     color: 'var(--blue)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--peach)' },
  { key: 'done',        label: 'Done',        color: 'var(--green)' },
]
const PRIORITY_COLOR = { low: 'var(--blue)', medium: 'var(--peach)', high: 'var(--red)' }

function fmtDate(dt) {
  if (!dt) return null
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ToDo({ user }) {
  const [isUnlocked, setIsUnlocked]   = useState(false)
  const [pwInput, setPwInput]         = useState('')
  const [pwError, setPwError]         = useState(null)
  const [pwLoading, setPwLoading]     = useState(false)
  const [shake, setShake]             = useState(false)

  const [boards, setBoards]           = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const [tasks, setTasks]             = useState([])

  const [editingTask, setEditingTask] = useState(null)  // task object in modal
  const [editDraft, setEditDraft]     = useState({})

  const [newBoardName, setNewBoardName]   = useState('')
  const [addingBoard, setAddingBoard]     = useState(false)
  const [addingIn, setAddingIn]           = useState(null)  // column key
  const [newTaskTitle, setNewTaskTitle]   = useState('')
  const addInputRef = useRef(null)

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function unlock(e) {
    e.preventDefault()
    if (!pwInput) return
    setPwLoading(true)
    setPwError(null)
    try {
      const res = await fetch('/api/credentials/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwInput }),
      })
      const { ok } = await res.json()
      if (ok) {
        setIsUnlocked(true)
        loadBoards()
      } else {
        setPwError('Wrong password.')
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    } catch {
      setPwError('Could not reach server.')
    } finally {
      setPwLoading(false)
    }
  }

  // ── Boards ────────────────────────────────────────────────────────────────

  async function loadBoards() {
    const d = await fetch('/api/todo-summaries').then(r => r.json()).catch(() => [])
    setBoards(Array.isArray(d) ? d : [])
  }

  async function createBoard(e) {
    e.preventDefault()
    if (!newBoardName.trim()) return
    await fetch('/api/todo-summaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBoardName.trim() }),
    })
    setNewBoardName('')
    setAddingBoard(false)
    loadBoards()
  }

  async function deleteBoard(id) {
    if (!window.confirm('Delete this board and all its tasks?')) return
    await fetch(`/api/todo-summaries/${id}`, { method: 'DELETE' })
    setActiveBoard(null)
    loadBoards()
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  async function loadTasks(boardId) {
    const d = await fetch(`/api/todos?summaryId=${boardId}`).then(r => r.json()).catch(() => [])
    setTasks(Array.isArray(d) ? d : [])
  }

  function openBoard(board) {
    setActiveBoard(board)
    loadTasks(board.id)
  }

  async function addTask(status) {
    if (!newTaskTitle.trim()) { setAddingIn(null); return }
    const t = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary_id: activeBoard.id, title: newTaskTitle.trim(), status }),
    }).then(r => r.json())
    setTasks(ts => [...ts, t])
    setNewTaskTitle('')
    setAddingIn(null)
    loadBoards()  // refresh task counts
  }

  async function cycleStatus(task) {
    const order = ['pending', 'in_progress', 'done']
    const next  = order[(order.indexOf(task.status) + 1) % order.length]
    const updated = await fetch(`/api/todos/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    }).then(r => r.json())
    setTasks(ts => ts.map(t => t.id === task.id ? updated : t))
    loadBoards()
  }

  function openEdit(task) {
    setEditingTask(task)
    setEditDraft({
      title:       task.title,
      description: task.description || '',
      status:      task.status,
      priority:    task.priority,
      due_date:    task.due_date || '',
    })
  }

  async function saveEdit() {
    const updated = await fetch(`/api/todos/${editingTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    }).then(r => r.json())
    setTasks(ts => ts.map(t => t.id === editingTask.id ? updated : t))
    setEditingTask(null)
    loadBoards()
  }

  async function deleteTask(id) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    setTasks(ts => ts.filter(t => t.id !== id))
    setEditingTask(null)
    loadBoards()
  }

  // auto-focus add-task input
  useEffect(() => {
    if (addingIn && addInputRef.current) addInputRef.current.focus()
  }, [addingIn])

  // ── Render ────────────────────────────────────────────────────────────────

  const colTasks = key => tasks.filter(t => t.status === key)

  return (
    <Card>
      <SectionHeader icon="✅" title="To-Do" />

      {!isUnlocked ? (
        /* ── Lock screen ── */
        <div className="todo-lock">
          <div className="todo-lock-user">
            <span className="todo-lock-avatar">🔒</span>
            <p className="todo-lock-name">Welcome back, <strong>{user.firstname} {user.lastname}</strong></p>
            <p className="todo-lock-hint">Enter your to-do password to continue</p>
          </div>
          <form className={`todo-lock-form${shake ? ' shake' : ''}`} onSubmit={unlock}>
            <input
              type="password"
              className="todo-pw-input"
              placeholder="Password"
              value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              autoFocus
            />
            <button className="todo-pw-btn" type="submit" disabled={pwLoading}>
              {pwLoading ? '…' : 'Unlock →'}
            </button>
          </form>
          {pwError && <p className="todo-lock-error">⚠️ {pwError}</p>}
        </div>

      ) : !activeBoard ? (
        /* ── Board list ── */
        <div className="todo-boards">
          <div className="todo-board-grid">
            {boards.map(b => (
              <div key={b.id} className="todo-board-card" onClick={() => openBoard(b)}>
                <div className="todo-board-name">{b.name}</div>
                {b.description && <div className="todo-board-desc">{b.description}</div>}
                <div className="todo-board-counts">
                  <span className="tbc" style={{ color: 'var(--blue)' }}>⬜ {b.counts.pending}</span>
                  <span className="tbc" style={{ color: 'var(--peach)' }}>🔶 {b.counts.in_progress}</span>
                  <span className="tbc" style={{ color: 'var(--green)' }}>✅ {b.counts.done}</span>
                </div>
                <button className="todo-board-del" onClick={e => { e.stopPropagation(); deleteBoard(b.id) }} title="Delete board">✕</button>
              </div>
            ))}

            {addingBoard ? (
              <form className="todo-board-card todo-board-add-form" onSubmit={createBoard}>
                <input
                  autoFocus
                  className="todo-inline-input"
                  placeholder="Board name…"
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setAddingBoard(false)}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="btn-g on" type="submit" style={{ fontSize: 12 }}>Create</button>
                  <button className="btn-g" type="button" style={{ fontSize: 12 }} onClick={() => setAddingBoard(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <button className="todo-board-card todo-board-new" onClick={() => setAddingBoard(true)}>
                <span className="todo-board-plus">+</span>
                <span>New Board</span>
              </button>
            )}
          </div>
        </div>

      ) : (
        /* ── Kanban ── */
        <div className="todo-kanban-wrap">
          <div className="todo-kanban-topbar">
            <button className="btn-g" style={{ fontSize: 12 }} onClick={() => { setActiveBoard(null); loadBoards() }}>
              ← Back
            </button>
            <span className="todo-kanban-title">{activeBoard.name}</span>
          </div>

          <div className="todo-kanban">
            {COLUMNS.map(col => (
              <div key={col.key} className="todo-col">
                <div className="todo-col-header" style={{ '--col-color': col.color }}>
                  <span className="todo-col-label">{col.label}</span>
                  <span className="todo-col-count">{colTasks(col.key).length}</span>
                </div>

                <div className="todo-col-cards">
                  {colTasks(col.key).map(task => (
                    <div key={task.id} className="todo-task-card" onClick={() => openEdit(task)}>
                      <div className="todo-task-title">{task.title}</div>
                      <div className="todo-task-meta">
                        <span className="todo-priority" style={{ color: PRIORITY_COLOR[task.priority] }}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className="todo-due">📅 {fmtDate(task.due_date)}</span>
                        )}
                      </div>
                      <div className="todo-task-dates">
                        <span>Created {fmtDate(task.created_at)}</span>
                        {task.updated_at !== task.created_at && (
                          <span> · Updated {fmtDate(task.updated_at)}</span>
                        )}
                      </div>
                      <button
                        className="todo-status-chip"
                        style={{ '--col-color': col.color }}
                        onClick={e => { e.stopPropagation(); cycleStatus(task) }}
                        title="Click to advance status"
                      >
                        {col.label} →
                      </button>
                    </div>
                  ))}
                </div>

                {addingIn === col.key ? (
                  <div className="todo-add-form">
                    <input
                      ref={addInputRef}
                      className="todo-inline-input"
                      placeholder="Task title…"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') addTask(col.key)
                        if (e.key === 'Escape') { setAddingIn(null); setNewTaskTitle('') }
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button className="btn-g on" style={{ fontSize: 11 }} onClick={() => addTask(col.key)}>Add</button>
                      <button className="btn-g" style={{ fontSize: 11 }} onClick={() => { setAddingIn(null); setNewTaskTitle('') }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button className="todo-add-task-btn" onClick={() => { setAddingIn(col.key); setNewTaskTitle('') }}>
                    + Add task
                  </button>
                )}
              </div>
            ))}
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
              <div className="setup-field">
                <label>Title</label>
                <input className="todo-inline-input" value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} />
              </div>
              <div className="setup-field">
                <label>Description</label>
                <textarea className="todo-textarea" rows={3} value={editDraft.description} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
              </div>

              <div className="setup-row">
                <div className="setup-field">
                  <label>Status</label>
                  <select className="todo-select" value={editDraft.status} onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="setup-field">
                  <label>Priority</label>
                  <select className="todo-select" value={editDraft.priority} onChange={e => setEditDraft(d => ({ ...d, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="setup-field">
                <label>Due Date</label>
                <input type="date" className="todo-inline-input" value={editDraft.due_date} onChange={e => setEditDraft(d => ({ ...d, due_date: e.target.value }))} />
              </div>

              <div className="todo-modal-timestamps">
                <span>Created: {fmtDateTime(editingTask.created_at)}</span>
                <span>Updated: {fmtDateTime(editingTask.updated_at)}</span>
              </div>
            </div>

            <div className="todo-modal-footer">
              <button className="btn-g" style={{ color: 'var(--red)', fontSize: 12 }} onClick={() => deleteTask(editingTask.id)}>
                🗑 Delete
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
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
