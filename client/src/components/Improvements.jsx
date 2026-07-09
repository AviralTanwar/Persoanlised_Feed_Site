import { useState, useEffect } from 'react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import './Improvements.css'

const PRI_COLOR = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' }
const STATUS_LABEL = { pending: '⏳ Pending', in_progress: '🔄 In Progress', done: '✅ Done' }

export default function Improvements({ viewKpi = {} }) {
  const viewTitle = viewKpi.name || 'Improvements Tracker'
  const [items, setItems]     = useState([])
  const [filters, setFilters] = useState(['pending', 'in_progress'])
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({ title: '', detail: '', priority: 'medium' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/improvements')
      .then(r => r.json())
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  async function saveItem() {
    if (!form.title.trim()) return
    const res = await fetch('/api/improvements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const created = await res.json()
    setItems(prev => [created, ...prev])
    setForm({ title: '', detail: '', priority: 'medium' })
    setAdding(false)
  }

  async function updateStatus(id, status) {
    const res = await fetch(`/api/improvements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const updated = await res.json()
    setItems(prev => prev.map(x => x.id === id ? updated : x))
  }

  async function deleteItem(id) {
    await fetch(`/api/improvements/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(x => x.id !== id))
  }

  function toggleFilter(s) {
    setFilters(f => f.includes(s) ? f.filter(x => x !== s) : [...f, s])
  }

  const shown = items.filter(x => filters.includes(x.status))

  return (
    <Card>
      <SectionHeader
        icon="💡"
        title={viewTitle}
        right={
          <button className="btn-p" style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => setAdding(v => !v)}>
            {adding ? '✕ Close' : '+ Add'}
          </button>
        }
      />

      {adding && (
        <div className="imp-form">
          <input
            className="fld"
            placeholder="Title…"
            value={form.title}
            autoFocus
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && saveItem()}
          />
          <textarea
            className="fld"
            rows={2}
            placeholder="Details (optional)"
            value={form.detail}
            onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
          />
          <div className="imp-form-foot">
            <div className="imp-pri-pills">
              {['high', 'medium', 'low'].map(p => (
                <button
                  key={p}
                  className={`imp-pri-pill${form.priority === p ? ' on' : ''}`}
                  style={{ '--pc': PRI_COLOR[p] }}
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                >
                  {p}
                </button>
              ))}
            </div>
            <button className="btn-p" onClick={saveItem}>Save</button>
          </div>
        </div>
      )}

      <div className="imp-filters">
        {['pending', 'in_progress', 'done'].map(s => (
          <button
            key={s}
            className={`btn-g${filters.includes(s) ? ' on' : ''}`}
            style={{ fontSize: 11, padding: '3px 10px' }}
            onClick={() => toggleFilter(s)}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        <span className="imp-count">{shown.length} item{shown.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && <p className="empty-msg">Loading…</p>}
      {!loading && shown.length === 0 && (
        <p className="empty-msg">No items match the current filter.</p>
      )}

      <div className="imp-list">
        {shown.map(item => (
          <div key={item.id} className="imp-item">
            <div className="imp-bar" style={{ background: PRI_COLOR[item.priority] }} />
            <div className="imp-body">
              <div className="imp-title">{item.title}</div>
              {item.detail && <div className="imp-detail">{item.detail}</div>}
              <div className="imp-date">Added {item.created_at?.slice(0, 10)}</div>
            </div>
            <div className="imp-ctrl">
              <select
                className="fld imp-select"
                value={item.status}
                onChange={e => updateStatus(item.id, e.target.value)}
              >
                {Object.entries(STATUS_LABEL).map(([v, lbl]) => (
                  <option key={v} value={v}>{lbl}</option>
                ))}
              </select>
              <button className="btn-i danger" title="Delete" onClick={() => deleteItem(item.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
