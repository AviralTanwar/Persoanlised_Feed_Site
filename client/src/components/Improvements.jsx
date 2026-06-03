import { useEffect, useState } from 'react'

const PRIORITY_COLOR = { high: '#f38ba8', medium: '#fab387', low: '#a6e3a1' }
const STATUS_LABELS = { pending: '⏳ Pending', in_progress: '🔄 In Progress', done: '✅ Done' }

export default function Improvements() {
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState('medium')

  const load = () => {
    fetch('http://localhost:3001/api/improvements')
      .then(r => r.json())
      .then(setItems)
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const add = () => {
    if (!title.trim() || !content.trim()) return
    fetch('http://localhost:3001/api/improvements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), priority }),
    }).then(() => { setTitle(''); setContent(''); load() })
  }

  const updateStatus = (id, status) => {
    fetch(`http://localhost:3001/api/improvements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(load)
  }

  const remove = (id) => {
    fetch(`http://localhost:3001/api/improvements/${id}`, { method: 'DELETE' }).then(load)
  }

  return (
    <section className="widget">
      <h3>💡 Improvements</h3>

      <div className="improve-form">
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title…" />
        <textarea
          className="textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') add() }}
          placeholder="What do you want to improve? (Ctrl+Enter to save)"
          rows={3}
        />
        <div className="improve-form-row">
          <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          <button className="btn-primary" onClick={add}>➕ Add</button>
        </div>
      </div>

      <div className="improve-list">
        {items.length === 0 && <p className="muted">No improvements tracked yet.</p>}
        {items.map(item => (
          <div key={item.id} className="improve-item" style={{ borderLeftColor: PRIORITY_COLOR[item.priority] }}>
            <div className="improve-header">
              <strong>{item.title}</strong>
              <button className="btn-icon small" onClick={() => remove(item.id)}>🗑️</button>
            </div>
            <p>{item.content}</p>
            <div className="improve-footer">
              <select
                className="select small"
                value={item.status}
                onChange={e => updateStatus(item.id, e.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span className="muted">{item.created_at?.slice(0, 10)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
